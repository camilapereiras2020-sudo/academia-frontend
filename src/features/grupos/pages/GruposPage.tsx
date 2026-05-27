import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { gruposApi } from "../api"
import type { Grupo } from "@/types"

const DIAS = ["Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"]
const NIVELES = ["","A1 - Principiantes","A2 - Basico","B1 - Intermedio","B1+ - Intermedio alto","B2 - Avanzado","B2 Cambridge FCE","C1 - Proficiency","Kids A1","Kids A2"]
const COLORS = [
  { bg:"#dbeafe", text:"#1d4ed8", border:"#93c5fd" },
  { bg:"#dcfce7", text:"#15803d", border:"#86efac" },
  { bg:"#fef9c3", text:"#a16207", border:"#fde047" },
  { bg:"#fce7f3", text:"#9d174d", border:"#f9a8d4" },
  { bg:"#ede9fe", text:"#6d28d9", border:"#c4b5fd" },
  { bg:"#ffedd5", text:"#c2410c", border:"#fdba74" },
  { bg:"#cffafe", text:"#0e7490", border:"#67e8f9" },
  { bg:"#f0fdf4", text:"#166534", border:"#4ade80" },
]

interface HorarioSlot { dia: number; ini: string; fin: string }
interface GrupoForm {
  nombre: string; nivel: string; tarifa: number
  aula: string; color_idx: number; horarios: HorarioSlot[]
}
const emptyForm: GrupoForm = { nombre:"", nivel:"", tarifa:0, aula:"", color_idx:0, horarios:[] }

export default function GruposPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Grupo | null>(null)
  const [form, setForm] = useState<GrupoForm>(emptyForm)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [error, setError] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["grupos"],
    queryFn: () => gruposApi.list().then(r => r.data),
  })
  const grupos = Array.isArray(data) ? data : []

  const saveMut = useMutation({
    mutationFn: (d: GrupoForm) => editing
      ? gruposApi.update(editing.id, d)
      : gruposApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grupos"] }); closeModal() },
    onError: () => setError("Error al guardar el grupo"),
  })

  const deleteMut = useMutation({
    mutationFn: gruposApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grupos"] }),
  })

  function openNew() {
    setEditing(null)
    setForm({ ...emptyForm, color_idx: grupos.length % COLORS.length })
    setError("")
    setShowModal(true)
  }

  function openEdit(g: Grupo) {
    setEditing(g)
    setForm({
      nombre: g.nombre, nivel: g.nivel || "", tarifa: g.tarifa,
      aula: g.aula || "", color_idx: g.color_idx || 0,
      horarios: g.horarios || [],
    })
    setError("")
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditing(null); setForm(emptyForm) }

  function addHorario() {
    setForm(f => ({ ...f, horarios: [...f.horarios, { dia: 0, ini: "09:00", fin: "10:00" }] }))
  }

  function removeHorario(idx: number) {
    setForm(f => ({ ...f, horarios: f.horarios.filter((_, i) => i !== idx) }))
  }

  function updateHorario(idx: number, field: string, value: string | number) {
    setForm(f => {
      const horarios = [...f.horarios]
      horarios[idx] = { ...horarios[idx], [field]: value }
      return { ...f, horarios }
    })
  }

  function handleSubmit() {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    saveMut.mutate(form)
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Grupos</h1>
          <p className="text-sm text-slate-500 mt-1">{grupos.length} grupos activos</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Nuevo grupo
        </button>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}

      {!isLoading && !grupos.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">🗂</span>
          <p className="text-sm">Sin grupos. Crea el primero.</p>
        </div>
      )}

      <div className="space-y-3">
        {grupos.map(g => {
          const c = COLORS[g.color_idx % COLORS.length]
          const isOpen = expanded === g.id
          const horStr = g.horarios?.length
            ? g.horarios.map(h => DIAS[h.dia] + " " + h.ini + "-" + h.fin).join(" · ")
            : "Sin horario"
          return (
            <div key={g.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between flex-wrap gap-2 cursor-pointer hover:bg-slate-50"
                onClick={() => setExpanded(isOpen ? null : g.id)}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.bg, border: `2px solid ${c.border}` }} />
                  <span className="font-bold text-slate-800">{g.nombre}</span>
                  {g.nivel && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{g.nivel}</span>}
                  <span className="text-xs text-slate-500">👥 {g.alumnos_count} alumnos</span>
                  {g.aula && <span className="text-xs text-slate-500">📍 {g.aula}</span>}
                  {g.tarifa > 0 && <span className="text-xs text-slate-500">💶 {Number(g.tarifa).toFixed(2)} €/mes</span>}
                  <span className="text-xs text-slate-400">⏰ {horStr}</span>
                </div>
                <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(g)} className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 hover:bg-slate-50">✏️ Editar</button>
                  <button onClick={() => { if (confirm("Eliminar este grupo?")) deleteMut.mutate(g.id) }}
                    className="px-3 py-1.5 border rounded-lg text-xs text-red-600 hover:bg-red-50">✕</button>
                </div>
              </div>
              {isOpen && (
                <div className="border-t px-4 py-3" style={{ background: c.bg }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: c.text }}>Horario del grupo</p>
                  {g.horarios?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {g.horarios.map((h, i) => (
                        <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "white", color: c.text, border: `1px solid ${c.border}` }}>
                          {DIAS[h.dia]} {h.ini} – {h.fin}
                        </span>
                      ))}
                    </div>
                  ) : <p className="text-xs opacity-60">Sin horario definido</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-slate-800">{editing ? "Editar grupo" : "Nuevo grupo"}</h2>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: B1 Martes tarde"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nivel</label>
                  <select value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {NIVELES.map(n => <option key={n} value={n}>{n || "— Sin nivel —"}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Tarifa mensual (€)</label>
                  <input type="number" value={form.tarifa} onChange={e => setForm(f => ({ ...f, tarifa: +e.target.value }))}
                    min="0" step="0.01"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Aula</label>
                  <input type="text" value={form.aula} onChange={e => setForm(f => ({ ...f, aula: e.target.value }))}
                    placeholder="Aula 1, Online..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Color</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {COLORS.map((c, i) => (
                      <button key={i} onClick={() => setForm(f => ({ ...f, color_idx: i }))}
                        className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                        style={{ background: c.bg, border: `3px solid ${form.color_idx === i ? c.border : "transparent"}` }} />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-500">Horario base</label>
                  <button onClick={addHorario} className="text-xs text-blue-600 hover:text-blue-800">+ Añadir franja</button>
                </div>
                <div className="space-y-2">
                  {form.horarios.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2 flex-wrap">
                      <select value={h.dia} onChange={e => updateHorario(idx, "dia", +e.target.value)}
                        className="border rounded px-2 py-1.5 text-sm">
                        {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                      <input type="time" value={h.ini} onChange={e => updateHorario(idx, "ini", e.target.value)}
                        className="border rounded px-2 py-1.5 text-sm w-28" />
                      <span className="text-sm text-slate-400">a</span>
                      <input type="time" value={h.fin} onChange={e => updateHorario(idx, "fin", e.target.value)}
                        className="border rounded px-2 py-1.5 text-sm w-28" />
                      <button onClick={() => removeHorario(idx)} className="text-red-500 hover:text-red-700 text-sm">✕</button>
                    </div>
                  ))}
                  {!form.horarios.length && <p className="text-xs text-slate-400">Sin franjas horarias. Pulsa + Añadir franja.</p>}
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">Cancelar</button>
              <button onClick={handleSubmit} disabled={saveMut.isPending}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                {saveMut.isPending ? "Guardando..." : "Guardar grupo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
