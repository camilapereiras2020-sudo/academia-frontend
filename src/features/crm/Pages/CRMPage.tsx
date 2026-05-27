import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { useState } from "react"

const ETAPAS = [
  { value: "nueva_consulta", label: "Nueva consulta", color: "bg-blue-100 text-blue-800" },
  { value: "pendiente_llamar", label: "Pendiente de llamar", color: "bg-yellow-100 text-yellow-800" },
  { value: "en_conversacion", label: "En conversación", color: "bg-purple-100 text-purple-800" },
  { value: "clase_prueba", label: "Clase de prueba", color: "bg-orange-100 text-orange-800" },
  { value: "matriculado", label: "Matriculado", color: "bg-green-100 text-green-800" },
  { value: "frio", label: "Frío", color: "bg-slate-100 text-slate-500" },
  { value: "archivado", label: "Archivado", color: "bg-red-100 text-red-400" },
]

const OBJETIVOS = [
  { value: "cambridge", label: "Cambridge" },
  { value: "ib", label: "IB" },
  { value: "general", label: "General" },
  { value: "conversacion", label: "Conversación" },
  { value: "otro", label: "Otro" },
]

const ORIGENES = [
  { value: "telefono", label: "Teléfono" },
  { value: "boca_a_boca", label: "Boca a boca" },
  { value: "en_persona", label: "En persona" },
  { value: "test_nivel", label: "Test de nivel" },
  { value: "instagram", label: "Instagram" },
  { value: "email", label: "Email" },
  { value: "otro", label: "Otro" },
]

function etapaStyle(etapa: string) {
  return ETAPAS.find(e => e.value === etapa)?.color || "bg-slate-100 text-slate-600"
}

function etapaLabel(etapa: string) {
  return ETAPAS.find(e => e.value === etapa)?.label || etapa
}

type Lead = {
  id: number
  nombre_contacto: string
  nombre_alumno: string
  edad_alumno?: number
  curso_escolar?: string
  telefono: string
  email?: string
  objetivo: string
  objetivo_display: string
  nivel_estimado?: string
  disponibilidad?: string
  colegio?: string
  necesidades_especiales?: string
  origen: string
  origen_display: string
  notas?: string
  etapa: string
  etapa_display: string
  proximo_seguimiento?: string
  alerta: boolean
  horas_sin_mover: number
  interacciones: any[]
  created_at: string
  updated_at: string
}

type Dashboard = {
  nuevos_hoy: number
  sin_mover: number
  clases_prueba: number
  matriculados_mes: number
  urgentes: Lead[]
}

