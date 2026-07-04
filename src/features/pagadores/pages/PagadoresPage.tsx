import { useState } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pagadoresApi } from "../api"
import type { Pagador } from "@/types"
import EmailModal from "@/components/shared/EmailModal"

function waUrl(tel: string, nombre: string) {
  const clean = tel.replace(/[\s\-().]/g, "")
  const phone = clean.startsWith("+") ? clean : `+34${clean}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${nombre},`)}`
}

const METODO_OPTS = [
  { value: "", label: "— Sin método —" },
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "bizum", label: "Bizum" },
  { value: "domiciliacion", label: "Domiciliación" },
  { value: "tarjeta", label: "Tarjeta" },
]
const FRECUENCIA_OPTS = [
  { value: "", label: "— Sin frecuencia —" },
  { value: "mensual", label: "Mensual" },
  { value: "por_clase", label: "Por clase" },
  { value: "trimestral", label: "Trimestral" },
  { value: "anual", label: "Anual" },
]
const METODO_ICON: Record<string, string> = {
  efectivo: "💵", transferencia: "🏦", bizum: "📱", domiciliacion: "🔄", tarjeta: "💳",
}
const AVATAR_COLORS = [
  "bg-violet-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500",
  "bg-sky-500", "bg-teal-500", "bg-pink-500", "bg-indigo-500",
]

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

interface PagadorForm {
  nombre: string; nif: string; telefono: string; email: string
  metodo: string; frecuencia: string; iban: string; notas: string
  fnac: string; aviso_cumple_dias: number | null
}

const emptyForm = (): PagadorForm => ({
  nombre: "", nif: "", telefono: "", email: "",
  metodo: "", frecuencia: "", iban: "", notas: "",
  fnac: "", aviso_cumple_dias: null,
})

export default function PagadoresPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Pagador | null>(null)
  const [form, setForm] = useState<PagadorForm>(emptyForm())
  const [formError, setFormError] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Pagador | null>(null)
  const [emailTarget, setEmailTarget] = useState<Pagador | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["pagadores"],
    queryFn: () => pagadoresApi.list().then(r => r.data),
  })
  const all: Pagador[] = Array.isArray(data) ? data : []
  const pagadores = search
    ? all.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (p.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.telefono ?? "").includes(search)
      )
    : all

  const saveMut = useMutation({
    mutationFn: (d: PagadorForm) => {
      const payload = { ...d, fnac: d.fnac || null }
      return editing ? pagadoresApi.update(editing.id, payload) : pagadoresApi.create(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pagadores"] }); closeModal() },
    onError: () => setFormError("Error al guardar el pagador."),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => pagadoresApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pagadores"] }); setConfirmDelete(null) },
  })

  function openNew() { setEditing(null); setForm(emptyForm()); setFormError(""); setShowModal(true) }

  function openEdit(p: Pagador) {
    setEditing(p)
    setForm({
      nombre: p.nombre, nif: p.nif ?? "", telefono: p.telefono ?? "",
      email: p.email ?? "", metodo: p.metodo ?? "", frecuencia: p.frecuencia ?? "",
      iban: p.iban ?? "", notas: p.notas ?? "", fnac: p.fnac ?? "",
      aviso_cumple_dias: p.aviso_cumple_dias,
    })
    setFormError(""); setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditing(null) }

  function handleSubmit() {
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio."); return }
    setFormError("")
    saveMut.mutate(form)
  }

  function tryDelete(p: Pagador) {
    setConfirmDelete(p)
  }

  const metodoLabel = (v: string) => METODO_OPTS.find(o => o.value === v)?.label ?? v
  const frecuenciaLabel = (v: string) => FRECUENCIA_OPTS.find(o => o.value === v)?.label ?? v

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pagadores</h1>
          <p className="text-sm text-slate-500 mt-1">{all.length} pagadores registrados</p>
        </div>
        <button onClick={openNew}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Nuevo pagador
        </button>
      </div>

      {/* Search */}
      <input type="text" placeholder="Buscar por nombre, email o teléfono…" value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-5 border rounded-lg px-3 py-2 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

      {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}

      {!isLoading && !pagadores.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">💳</span>
          <p className="text-sm">{search ? "Sin resultados para esa búsqueda." : "Sin pagadores. Crea el primero."}</p>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {pagadores.map(p => {
          const color = AVATAR_COLORS[p.id % AVATAR_COLORS.length]
          const isOpen = expandedId === p.id
          return (
            <div key={p.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {/* Main row */}
              <div className="p-4 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(isOpen ? null : p.id)}>
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${color}`}>
                  {initials(p.nombre)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{p.nombre}</span>
                    {p.metodo && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {METODO_ICON[p.metodo]} {metodoLabel(p.metodo)}
                      </span>
                    )}
                    {p.frecuencia && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {frecuenciaLabel(p.frecuencia)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {p.telefono && (
                      <a href={`tel:${p.telefono}`} onClick={e => e.stopPropagation()}
                        className="text-xs text-slate-500 hover:text-blue-600">📞 {p.telefono}</a>
                    )}
                    {p.email && (
                      <a href={`mailto:${p.email}`} onClick={e => e.stopPropagation()}
                        className="text-xs text-slate-500 hover:text-blue-600">✉ {p.email}</a>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    👥 {p.alumnos_count} alumno{p.alumnos_count !== 1 ? "s" : ""}
                    {p.nif && <span className="ml-2">· NIF {p.nif}</span>}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {p.telefono && (
                    <a href={waUrl(p.telefono, p.nombre)} target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 border rounded-lg text-xs text-green-700 hover:bg-green-50 border-green-200">
                      WhatsApp
                    </a>
                  )}
                  {p.email && (
                    <button onClick={() => setEmailTarget(p)}
                      className="px-3 py-1.5 border rounded-lg text-xs text-blue-700 hover:bg-blue-50 border-blue-200">
                      ✉ Email
                    </button>
                  )}
                  <button onClick={() => openEdit(p)}
                    className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 hover:bg-slate-50">
                    Editar
                  </button>
                  <button onClick={() => tryDelete(p)}
                    className="px-3 py-1.5 border rounded-lg text-xs text-red-600 hover:bg-red-50">
                    ✕
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div className="border-t bg-slate-50 px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  {p.iban && (
                    <div>
                      <p className="font-bold uppercase tracking-widest text-slate-400 mb-1">IBAN</p>
                      <p className="font-mono text-slate-700">{p.iban}</p>
                    </div>
                  )}
                  {p.fnac && (
                    <div>
                      <p className="font-bold uppercase tracking-widest text-slate-400 mb-1">Nacimiento</p>
                      <p className="text-slate-700">{new Date(p.fnac).toLocaleDateString("es-ES")}</p>
                    </div>
                  )}
                  {p.aviso_cumple_dias && (
                    <div>
                      <p className="font-bold uppercase tracking-widest text-slate-400 mb-1">Aviso cumpleaños</p>
                      <p className="text-slate-700">{p.aviso_cumple_dias} días antes</p>
                    </div>
                  )}
                  {p.notas && (
                    <div className="col-span-2 sm:col-span-3">
                      <p className="font-bold uppercase tracking-widest text-slate-400 mb-1">Notas</p>
                      <p className="text-slate-700 whitespace-pre-line">{p.notas}</p>
                    </div>
                  )}
                  {!p.iban && !p.fnac && !p.aviso_cumple_dias && !p.notas && (
                    <p className="text-slate-400 col-span-3 italic">Sin datos adicionales.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create / Edit modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? "Editar pagador" : "Nuevo pagador"}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {formError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{formError}</p>
              )}

              {/* Personal */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Datos personales</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre *</label>
                    <input type="text" value={form.nombre} placeholder="Ej: María García López"
                      onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">NIF / DNI</label>
                    <input type="text" value={form.nif} placeholder="12345678A"
                      onChange={e => setForm(f => ({ ...f, nif: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Teléfono</label>
                    <input type="tel" value={form.telefono} placeholder="612 345 678"
                      onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                    <input type="email" value={form.email} placeholder="maria@ejemplo.com"
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha de nacimiento</label>
                    <input type="date" value={form.fnac}
                      onChange={e => setForm(f => ({ ...f, fnac: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Aviso cumpleaños (días antes)</label>
                    <input type="number" min="0" placeholder="14"
                      value={form.aviso_cumple_dias ?? ""}
                      onChange={e => setForm(f => ({ ...f, aviso_cumple_dias: e.target.value ? +e.target.value : null }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </section>

              {/* Payment */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Método de pago</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Método habitual</label>
                    <select value={form.metodo} onChange={e => setForm(f => ({ ...f, metodo: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {METODO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Frecuencia</label>
                    <select value={form.frecuencia} onChange={e => setForm(f => ({ ...f, frecuencia: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {FRECUENCIA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {(form.metodo === "domiciliacion" || form.metodo === "transferencia") && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">IBAN</label>
                      <input type="text" value={form.iban} placeholder="ES00 0000 0000 0000 0000 0000"
                        onChange={e => setForm(f => ({ ...f, iban: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}
                </div>
              </section>

              {/* Notes */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Notas</p>
                <textarea rows={2} value={form.notas}
                  placeholder="Observaciones, descuentos especiales, acuerdos…"
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0">
              <button onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={saveMut.isPending}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                {saveMut.isPending ? "Guardando..." : editing ? "Guardar cambios" : "Crear pagador"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {emailTarget && (
        <EmailModal
          to={emailTarget.email}
          onSend={(asunto, cuerpo) => pagadoresApi.enviarEmail(emailTarget.id, asunto, cuerpo).then(() => {})}
          onClose={() => setEmailTarget(null)}
        />
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-slate-800 mb-1">Eliminar pagador</h3>
            {confirmDelete.alumnos_count > 0 ? (
              <>
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4">
                  Este pagador tiene <strong>{confirmDelete.alumnos_count} alumno{confirmDelete.alumnos_count > 1 ? "s" : ""}</strong> asignado{confirmDelete.alumnos_count > 1 ? "s" : ""}.
                  Reasígnalos antes de eliminar.
                </p>
                <div className="flex justify-end">
                  <button onClick={() => setConfirmDelete(null)}
                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-1">
                  ¿Eliminar a <strong>{confirmDelete.nombre}</strong>?
                </p>
                <p className="text-xs text-slate-400 mb-4">Esta acción no se puede deshacer.</p>
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
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
