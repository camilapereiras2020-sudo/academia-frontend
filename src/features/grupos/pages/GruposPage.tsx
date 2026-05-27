import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { gruposApi } from "../api"
import type { Grupo } from "@/types"

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const NIVELES = [
  "", "A1 - Principiantes", "A2 - Básico", "B1 - Intermedio",
  "B1+ - Intermedio alto", "B2 - Avanzado", "B2 Cambridge FCE",
  "C1 - Proficiency", "Kids A1", "Kids A2",
]
const PALETTE = [
  { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd", accent: "#3b82f6" },
  { bg: "#dcfce7", text: "#15803d", border: "#86efac", accent: "#22c55e" },
  { bg: "#fef9c3", text: "#a16207", border: "#fde047", accent: "#eab308" },
  { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4", accent: "#ec4899" },
  { bg: "#ede9fe", text: "#6d28d9", border: "#c4b5fd", accent: "#8b5cf6" },
  { bg: "#ffedd5", text: "#c2410c", border: "#fdba74", accent: "#f97316" },
  { bg: "#cffafe", text: "#0e7490", border: "#67e8f9", accent: "#06b6d4" },
  { bg: "#f0fdf4", text: "#166534", border: "#4ade80", accent: "#16a34a" },
]

interface HorarioSlot { dia: number; ini: string; fin: string }
interface GrupoForm {
  nombre: string; nivel: string; tarifa: number
  aula: string; color_idx: number; horarios: HorarioSlot[]
}

const emptyForm = (nextColorIdx = 0): GrupoForm => ({
  nombre: "", nivel: "", tarifa: 0, aula: "", color_idx: nextColorIdx, horarios: [],
})

export default function GruposPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Grupo | null>(null)
  const [form, setForm] = useState<GrupoForm>(emptyForm())
  const [formError, setFormError] = useState("")
  const [expanded, setExpanded] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Grupo | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["grupos"],
    queryFn: () => gruposApi.list().then(r => r.data),
  })
  const grupos: Grupo[] = Array.isArray(data) ? data : []

  const saveMut = useMutation({
    mutationFn: (d: GrupoForm) => editing ? gruposApi.update(editing.id, d) : gruposApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grupos"] }); closeModal() },
    onError: () => setFormError("Error al guardar el grupo."),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => gruposApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grupos"] }); setConfirmDelete(null) },
  })

  function openNew() {
    setEditing(null)
    setForm(emptyForm(grupos.length % PALETTE.length))
    setFormError("")
    setShowModal(true)
  }

  function openEdit(g: Grupo) {
    setEditing(g)
    setForm({
      nombre: g.nombre, nivel: g.nivel ?? "", tarifa: g.tarifa,
      aula: g.aula ?? "", color_idx: g.color_idx ?? 0,
      horarios: g.horarios ?? [],
    })
    setFormError("")
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditing(null) }

  function addHorario() {
    setForm(f => ({ ...f, horarios: [...f.horarios, { dia: 0, ini: "09:00", fin: "10:00" }] }))
  }

  function removeHorario(idx: number) {
    setForm(f => ({ ...f, horarios: f.horarios.filter((_, i) => i !== idx) }))
  }

  function updateHorario(idx: number, field: string, value: string | number) {
    setForm(f => {
      const h = [...f.horarios]
      h[idx] = { ...h[idx], [field]: value }
      return { ...f, horarios: h }
    })
  }

  function handleSubmit() {
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio."); return }
    setFormError("")
    saveMut.mutate(form)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Grupos</h1>
          <p className="text-sm text-slate-500 mt-1">{grupos.length} grupos activos</p>
        </div>
        <button onClick={openNew}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Nuevo grupo
        </button>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}

      {!isLoading && !grupos.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">🗂️</span>
          <p className="text-sm">Sin grupos. Crea el primero.</p>
        </div>
      )}

      {/* Group cards */}
      <div className="space-y-3">
        {grupos.map(g => {
          const c = PALETTE[g.color_idx % PALETTE.length]
          const isOpen = expanded === g.id
          const horarios = g.horarios ?? []
          return (
            <div key={g.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {/* Card row */}
              <div className="flex items-stretch">
                {/* Color accent bar */}
                <div className="w-1.5 flex-shrink-0" style={{ background: c.accent }} />

                <div className="flex-1 p-4 flex items-center justify-between flex-wrap gap-3
                  cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : g.id)}>
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <span className="font-bold text-slate-800">{g.nombre}</span>
                    {g.nivel && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                        {g.nivel}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">👥 {g.alumnos_count} alumnos</span>
                    {g.aula && <span className="text-xs text-slate-500">📍 {g.aula}</span>}
                    {g.tarifa > 0 && (
                      <span className="text-xs font-semibold text-slate-600">
                        {Number(g.tarifa).toFixed(2)} €/mes
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Schedule chips (collapsed) */}
                    {!isOpen && horarios.length > 0 && (
                      <div className="hidden sm:flex flex-wrap gap-1">
                        {horarios.map((h, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                            {DIAS[h.dia]?.slice(0, 3)} {h.ini}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-slate-400 text-xs select-none">{isOpen ? "▲" : "▼"}</span>

                    {/* Action buttons */}
                    <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(g)}
                        className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 hover:bg-slate-50">
                        Editar
                      </button>
                      <button onClick={() => setConfirmDelete(g)}
                        className="px-3 py-1.5 border rounded-lg text-xs text-red-600 hover:bg-red-50">
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded schedule */}
              {isOpen && (
                <div className="border-t px-5 py-4" style={{ background: c.bg }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: c.text }}>
                    Horario del grupo
                  </p>
                  {horarios.length ? (
                    <div className="flex flex-wrap gap-2">
                      {horarios.map((h, i) => (
                        <span key={i} className="text-sm font-medium px-4 py-1.5 rounded-full"
                          style={{ background: "white", color: c.text, border: `1px solid ${c.border}` }}>
                          {DIAS[h.dia]} · {h.ini} – {h.fin}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs opacity-60" style={{ color: c.text }}>Sin horario definido.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-800">{editing ? "Editar grupo" : "Nuevo grupo"}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {formError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{formError}</p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre *</label>
                <input type="text" value={form.nombre} placeholder="Ej: B1 Martes tarde"
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nivel</label>
                  <select value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {NIVELES.map(n => <option key={n} value={n}>{n || "— Sin nivel —"}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Tarifa mensual (€)</label>
                  <input type="number" value={form.tarifa} min="0" step="0.01"
                    onChange={e => setForm(f => ({ ...f, tarifa: +e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Aula</label>
                  <input type="text" value={form.aula} placeholder="Aula 1, Online…"
                    onChange={e => setForm(f => ({ ...f, aula: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Color</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {PALETTE.map((c, i) => (
                      <button key={i} onClick={() => setForm(f => ({ ...f, color_idx: i }))}
                        title={`Color ${i + 1}`}
                        className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                        style={{
                          background: c.bg,
                          border: `3px solid ${form.color_idx === i ? c.accent : c.border}`,
                          boxShadow: form.color_idx === i ? `0 0 0 2px ${c.accent}40` : "none",
                        }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-slate-500">Horario base</label>
                  <button onClick={addHorario} className="text-xs text-blue-600 hover:text-blue-800">
                    + Añadir franja
                  </button>
                </div>
                {!form.horarios.length && (
                  <p className="text-xs text-slate-400 italic">Sin franjas. Pulsa + Añadir franja.</p>
                )}
                <div className="space-y-2">
                  {form.horarios.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2 flex-wrap">
                      <select value={h.dia} onChange={e => updateHorario(idx, "dia", +e.target.value)}
                        className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none">
                        {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                      <input type="time" value={h.ini} onChange={e => updateHorario(idx, "ini", e.target.value)}
                        className="border rounded-lg px-2 py-1.5 text-sm w-28 focus:outline-none" />
                      <span className="text-sm text-slate-400">→</span>
                      <input type="time" value={h.fin} onChange={e => updateHorario(idx, "fin", e.target.value)}
                        className="border rounded-lg px-2 py-1.5 text-sm w-28 focus:outline-none" />
                      <button onClick={() => removeHorario(idx)}
                        className="text-red-400 hover:text-red-600 text-sm">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color preview */}
              {form.nombre && (
                <div className="rounded-lg p-3 border text-sm font-medium"
                  style={{
                    background: PALETTE[form.color_idx]?.bg,
                    color: PALETTE[form.color_idx]?.text,
                    borderColor: PALETTE[form.color_idx]?.border,
                  }}>
                  Vista previa: {form.nombre}
                  {form.nivel && <span className="ml-2 opacity-70 text-xs">{form.nivel}</span>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0">
              <button onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={saveMut.isPending}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                {saveMut.isPending ? "Guardando..." : editing ? "Guardar cambios" : "Crear grupo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-slate-800 mb-1">Eliminar grupo</h3>
            <p className="text-sm text-slate-500 mb-1">
              ¿Eliminar <strong>{confirmDelete.nombre}</strong>?
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Los alumnos del grupo no se eliminarán, pero perderán la asignación.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
                Cancelar
              </button>
              <button onClick={() => deleteMut.mutate(confirmDelete.id)} disabled={deleteMut.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50">
                {deleteMut.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