export default function CRMPage() {
  const qc = useQueryClient()
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showNuevoLead, setShowNuevoLead] = useState(false)
  const [filtroEtapa, setFiltroEtapa] = useState("")
  const [form, setForm] = useState({
    nombre_contacto: "",
    nombre_alumno: "",
    edad_alumno: "",
    curso_escolar: "",
    telefono: "",
    objetivo: "general",
    email: "",
    nivel_estimado: "",
    disponibilidad: "",
    colegio: "",
    necesidades_especiales: "",
    origen: "telefono",
    notas: "",
  })

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ["crm-dashboard"],
    queryFn: () => api.get("/leads/dashboard/").then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: leadsRaw, isLoading } = useQuery({
    queryKey: ["leads", filtroEtapa],
    queryFn: () => api.get(`/leads/${filtroEtapa ? `?etapa=${filtroEtapa}` : ""}`).then(r => r.data),
  })

  const leads: Lead[] = Array.isArray(leadsRaw) ? leadsRaw : leadsRaw?.results || []

  const { data: leadDetalle } = useQuery<Lead>({
    queryKey: ["lead", selectedLead?.id],
    queryFn: () => api.get(`/leads/${selectedLead?.id}/`).then(r => r.data),
    enabled: !!selectedLead,
  })

  const crearLead = useMutation({
    mutationFn: (data: any) => api.post("/leads/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      qc.invalidateQueries({ queryKey: ["crm-dashboard"] })
      setShowNuevoLead(false)
      setForm({
        nombre_contacto: "", nombre_alumno: "", edad_alumno: "",
        curso_escolar: "", telefono: "", objetivo: "general",
        email: "", nivel_estimado: "", disponibilidad: "",
        colegio: "", necesidades_especiales: "", origen: "telefono", notas: "",
      })
    },
  })

  const cambiarEtapa = useMutation({
    mutationFn: ({ id, etapa }: { id: number; etapa: string }) =>
      api.post(`/leads/${id}/cambiar-etapa/`, { etapa }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      qc.invalidateQueries({ queryKey: ["crm-dashboard"] })
      qc.invalidateQueries({ queryKey: ["lead", vars.id] })
      if (selectedLead?.id === vars.id) {
        setSelectedLead(prev => prev ? { ...prev, etapa: vars.etapa } : null)
      }
    },
  })

  const handleSubmit = () => {
    const required = ["nombre_contacto", "nombre_alumno", "telefono", "objetivo"]
    for (const f of required) {
      if (!form[f as keyof typeof form]) {
        alert(`Campo obligatorio: ${f}`)
        return
      }
    }
    crearLead.mutate({
      ...form,
      edad_alumno: form.edad_alumno ? parseInt(form.edad_alumno) : null,
    })
  }

  return (
    <div className="flex gap-6 h-full">
      {/* LEFT PANEL */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">CRM</h1>
            <p className="text-sm text-slate-500 mt-1">Gestión de consultas y leads</p>
          </div>
          <button
            onClick={() => setShowNuevoLead(true)}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
          >
            + Nueva consulta
          </button>
        </div>

        {/* Dashboard cards */}
        {dashboard && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Nuevos hoy", value: dashboard.nuevos_hoy, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Sin mover +24h", value: dashboard.sin_mover, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Clase de prueba", value: dashboard.clases_prueba, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Matriculados este mes", value: dashboard.matriculados_mes, color: "text-green-600", bg: "bg-green-50" },
            ].map(card => (
              <div key={card.label} className={`${card.bg} rounded-xl p-4`}>
                <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filtros etapa */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFiltroEtapa("")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filtroEtapa === "" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            Todos
          </button>
          {ETAPAS.filter(e => e.value !== "archivado").map(e => (
            <button
              key={e.value}
              onClick={() => setFiltroEtapa(e.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filtroEtapa === e.value ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Leads list */}
        {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}
        {!isLoading && leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="text-5xl mb-3">📋</span>
            <p className="text-sm">Sin leads. Añade una consulta nueva.</p>
          </div>
        )}

        <div className="space-y-2">
          {leads.map((lead: Lead) => (
            <div
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className={`bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${
                selectedLead?.id === lead.id ? "border-slate-400 ring-1 ring-slate-300" : ""
              } ${lead.alerta ? "border-l-4 border-l-amber-400" : ""}`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{lead.nombre_alumno}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${etapaStyle(lead.etapa)}`}>
                      {etapaLabel(lead.etapa)}
                    </span>
                    {lead.alerta && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        ⚠️ +24h sin mover
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lead.nombre_contacto} · {lead.telefono} · {lead.objetivo_display}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {ETAPAS.filter(e => e.value !== lead.etapa && e.value !== "archivado").slice(0, 2).map(e => (
                    <button
                      key={e.value}
                      onClick={ev => { ev.stopPropagation(); cambiarEtapa.mutate({ id: lead.id, etapa: e.value }) }}
                      className="px-2 py-1 border rounded-lg text-xs text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                    >
                      → {e.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — Lead detail */}
      {selectedLead && leadDetalle && (
        <div className="w-80 shrink-0 bg-white rounded-xl border shadow-sm p-5 self-start sticky top-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-800 text-lg">{leadDetalle.nombre_alumno}</h2>
              <p className="text-xs text-slate-500">{leadDetalle.nombre_contacto}</p>
            </div>
            <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
          </div>

          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${etapaStyle(leadDetalle.etapa)}`}>
            {etapaLabel(leadDetalle.etapa)}
          </span>

          <div className="mt-4 space-y-2 text-sm">
            {[
              ["📞 Teléfono", leadDetalle.telefono],
              ["📧 Email", leadDetalle.email],
              ["🎯 Objetivo", leadDetalle.objetivo_display],
              ["📍 Origen", leadDetalle.origen_display],
              ["🎂 Edad", leadDetalle.edad_alumno ? `${leadDetalle.edad_alumno} años · ${leadDetalle.curso_escolar}` : null],
              ["🏫 Colegio", leadDetalle.colegio],
              ["📊 Nivel estimado", leadDetalle.nivel_estimado],
              ["⏰ Disponibilidad", leadDetalle.disponibilidad],
              ["💬 Notas", leadDetalle.notas],
              ["♿ Necesidades", leadDetalle.necesidades_especiales],
            ].filter(([_, v]) => v).map(([label, value]) => (
              <div key={label as string}>
                <p className="text-xs text-slate-400">{label as string}</p>
                <p className="text-slate-700">{value as string}</p>
              </div>
            ))}
          </div>

          {/* Cambiar etapa */}
          <div className="mt-5">
            <p className="text-xs text-slate-400 mb-2">Cambiar etapa</p>
            <div className="flex flex-wrap gap-1.5">
              {ETAPAS.filter(e => e.value !== leadDetalle.etapa).map(e => (
                <button
                  key={e.value}
                  onClick={() => cambiarEtapa.mutate({ id: leadDetalle.id, etapa: e.value })}
                  className={`px-2 py-1 rounded-lg text-xs font-medium border hover:opacity-80 ${e.color}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interacciones */}
          {leadDetalle.interacciones?.length > 0 && (
            <div className="mt-5">
              <p className="text-xs text-slate-400 mb-2">Historial</p>
              <div className="space-y-2">
                {leadDetalle.interacciones.map((i: any) => (
                  <div key={i.id} className="bg-slate-50 rounded-lg p-2 text-xs">
                    <p className="font-medium text-slate-700">{i.tipo} · {i.fecha?.slice(0, 10)}</p>
                    <p className="text-slate-500 mt-0.5">{i.resumen}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL — Nuevo Lead */}
      {showNuevoLead && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Nueva consulta</h2>
                <button onClick={() => setShowNuevoLead(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Obligatorio</p>

                {[
                  { key: "nombre_contacto", label: "Nombre padre/madre", placeholder: "Ana García" },
                  { key: "nombre_alumno", label: "Nombre del alumno", placeholder: "Carlos García" },
                  { key: "telefono", label: "Teléfono", placeholder: "666 123 456" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                    <input
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Objetivo</label>
                    <select
                      value={form.objetivo}
                      onChange={e => setForm(p => ({ ...p, objetivo: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      {OBJETIVOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Origen</label>
                    <select
                      value={form.origen}
                      onChange={e => setForm(p => ({ ...p, origen: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      {ORIGENES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-2">Opcional</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Edad alumno</label>
                    <input
                      type="number"
                      value={form.edad_alumno}
                      onChange={e => setForm(p => ({ ...p, edad_alumno: e.target.value }))}
                      placeholder="12"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Curso escolar</label>
                    <input
                      value={form.curso_escolar}
                      onChange={e => setForm(p => ({ ...p, curso_escolar: e.target.value }))}
                      placeholder="1º ESO"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                </div>

                {[
                  { key: "email", label: "Email", placeholder: "ana@email.com" },
                  { key: "colegio", label: "Colegio", placeholder: "IES Xelmírez" },
                  { key: "nivel_estimado", label: "Nivel estimado", placeholder: "A2, B1..." },
                  { key: "disponibilidad", label: "Disponibilidad", placeholder: "Tardes, martes y jueves..." },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                    <input
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Necesidades especiales</label>
                  <input
                    value={form.necesidades_especiales}
                    onChange={e => setForm(p => ({ ...p, necesidades_especiales: e.target.value }))}
                    placeholder="TDAH, dislexia..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Notas</label>
                  <textarea
                    value={form.notas}
                    onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                    placeholder="Cualquier detalle relevante..."
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNuevoLead(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={crearLead.isPending}
                  className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                >
                  {crearLead.isPending ? "Guardando..." : "Guardar consulta"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
