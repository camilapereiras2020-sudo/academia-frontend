import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"

// ── constants ──────────────────────────────────────────────────────────────

const ETAPAS = [
  { value: "nueva_consulta",   label: "Nueva consulta",   color: "bg-blue-100 text-blue-800" },
  { value: "pendiente_llamar", label: "Pend. llamar",     color: "bg-yellow-100 text-yellow-800" },
  { value: "en_conversacion",  label: "En conversación",  color: "bg-purple-100 text-purple-800" },
  { value: "clase_prueba",     label: "Clase de prueba",  color: "bg-orange-100 text-orange-800" },
  { value: "matriculado",      label: "Matriculado",      color: "bg-green-100 text-green-800" },
  { value: "frio",             label: "Frío",             color: "bg-slate-100 text-slate-500" },
  { value: "archivado",        label: "Archivado",        color: "bg-red-100 text-red-400" },
]

const OBJETIVOS = [
  { value: "general",   label: "General" },
  { value: "cambridge", label: "Cambridge" },
  { value: "ib",        label: "IB" },
  { value: "adultos",   label: "Adultos" },
]

const ORIGENES = [
  { value: "telefono",      label: "Teléfono" },
  { value: "whatsapp",      label: "WhatsApp" },
  { value: "instagram",     label: "Instagram" },
  { value: "facebook",      label: "Facebook" },
  { value: "recomendacion", label: "Recomendación" },
  { value: "web",           label: "Web" },
]

const TIPOS_INTERACCION = [
  { value: "whatsapp",   label: "WhatsApp" },
  { value: "llamada",    label: "Llamada" },
  { value: "email",      label: "Email" },
  { value: "reunion",    label: "Reunión" },
  { value: "en_persona", label: "En persona" },
  { value: "otro",       label: "Otro" },
]

// ── types ──────────────────────────────────────────────────────────────────

type Lead = {
  id: number
  nombre_contacto: string; nombre_alumno: string; edad_alumno?: number
  curso_escolar?: string; telefono: string; email?: string
  objetivo: string; objetivo_display: string; nivel_estimado?: string
  disponibilidad?: string; colegio?: string; necesidades_especiales?: string
  origen: string; origen_display: string; notas?: string
  etapa: string; etapa_display: string; proximo_seguimiento?: string
  alerta: boolean; horas_sin_mover: number
  interacciones: { id: number; tipo: string; fecha: string; resumen: string; proxima_accion: string }[]
  created_at: string; updated_at: string
}

type Dashboard = {
  nuevos_hoy: number; sin_mover: number; clases_prueba: number; matriculados_mes: number
}

interface LeadForm {
  nombre_contacto: string; nombre_alumno: string; edad_alumno: string
  curso_escolar: string; telefono: string; email: string
  objetivo: string; nivel_estimado: string; disponibilidad: string
  colegio: string; necesidades_especiales: string; origen: string
  notas: string; proximo_seguimiento: string
}

const emptyLeadForm = (): LeadForm => ({
  nombre_contacto: "", nombre_alumno: "", edad_alumno: "", curso_escolar: "",
  telefono: "", email: "", objetivo: "general", nivel_estimado: "",
  disponibilidad: "", colegio: "", necesidades_especiales: "",
  origen: "telefono", notas: "", proximo_seguimiento: "",
})

// ── helpers ────────────────────────────────────────────────────────────────

const etapaInfo = (v: string) => ETAPAS.find(e => e.value === v) ?? { label: v, color: "bg-slate-100 text-slate-600" }

const isValidSpanishPhone = (v: string) => /^[679]\d{8}$/.test(v.replace(/\s/g, ""))

// ── component ──────────────────────────────────────────────────────────────

