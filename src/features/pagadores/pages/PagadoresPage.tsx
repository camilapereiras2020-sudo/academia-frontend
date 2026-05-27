import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pagadoresApi } from "../api"
import type { Pagador } from "@/types"

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

const METODO_ICONS: Record<string, string> = {
  efectivo: "💵",
  transferencia: "🏦",
  bizum: "📱",
  domiciliacion: "🔄",
  tarjeta: "💳",
}

interface PagadorForm {
  nombre: string
  nif: string
  telefono: string
  email: string
  metodo: string
  frecuencia: string
  iban: string
  notas: string
  fnac: string
  aviso_cumple_dias: number | null
}

const emptyForm: PagadorForm = {
  nombre: "", nif: "", telefono: "", email: "",
  metodo: "", frecuencia: "", iban: "", notas: "",
  fnac: "", aviso_cumple_dias: null,
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

const COLORS = [
  "bg-violet-500", "bg-emerald-500", "bg-rose-500",
  "bg-amber-500", "bg-sky-500", "bg-teal-500",
  "bg-pink-500", "bg-indigo-500",
]

export default function PagadoresPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Pagador | null>(null)
  const [form, setForm] = useState<PagadorForm>(emptyForm)
  const [error, setError] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["pagadores"],
    queryFn: () => pagadoresApi.list().then(r => r.data),
  })

  const allPagadores: Pagador[] = Array.isArray(data) ? data : []
  const pagadores = search
    ? allPagadores.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase()) ||
        p.telefono.includes(search)
      )
    : allPagadores

  const saveMut = useMutation({
    mutationFn: (d: PagadorForm) => {
      const payload = { ...d, fnac: d.fnac || null, aviso_cumple_dias: d.aviso_cumple_dias }
      return editing ? pagadoresApi.update(editing.id, payload) : pagadoresApi.create(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pagadores"] }); closeModal() },
    onError: () => setError("Error al guardar el pagador"),
  })

  const deleteMut = useMutation({
    mutationFn: pagadoresApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagadores"] }),
  })

  function openNew() { setEditing(null); setForm(emptyForm); setError(""); setShowModal(true) }

  function openEdit(p: Pagador) {
    setEditing(p)
    setForm({
      nombre: p.nombre, nif: p.nif || "", telefono: p.telefono || "",
      email: p.email || "", metodo: p.metodo || "", frecuencia: p.frecuencia || "",
      iban: p.iban || "", notas: p.notas || "", fnac: p.fnac || "",
      aviso_cumple_dias: p.aviso_cumple_dias,
    })
    setError(""); setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditing(null); setForm(emptyForm); setError("") }

  function setF(k: keyof PagadorForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  function handleSubmit() {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    saveMut.mutate(form)
  }

  function handleDelete(p: Pagador) {
    if (p.alumnos_count > 0) {
      alert(`Este pagador tiene ${p.alumnos_count} alumno${p.alumnos_count > 1 ? "s" : ""} asignado${p.alumnos_count > 1 ? "s" : ""}. Reasígnalos antes de eliminar.`)
      return
    }
    if (confirm(`¿Eliminar a ${p.nombre}?`)) deleteMut.mutate(p.id)
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pagadores</h1>
          <p className="text-sm text-slate-500 mt-1">{allPagadores.length} pagadores registrados</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Nuevo pagador
        </button>
      </div>

      <input type="text" placeholder="Buscar pagador..." value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-4 border rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />

      {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}

      {!isLoading && !pagadores.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">💳</span>
          <p className="text-sm">{search ? "No se encontraron pagadores" : "Sin pagadores. Crea el primero."}</p>
        </div>
      )}

      <div className="space-y-3">
        {pagadores.map(p => {
          const color = COLORS[p.id % COLORS.length]
          const isOpen = expandedId === p.id
          return (
            <div key={p.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 flex items-start gap-3 flex-wrap cursor-pointer hover:bg-slate-50"
                onClick={() => setExpandedId(isOpen ? null : p.id)}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${color}`}>
                  {getInitials(p.nombre)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{p.nombre}</p>
                    {p.metodo && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {METODO_ICONS[p.metodo]} {METODO_OPTS.find(m => m.value === p.metodo)?.label}
                      </span>
                    )}
                    {p.frecuencia && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {FRECUENCIA_OPTS.find(f => f.value === p.frecuencia)?.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[p.telefono, p.email].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    👥 {p.alumnos_count} alumno{p.alumnos_count !== 1 ? "s" : ""}
                    {p.nif && <span className="ml-2">· NIF: {p.nif}</span>}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(p)} className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 hover:bg-slate-50">✏️ Editar</button>
                  <button onClick={() => handleDelete(p)} className="px-3 py-1.5 border rounded-lg text-xs text-red-600 hover:bg-red-50">✕</button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t px-4 py-3 bg-slate-50 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {p.iban && (
                    <div>
                      <p className="font-semibold uppercase tracking-widest text-slate-400 mb-0.5">IBAN</p>
                      <p className="text-slate-700 font-mono">{p.iban}</p>
                    </div>
                  )}
                  {p.fnac && (
                    <div>
                      <p className="font-semibold uppercase tracking-widest text-slate-400 mb-0.5">F. Nacimiento</p>
                      <p className="text-slate-700">{p.fnac}</p>
                    </div>
                  )}
                  {p.notas && (
                    <div className="col-span-2 sm:col-span-3">
                      <p className="font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Notas</p>
                      <p className="text-slate-700">{p.notas}</p>
                    </div>
                  )}
                  {!p.iban && !p.fnac && !p.notas && (
                    <p className="text-slate-400 col-span-3">Sin datos adicionales.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-slate-800">{editing ? "Editar pagador" : "Nuevo pagador"}</h2>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Datos personales</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre *</label>
                  <input type="text" value={form.nombre} onChange={setF("nombre")}
                    placeholder="Ej: María García López"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">NIF / DNI</label>
                  <input type="text" value={form.nif} onChange={setF("nif")} placeholder="12345678A"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Teléfono</label>
                  <input type="text" value={form.telefono} onChange={setF("telefono")} placeholder="612 345 678"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={setF("email")} placeholder="maria@ejemplo.com"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha de nacimiento</label>
                  <input type="date" value={form.fnac} onChange={setF("fnac")}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Aviso cumpleaños (días)</label>
                  <input type="number" value={form.aviso_cumple_dias || ""}
                    onChange={e => setForm(f => ({ ...f, aviso_cumple_dias: e.target.value ? +e.target.value : null }))}
                    placeholder="14"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2 mb-1">Método de pago</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Método habitual</label>
                  <select value={form.metodo} onChange={setF("metodo")}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {METODO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Frecuencia</label>
                  <select value={form.frecuencia} onChange={setF("frecuencia")}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {FRECUENCIA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {(form.metodo === "domiciliacion" || form.metodo === "transferencia") && (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">IBAN</label>
                    <input type="text" value={form.iban} onChange={setF("iban")}
                      placeholder="ES00 0000 0000 0000 0000 0000"
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
              </div>

              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2 mb-1">Notas</div>
              <textarea value={form.notas} onChange={setF("notas")} rows={2}
                placeholder="Observaciones, descuentos especiales, acuerdos..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="p-6 border-t flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">Cancelar</button>
              <button onClick={handleSubmit} disabled={saveMut.isPending}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                {saveMut.isPending ? "Guardando..." : "Guardar pagador"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
