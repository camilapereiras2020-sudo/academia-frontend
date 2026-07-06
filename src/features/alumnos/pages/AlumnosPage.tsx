import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useSearchParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { alumnosApi } from "../alumnos_api"
import { pagadoresApi } from "@/features/pagadores/api"
import { gruposApi } from "@/features/grupos/api"
import type { Alumno, Pagador, Grupo, Marca } from "@/types"
import EmailModal from "@/components/shared/EmailModal"

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const AVATAR_COLORS = [
  "bg-blue-500", "bg-green-600", "bg-rose-500", "bg-amber-500",
  "bg-purple-600", "bg-teal-600", "bg-pink-500", "bg-indigo-600",
]

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

function age(fnac: string | null) {
  if (!fnac) return null
  const b = new Date(fnac), now = new Date()
  return now.getFullYear() - b.getFullYear() -
    (now < new Date(now.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0)
}

interface HorarioSlot { dia: number; ini: string; fin: string; grupoId: number }

const MARCAS: { value: Marca; label: string }[] = [
  { value: "rangers_academy", label: "Rangers Academy" },
  { value: "cami_and_co", label: "Cami & Co" },
]

interface FormState {
  nombre: string; fnac: string; telefono: string; email: string; notas: string
  marca: Marca | ""
  pagador: number | null; aviso_cumple_dias: number | null
  grupos: number[]; horarios: HorarioSlot[]
}

const emptyForm = (): FormState => ({
  nombre: "", fnac: "", telefono: "", email: "", notas: "",
  marca: "",
  pagador: null, aviso_cumple_dias: null, grupos: [], horarios: [],
})

export default function AlumnosPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const [marcaFilter, setMarcaFilter] = useState<Marca | "">("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Alumno | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [formError, setFormError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<Alumno | null>(null)
  const [emailTarget, setEmailTarget] = useState<Alumno | null>(null)

  const { data: alumnosRaw, isLoading } = useQuery({
    queryKey: ["alumnos", search, marcaFilter],
    queryFn: () => alumnosApi.list({ search: search || undefined, marca: marcaFilter || undefined }).then(r => r.data),
  })
  const alumnos: Alumno[] = Array.isArray(alumnosRaw) ? alumnosRaw : []

  useEffect(() => {
    const openId = searchParams.get("openId")
    if (!openId || !alumnos.length) return
    const a = alumnos.find(x => x.id === Number(openId))
    if (a) openEdit(a)
    setSearchParams(params => { params.delete("openId"); return params }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnos, searchParams])

  const { data: pagadoresRaw } = useQuery({ queryKey: ["pagadores"], queryFn: () => pagadoresApi.list().then(r => r.data) })
  const pagadores: Pagador[] = Array.isArray(pagadoresRaw) ? pagadoresRaw : []

  const { data: gruposRaw } = useQuery({ queryKey: ["grupos"], queryFn: () => gruposApi.list().then(r => r.data) })
  const grupos: Grupo[] = Array.isArray(gruposRaw) ? gruposRaw : []

  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        nombre: f.nombre, fnac: f.fnac || null, telefono: f.telefono,
        email: f.email, notas: f.notas, pagador: f.pagador,
        marca: f.marca as Marca,
        aviso_cumple_dias: f.aviso_cumple_dias,
      }
      const res = editing
        ? await alumnosApi.update(editing.id, payload)
        : await alumnosApi.create(payload)
      for (const gid of f.grupos) {
        const horarios = f.horarios.filter(h => h.grupoId === gid)
        await alumnosApi.asignarGrupo(res.data.id, gid, horarios)
      }
      return res
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alumnos"] }); closeModal() },
    onError: () => setFormError("Error al guardar el alumno."),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => alumnosApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alumnos"] }); setConfirmDelete(null) },
  })

  function openNew() {
    setEditing(null); setForm(emptyForm()); setFormError(""); setShowModal(true)
  }

  function openEdit(a: Alumno) {
    setEditing(a)
    setForm({
      nombre: a.nombre, fnac: a.fnac ?? "", telefono: a.telefono ?? "",
      email: a.email ?? "", notas: a.notas ?? "",
      marca: a.marca,
      pagador: a.pagador ?? null, aviso_cumple_dias: a.aviso_cumple_dias ?? null,
      grupos: (a.grupos_detalle ?? []).map(g => g.grupo),
      horarios: (a.grupos_detalle ?? []).flatMap(g =>
        g.horarios.map(h => ({ ...h, grupoId: g.grupo }))
      ),
    })
    setFormError(""); setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditing(null); setForm(emptyForm()) }

  function toggleGrupo(gid: number) {
    setForm(f => {
      const grupos = f.grupos.includes(gid) ? f.grupos.filter(g => g !== gid) : [...f.grupos, gid]
      return { ...f, grupos, horarios: f.horarios.filter(h => grupos.includes(h.grupoId)) }
    })
  }

  function addHorario(gid: number) {
    const g = grupos.find(x => x.id === gid)
    const def = g?.horarios?.[0]
    setForm(f => ({
      ...f,
      horarios: [...f.horarios, { dia: def?.dia ?? 0, ini: def?.ini ?? "09:00", fin: def?.fin ?? "10:00", grupoId: gid }],
    }))
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
    if (!form.marca) { setFormError("Elige la marca/emisor antes de guardar."); return }
    setFormError("")
    saveMut.mutate(form)
  }

  const pagadorNombre = (id: number | null) => pagadores.find(p => p.id === id)?.nombre ?? null
  const pagadorObj    = (id: number | null) => pagadores.find(p => p.id === id) ?? null

  function waUrl(pagTel: string, pagNombre: string, alumnoNombre: string) {
    const clean = pagTel.replace(/[\s\-().]/g, "")
    const phone = clean.startsWith("+") ? clean : `+34${clean}`
    const text  = encodeURIComponent(`Hola ${pagNombre}, te escribo sobre ${alumnoNombre}`)
    return `https://wa.me/${phone}?text=${text}`
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Alumnos</h1>
          <p className="text-sm text-slate-500 mt-1">{alumnos.length} alumnos registrados</p>
        </div>
        <button onClick={openNew}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Nuevo alumno
        </button>
      </div>

      {/* Search + brand filter */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text" placeholder="Buscar por nombre, email o teléfono..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="inline-flex rounded-lg border overflow-hidden text-sm">
          {([
            ["", "Todas"],
            ["rangers_academy", "Rangers Academy"],
            ["cami_and_co", "Cami & Co"],
          ] as const).map(([value, label]) => (
            <button key={value} onClick={() => setMarcaFilter(value)}
              className={`px-3 py-2 ${marcaFilter === value ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}
      {!isLoading && !alumnos.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">🎓</span>
          <p className="text-sm">{search ? "Sin resultados para esa búsqueda." : "Sin alumnos. Crea el primero."}</p>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {alumnos.map(a => {
          const color = AVATAR_COLORS[a.id % AVATAR_COLORS.length]
          const yearsOld = age(a.fnac)
          const pag = pagadorNombre(a.pagador)
          const pagObj_ = pagadorObj(a.pagador)
          const gruposDetalle = a.grupos_detalle ?? []
          return (
            <div key={a.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4">
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${color}`}>
                {initials(a.nombre)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">{a.nombre}</span>
                  {yearsOld !== null && (
                    <span className="text-xs text-slate-400">{yearsOld} años</span>
                  )}
                  {a.fnac && (
                    <span className="text-xs text-slate-400">{new Date(a.fnac).toLocaleDateString("es-ES")}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {a.telefono && (
                    <a href={`tel:${a.telefono}`} className="text-xs text-slate-500 hover:text-blue-600">
                      📞 {a.telefono}
                    </a>
                  )}
                  {a.email && (
                    <a href={`mailto:${a.email}`} className="text-xs text-slate-500 hover:text-blue-600">
                      ✉ {a.email}
                    </a>
                  )}
                  {pag && (
                    <span className="text-xs text-slate-500">💳 {pag}</span>
                  )}
                </div>

                {a.notas && (
                  <p className="text-xs text-slate-400 mt-1 italic truncate max-w-md">{a.notas}</p>
                )}

                {/* Group badges */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {gruposDetalle.map(g => (
                    <span key={g.grupo} className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {g.grupo_nombre}
                      {g.horarios.length > 0 && (
                        <span className="font-normal text-blue-500">
                          · {g.horarios.map(h => DIAS[h.dia]?.slice(0, 3) + " " + h.ini).join(", ")}
                        </span>
                      )}
                    </span>
                  ))}
                  {!gruposDetalle.length && (
                    <span className="text-xs text-slate-400 italic">Sin grupo asignado</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 flex-shrink-0">
                {pagObj_?.telefono && (
                  <a
                    href={waUrl(pagObj_.telefono, pagObj_.nombre, a.nombre)}
                    target="_blank" rel="noreferrer"
                    className="px-3 py-1.5 border rounded-lg text-xs text-green-700 hover:bg-green-50 border-green-200">
                    WhatsApp
                  </a>
                )}
                {pagObj_?.email && (
                  <button onClick={() => setEmailTarget(a)}
                    className="px-3 py-1.5 border rounded-lg text-xs text-blue-700 hover:bg-blue-50 border-blue-200">
                    ✉ Email
                  </button>
                )}
                <button onClick={() => openEdit(a)}
                  className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 hover:bg-slate-50">
                  Editar
                </button>
                <button onClick={() => setConfirmDelete(a)}
                  className="px-3 py-1.5 border rounded-lg text-xs text-red-600 hover:bg-red-50">
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create / Edit modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-800">{editing ? "Editar alumno" : "Nuevo alumno"}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            {/* Modal body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {formError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{formError}</p>
              )}

              {/* Datos personales */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Datos personales</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre *</label>
                    <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Marca / Emisor *</label>
                    <select value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value as Marca }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Seleccionar...</option>
                      {MARCAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha de nacimiento</label>
                    <input type="date" value={form.fnac} onChange={e => setForm(f => ({ ...f, fnac: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Aviso cumpleaños (días antes)</label>
                    <input type="number" min="0" placeholder="14"
                      value={form.aviso_cumple_dias ?? ""}
                      onChange={e => setForm(f => ({ ...f, aviso_cumple_dias: e.target.value ? +e.target.value : null }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Teléfono</label>
                    <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Notas</label>
                    <textarea rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>
              </section>

              {/* Pagador */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Pagador</p>
                {!pagadores.length
                  ? <p className="text-xs text-amber-600">No hay pagadores. Crea uno en la sección Pagadores.</p>
                  : (
                    <select value={form.pagador ?? ""} onChange={e => setForm(f => ({ ...f, pagador: e.target.value ? +e.target.value : null }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Sin pagador asignado</option>
                      {pagadores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}{p.metodo ? ` · ${p.metodo}` : ""}</option>
                      ))}
                    </select>
                  )}
              </section>

              {/* Grupos y horarios */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Grupos y horarios</p>
                {!grupos.length
                  ? <p className="text-xs text-amber-600">No hay grupos. Crea uno en la sección Grupos primero.</p>
                  : (
                    <div className="space-y-2">
                      {grupos.map(g => {
                        const selected = form.grupos.includes(g.id)
                        const slots = form.horarios.filter(h => h.grupoId === g.id)
                        return (
                          <div key={g.id} className={`border rounded-lg p-3 transition-colors ${selected ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input type="checkbox" checked={selected} onChange={() => toggleGrupo(g.id)}
                                className="accent-blue-600 w-4 h-4" />
                              <span className="font-medium text-sm text-slate-800">{g.nombre}</span>
                              {g.nivel && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{g.nivel}</span>}
                              {g.tarifa > 0 && <span className="text-xs text-slate-500 ml-auto">{Number(g.tarifa).toFixed(2)} €/mes</span>}
                            </label>
                            {selected && (
                              <div className="mt-3 pl-6 space-y-2">
                                {slots.map((h, slotIdx) => {
                                  const realIdx = form.horarios.indexOf(h)
                                  return (
                                    <div key={slotIdx} className="flex items-center gap-2 flex-wrap">
                                      <select value={h.dia} onChange={e => updateHorario(realIdx, "dia", +e.target.value)}
                                        className="border rounded-lg px-2 py-1 text-xs focus:outline-none">
                                        {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                      </select>
                                      <input type="time" value={h.ini} onChange={e => updateHorario(realIdx, "ini", e.target.value)}
                                        className="border rounded-lg px-2 py-1 text-xs w-24 focus:outline-none" />
                                      <span className="text-xs text-slate-400">→</span>
                                      <input type="time" value={h.fin} onChange={e => updateHorario(realIdx, "fin", e.target.value)}
                                        className="border rounded-lg px-2 py-1 text-xs w-24 focus:outline-none" />
                                      <button onClick={() => setForm(f => ({ ...f, horarios: f.horarios.filter((_, i) => i !== realIdx) }))}
                                        className="text-red-400 hover:text-red-600 text-xs">✕</button>
                                    </div>
                                  )
                                })}
                                <button onClick={() => addHorario(g.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800">+ Añadir día</button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
              </section>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0">
              <button onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={saveMut.isPending}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                {saveMut.isPending ? "Guardando..." : editing ? "Guardar cambios" : "Crear alumno"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation modal */}
      {emailTarget && (
        <EmailModal
          to={pagadorObj(emailTarget.pagador)?.email ?? ""}
          onSend={(asunto, cuerpo) => alumnosApi.enviarEmail(emailTarget.id, asunto, cuerpo).then(() => {})}
          onClose={() => setEmailTarget(null)}
        />
      )}

      {confirmDelete && createPortal(
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-slate-800 mb-1">Eliminar alumno</h3>
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
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