export default function CRMPage() {
  const qc = useQueryClient()

  // list state
  const [filtroEtapa, setFiltroEtapa] = useState("")
  const [search, setSearch] = useState("")

  // detail panel
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [confirmDeletePanel, setConfirmDeletePanel] = useState(false)

  // interaction log form (inside panel)
  const [iForm, setIForm] = useState({ tipo: "llamada", resumen: "", proxima_accion: "" })
  const [iError, setIError] = useState("")

  // create / edit modal
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<LeadForm>(emptyLeadForm())
  const [formError, setFormError] = useState("")

  // ── queries ──────────────────────────────────────────────────────────────

  const { data: dashboard } = useQuery<Dashboard>({
    queryKey: ["crm-dashboard"],
    queryFn: () => api.get("/leads/dashboard/").then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: leadsRaw, isLoading } = useQuery({
    queryKey: ["leads", filtroEtapa],
    queryFn: () => api.get(`/leads/${filtroEtapa ? `?etapa=${filtroEtapa}` : ""}`).then(r => r.data),
  })
  const leadsAll: Lead[] = Array.isArray(leadsRaw) ? leadsRaw : leadsRaw?.results ?? []
  const leads = search
    ? leadsAll.filter(l =>
        l.nombre_alumno.toLowerCase().includes(search.toLowerCase()) ||
        l.nombre_contacto.toLowerCase().includes(search.toLowerCase()) ||
        (l.telefono ?? "").includes(search)
      )
    : leadsAll

  const { data: detalle, isLoading: loadingDetail } = useQuery<Lead>({
    queryKey: ["lead", selectedId],
    queryFn: () => api.get(`/leads/${selectedId}/`).then(r => r.data),
    enabled: !!selectedId,
  })

  // ── mutations ─────────────────────────────────────────────────────────────

  const saveMut = useMutation({
    mutationFn: (data: any) => editingId
      ? api.patch(`/leads/${editingId}/`, data)
      : api.post("/leads/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      qc.invalidateQueries({ queryKey: ["crm-dashboard"] })
      if (editingId) qc.invalidateQueries({ queryKey: ["lead", editingId] })
      closeModal()
    },
    onError: () => setFormError("Error al guardar. Revisa los campos."),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/leads/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      qc.invalidateQueries({ queryKey: ["crm-dashboard"] })
      setSelectedId(null)
      setConfirmDeletePanel(false)
    },
  })

  const cambiarEtapaMut = useMutation({
    mutationFn: ({ id, etapa }: { id: number; etapa: string }) =>
      api.post(`/leads/${id}/cambiar-etapa/`, { etapa }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      qc.invalidateQueries({ queryKey: ["crm-dashboard"] })
      qc.invalidateQueries({ queryKey: ["lead", vars.id] })
    },
  })

  const interaccionMut = useMutation({
    mutationFn: (data: any) => api.post("/interacciones/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", selectedId] })
      setIForm({ tipo: "llamada", resumen: "", proxima_accion: "" })
      setIError("")
    },
    onError: () => setIError("Error al registrar la interacción."),
  })

  // ── handlers ──────────────────────────────────────────────────────────────

  function openNew() {
    setEditingId(null); setForm(emptyLeadForm()); setFormError(""); setShowModal(true)
  }

  function openEdit(lead: Lead) {
    setEditingId(lead.id)
    setForm({
      nombre_contacto: lead.nombre_contacto, nombre_alumno: lead.nombre_alumno,
      edad_alumno: lead.edad_alumno ? String(lead.edad_alumno) : "",
      curso_escolar: lead.curso_escolar ?? "", telefono: lead.telefono ?? "",
      email: lead.email ?? "", objetivo: lead.objetivo,
      nivel_estimado: lead.nivel_estimado ?? "", disponibilidad: lead.disponibilidad ?? "",
      colegio: lead.colegio ?? "", necesidades_especiales: lead.necesidades_especiales ?? "",
      origen: lead.origen, notas: lead.notas ?? "",
      proximo_seguimiento: lead.proximo_seguimiento ?? "",
    })
    setFormError(""); setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditingId(null) }

  function handleSubmit() {
    if (!form.nombre_contacto.trim() || !form.nombre_alumno.trim()) {
      setFormError("Nombre del contacto y del alumno son obligatorios.")
      return
    }
    if (form.telefono.trim() && !isValidSpanishPhone(form.telefono)) {
      setFormError("El teléfono debe tener 9 dígitos y empezar por 6, 7 o 9.")
      return
    }
    setFormError("")
    saveMut.mutate({
      ...form,
      edad_alumno: form.edad_alumno ? parseInt(form.edad_alumno) : null,
      proximo_seguimiento: form.proximo_seguimiento || null,
    })
  }

  function handleLogInteraccion() {
    if (!iForm.resumen.trim()) { setIError("El resumen es obligatorio."); return }
    setIError("")
    interaccionMut.mutate({ lead: selectedId, ...iForm, proxima_accion: iForm.proxima_accion || "" })
  }

  function selectLead(id: number) {
    setSelectedId(id); setConfirmDeletePanel(false)
    setIForm({ tipo: "llamada", resumen: "", proxima_accion: "" }); setIError("")
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6 min-h-0">

      {/* ── LEFT PANEL ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Header */}
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">CRM</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gestión de consultas y leads</p>
          </div>
          <button onClick={openNew}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700">
            + Nueva consulta
          </button>
        </div>

        {/* Stat cards */}
        {dashboard && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Nuevos hoy",          value: dashboard.nuevos_hoy,       color: "text-blue-600",   bg: "bg-blue-50" },
              { label: "Sin mover +24h",       value: dashboard.sin_mover,        color: "text-amber-600",  bg: "bg-amber-50" },
              { label: "Clase de prueba",      value: dashboard.clases_prueba,    color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Matriculados este mes",value: dashboard.matriculados_mes, color: "text-green-600",  bg: "bg-green-50" },
            ].map(c => (
              <div key={c.label} className={`${c.bg} rounded-xl p-4`}>
                <p className="text-xs text-slate-500 mb-1">{c.label}</p>
                <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + etapa filter */}
        <div className="mb-4 space-y-2">
          <input type="text" placeholder="Buscar por nombre o teléfono…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-xs border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFiltroEtapa("")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filtroEtapa === "" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}>
              Todos
            </button>
            {ETAPAS.filter(e => e.value !== "archivado").map(e => (
              <button key={e.value} onClick={() => setFiltroEtapa(e.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filtroEtapa === e.value ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}
        {!isLoading && !leads.length && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="text-5xl mb-3">📋</span>
            <p className="text-sm">{search ? "Sin resultados." : "Sin leads. Añade una consulta."}</p>
          </div>
        )}

        {/* Lead cards */}
        <div className="space-y-2">
          {leads.map(lead => {
            const ei = etapaInfo(lead.etapa)
            return (
              <div key={lead.id}
                onClick={() => selectLead(lead.id)}
                className={`bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  selectedId === lead.id ? "border-slate-400 ring-1 ring-slate-300" : ""
                } ${lead.alerta ? "border-l-4 border-l-amber-400" : ""}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{lead.nombre_alumno}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ei.color}`}>
                        {ei.label}
                      </span>
                      {lead.alerta && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          ⚠ +24h sin mover
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {lead.nombre_contacto}
                      {lead.telefono && ` · ${lead.telefono}`}
                      {lead.objetivo && ` · ${OBJETIVOS.find(o => o.value === lead.objetivo)?.label ?? lead.objetivo}`}
                    </p>
                  </div>
                  {/* Quick stage advance */}
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {ETAPAS.filter(e => e.value !== lead.etapa && e.value !== "archivado" && e.value !== "frio").slice(0, 2).map(e => (
                      <button key={e.value}
                        onClick={() => cambiarEtapaMut.mutate({ id: lead.id, etapa: e.value })}
                        className="px-2 py-1 border rounded-lg text-xs text-slate-600 hover:bg-slate-50 whitespace-nowrap">
                        → {e.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL — detail ─────────────────────────────────────────── */}
      {selectedId && (
        <div className="w-80 shrink-0 bg-white rounded-xl border shadow-sm self-start sticky top-6 overflow-y-auto max-h-[calc(100vh-6rem)]">
          {loadingDetail && <p className="p-5 text-sm text-slate-400">Cargando...</p>}

          {detalle && (
            <>
              {/* Panel header */}
              <div className="px-5 py-4 border-b flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-bold text-slate-800 text-base leading-tight">{detalle.nombre_alumno}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{detalle.nombre_contacto}</p>
                  <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${etapaInfo(detalle.etapa).color}`}>
                    {etapaInfo(detalle.etapa).label}
                  </span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(detalle)}
                    className="px-2 py-1 border rounded-lg text-xs text-slate-600 hover:bg-slate-50">
                    Editar
                  </button>
                  <button onClick={() => setSelectedId(null)}
                    className="text-slate-400 hover:text-slate-600 px-1 text-lg leading-none">✕</button>
                </div>
              </div>

              {/* Fields */}
              <div className="px-5 py-4 space-y-2.5 text-sm border-b">
                {[
                  ["📞", detalle.telefono],
                  ["✉", detalle.email],
                  ["🎯", detalle.objetivo_display],
                  ["📍", detalle.origen_display],
                  ["🎂", detalle.edad_alumno ? `${detalle.edad_alumno} años${detalle.curso_escolar ? " · " + detalle.curso_escolar : ""}` : null],
                  ["🏫", detalle.colegio],
                  ["📊", detalle.nivel_estimado],
                  ["⏰", detalle.disponibilidad],
                  ["♿", detalle.necesidades_especiales],
                  ["📅", detalle.proximo_seguimiento ? `Seguimiento: ${new Date(detalle.proximo_seguimiento).toLocaleDateString("es-ES")}` : null],
                  ["📝", detalle.notas],
                ].filter(([, v]) => v).map(([icon, value]) => (
                  <div key={icon as string} className="flex gap-2">
                    <span className="flex-shrink-0">{icon as string}</span>
                    <span className="text-slate-700 text-xs">{value as string}</span>
                  </div>
                ))}
              </div>

              {/* Change stage */}
              <div className="px-5 py-4 border-b">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Cambiar etapa</p>
                <div className="flex flex-wrap gap-1.5">
                  {ETAPAS.filter(e => e.value !== detalle.etapa).map(e => (
                    <button key={e.value}
                      onClick={() => cambiarEtapaMut.mutate({ id: detalle.id, etapa: e.value })}
                      disabled={cambiarEtapaMut.isPending}
                      className={`px-2 py-1 rounded-lg text-xs font-medium border hover:opacity-80 disabled:opacity-50 ${e.color}`}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Log interaction */}
              <div className="px-5 py-4 border-b">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Registrar interacción</p>
                {iError && <p className="text-xs text-red-600 mb-2">{iError}</p>}
                <div className="space-y-2">
                  <select value={iForm.tipo} onChange={e => setIForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TIPOS_INTERACCION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <textarea rows={2} placeholder="Resumen de la interacción…" value={iForm.resumen}
                    onChange={e => setIForm(f => ({ ...f, resumen: e.target.value }))}
                    className="w-full border rounded-lg px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="text" placeholder="Próxima acción (opcional)" value={iForm.proxima_accion}
                    onChange={e => setIForm(f => ({ ...f, proxima_accion: e.target.value }))}
                    className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={handleLogInteraccion} disabled={interaccionMut.isPending}
                    className="w-full px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-700 disabled:opacity-50">
                    {interaccionMut.isPending ? "Guardando..." : "Registrar"}
                  </button>
                </div>
              </div>

              {/* Interaction history */}
              {(detalle.interacciones ?? []).length > 0 && (
                <div className="px-5 py-4 border-b">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Historial</p>
                  <div className="space-y-2">
                    {detalle.interacciones.map(i => (
                      <div key={i.id} className="bg-slate-50 rounded-lg p-2.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold text-slate-700">
                            {TIPOS_INTERACCION.find(t => t.value === i.tipo)?.label ?? i.tipo}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(i.fecha).toLocaleDateString("es-ES")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{i.resumen}</p>
                        {i.proxima_accion && (
                          <p className="text-xs text-blue-600 mt-1">→ {i.proxima_accion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delete */}
              <div className="px-5 py-4">
                {!confirmDeletePanel ? (
                  <button onClick={() => setConfirmDeletePanel(true)}
                    className="w-full px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50">
                    Eliminar lead
                  </button>
                ) : (
                  <div className="border border-red-200 rounded-lg p-3 bg-red-50">
                    <p className="text-xs text-red-700 mb-2 font-medium">¿Eliminar este lead? No se puede deshacer.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDeletePanel(false)}
                        className="flex-1 px-2 py-1.5 border rounded-lg text-xs text-slate-600 bg-white hover:bg-slate-50">
                        Cancelar
                      </button>
                      <button onClick={() => deleteMut.mutate(detalle.id)} disabled={deleteMut.isPending}
                        className="flex-1 px-2 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">
                        {deleteMut.isPending ? "..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MODAL — create / edit ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? "Editar consulta" : "Nueva consulta"}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{formError}</p>
              )}

              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Obligatorio</p>
                <div className="space-y-3">
                  {[
                    { key: "nombre_contacto", label: "Nombre padre/madre *", placeholder: "Ana García" },
                    { key: "nombre_alumno",   label: "Nombre del alumno *",  placeholder: "Carlos García" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{f.label}</label>
                      <input value={form[f.key as keyof LeadForm]} placeholder={f.placeholder}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Opcional</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Objetivo</label>
                      <select value={form.objetivo} onChange={e => setForm(p => ({ ...p, objetivo: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {OBJETIVOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Origen</label>
                      <select value={form.origen} onChange={e => setForm(p => ({ ...p, origen: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {ORIGENES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Teléfono</label>
                    <input value={form.telefono} placeholder="666 123 456"
                      onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        form.telefono.trim() && !isValidSpanishPhone(form.telefono)
                          ? "border-red-300 focus:ring-red-400"
                          : "focus:ring-blue-500"
                      }`} />
                    {form.telefono.trim() && !isValidSpanishPhone(form.telefono) && (
                      <p className="text-xs text-red-600 mt-1">Debe tener 9 dígitos y empezar por 6, 7 o 9.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Edad alumno</label>
                      <input type="number" placeholder="12" value={form.edad_alumno}
                        onChange={e => setForm(p => ({ ...p, edad_alumno: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Curso escolar</label>
                      <input placeholder="1º ESO" value={form.curso_escolar}
                        onChange={e => setForm(p => ({ ...p, curso_escolar: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  {[
                    { key: "email",                label: "Email",              placeholder: "ana@email.com" },
                    { key: "colegio",              label: "Colegio",            placeholder: "IES Xelmírez" },
                    { key: "nivel_estimado",       label: "Nivel estimado",     placeholder: "A2, B1…" },
                    { key: "disponibilidad",       label: "Disponibilidad",     placeholder: "Tardes, martes y jueves…" },
                    { key: "necesidades_especiales", label: "Necesidades especiales", placeholder: "TDAH, dislexia…" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{f.label}</label>
                      <input value={form[f.key as keyof LeadForm]} placeholder={f.placeholder}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Próximo seguimiento</label>
                    <input type="date" value={form.proximo_seguimiento}
                      onChange={e => setForm(p => ({ ...p, proximo_seguimiento: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Notas</label>
                    <textarea rows={3} placeholder="Cualquier detalle relevante…" value={form.notas}
                      onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0">
              <button onClick={closeModal}
                className="flex-1 px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={saveMut.isPending}
                className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
                {saveMut.isPending ? "Guardando..." : editingId ? "Guardar cambios" : "Crear consulta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
