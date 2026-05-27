import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { alumnosApi } from "../alumnos_api"
import { pagadoresApi } from "@/features/pagadores/api"
import { gruposApi } from "@/features/grupos/api"
import type { Alumno } from "@/types"

const DIAS = ["Lunes","Martes","Miercoles","Jueves","Viernes","Sabado"]
const COLORS = ["bg-blue-500","bg-green-600","bg-rose-600","bg-amber-500","bg-purple-600","bg-teal-600","bg-pink-600","bg-indigo-600"]

function getInitials(name: string) {
  return name.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()
}

function calcEdad(fnac: string | null) {
  if (!fnac) return null
  const b = new Date(fnac), n = new Date()
  const age = n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0)
  return age
}

interface HorarioSlot { dia: number; ini: string; fin: string; grupoId?: number }

interface AlumnoFormData {
  nombre: string
  fnac: string
  telefono: string
  email: string
  notas: string
  pagador: number | null
  grupos: number[]
  horarios: HorarioSlot[]
  aviso_cumple_dias: number | null
}

const emptyForm: AlumnoFormData = {
  nombre: "", fnac: "", telefono: "", email: "", notas: "",
  pagador: null, grupos: [], horarios: [], aviso_cumple_dias: null
}

export default function AlumnosPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Alumno | null>(null)
  const [form, setForm] = useState<AlumnoFormData>(emptyForm)
  const [error, setError] = useState("")

  const { data: alumnosData, isLoading } = useQuery({
    queryKey: ["alumnos", search],
    queryFn: () => alumnosApi.list({ search: search || undefined }).then(r => r.data),
  })

  const { data: pagadoresData } = useQuery({
    queryKey: ["pagadores"],
    queryFn: () => pagadoresApi.list().then(r => r.data),
  })

  const { data: gruposData } = useQuery({
    queryKey: ["grupos"],
    queryFn: () => gruposApi.list().then(r => r.data),
  })

  const alumnos = Array.isArray(alumnosData) ? alumnosData : []
  const pagadores = Array.isArray(pagadoresData) ? pagadoresData : []
  const grupos = Array.isArray(gruposData) ? gruposData : []

  const saveMut = useMutation({
    mutationFn: (data: AlumnoFormData) => {
      const payload = {
        nombre: data.nombre, fnac: data.fnac || null, telefono: data.telefono,
        email: data.email, notas: data.notas, pagador: data.pagador,
        aviso_cumple_dias: data.aviso_cumple_dias,
      }
      return editing
        ? alumnosApi.update(editing.id, payload)
        : alumnosApi.create(payload)
    },
    onSuccess: async (res) => {
      const alumnoId = res.data.id
      // assign groups
      for (const gid of form.grupos) {
        const horarios = form.horarios.filter(h => h.grupoId === gid)
        await alumnosApi.asignarGrupo(alumnoId, gid, horarios)
      }
      qc.invalidateQueries({ queryKey: ["alumnos"] })
      closeModal()
    },
    onError: () => setError("Error al guardar el alumno"),
  })

  const deleteMut = useMutation({
    mutationFn: alumnosApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alumnos"] }),
  })

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setError("")
    setShowModal(true)
  }

  function openEdit(a: Alumno) {
    setEditing(a)
    const grupoIds = (a.grupos_detalle ?? []).map(g => g.grupo)
    const horarios: HorarioSlot[] = (a.grupos_detalle ?? []).flatMap(g =>
      g.horarios.map(h => ({ ...h, grupoId: g.grupo }))
    )
    setForm({
      nombre: a.nombre, fnac: a.fnac || "", telefono: a.telefono || "",
      email: a.email || "", notas: a.notas || "",
      pagador: a.pagador || null, grupos: grupoIds, horarios,
      aviso_cumple_dias: a.aviso_cumple_dias || null,
    })
    setError("")
    setShowModal(true)
  }

  function closeModal() { setShowModal(false); setEditing(null); setForm(emptyForm) }

  function setF(k: keyof AlumnoFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }))
    }
  }

  function toggleGrupo(gid: number) {
    setForm(f => {
      const grupos = f.grupos.includes(gid)
        ? f.grupos.filter(g => g !== gid)
        : [...f.grupos, gid]
      const horarios = f.horarios.filter(h => grupos.includes(h.grupoId!))
      return { ...f, grupos, horarios }
    })
  }

  function addHorario(gid: number) {
    const g = grupos.find(x => x.id === gid)
    const defH = g?.horarios?.[0]
    setForm(f => ({
      ...f,
      horarios: [...f.horarios, { dia: defH?.dia ?? 0, ini: defH?.ini ?? "09:00", fin: defH?.fin ?? "10:00", grupoId: gid }]
    }))
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

  const pagadorNombre = (id: number | null) => pagadores.find(p => p.id === id)?.nombre || null

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Alumnos</h1>
          <p className="text-sm text-slate-500 mt-1">{alumnos.length} alumnos registrados</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Nuevo alumno
        </button>
      </div>

      {/* Search */}
      <input type="text" placeholder="Buscar alumno..." value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-4 border rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />

      {/* List */}
      {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}

      {!isLoading && !alumnos.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">🎓</span>
          <p className="text-sm">{search ? "No se encontraron alumnos" : "Sin alumnos. Crea el primero."}</p>
        </div>
      )}

      <div className="space-y-3">
        {alumnos.map(a => {
          const color = COLORS[a.id % COLORS.length]
          const edad = calcEdad(a.fnac)
          const pag = pagadorNombre(a.pagador)
          return (
            <div key={a.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-start gap-3 flex-wrap">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${color}`}>
                {getInitials(a.nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">{a.nombre}
                  {edad !== null && <span className="ml-2 text-xs text-slate-400">{edad} años</span>}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {[a.telefono, a.email].filter(Boolean).join(" · ")}
                  {pag && <span className="ml-2">💳 {pag}</span>}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(a.grupos_detalle ?? []).map(g => (
                    <span key={g.grupo} className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {g.grupo_nombre}
                      {g.horarios.length > 0 && (
                        <span className="ml-1 font-normal opacity-70">
                          {g.horarios.map(h => DIAS[h.dia]?.slice(0,3) + " " + h.ini).join(", ")}
                        </span>
                      )}
                    </span>
                  ))}
                  {!(a.grupos_detalle ?? []).length && <span className="text-xs text-slate-400">Sin grupo</span>}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => openEdit(a)}
                  className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 hover:bg-slate-50">✏️ Editar</button>
                <button onClick={() => { if (confirm("Eliminar este alumno?")) deleteMut.mutate(a.id) }}
                  className="px-3 py-1.5 border rounded-lg text-xs text-red-600 hover:bg-red-50">✕</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-slate-800">{editing ? "Editar alumno" : "Nuevo alumno"}</h2>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

              {/* Datos personales */}
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Datos personales</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre *</label>
                  <input type="text" value={form.nombre} onChange={setF("nombre")}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha de nacimiento</label>
                  <input type="date" value={form.fnac} onChange={setF("fnac")}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Aviso cumpleanos (dias)</label>
                  <input type="number" value={form.aviso_cumple_dias || ""} onChange={e => setForm(f => ({ ...f, aviso_cumple_dias: e.target.value ? +e.target.value : null }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="14" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Telefono</label>
                  <input type="text" value={form.telefono} onChange={setF("telefono")}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={setF("email")}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Notas</label>
                  <textarea value={form.notas} onChange={setF("notas")} rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>

              {/* Pagador */}
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2 mb-1">Pagador</div>
              <select value={form.pagador || ""} onChange={e => setForm(f => ({ ...f, pagador: e.target.value ? +e.target.value : null }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sin pagador asignado</option>
                {pagadores.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.metodo ? ` · ${p.metodo}` : ""}</option>)}
              </select>
              {!pagadores.length && <p className="text-xs text-amber-600">No hay pagadores. Crea uno en la seccion Pagadores.</p>}

              {/* Grupos */}
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2 mb-1">Grupos y horarios</div>
              {!grupos.length && <p className="text-xs text-amber-600">No hay grupos. Crea uno en la seccion Grupos primero.</p>}
              <div className="space-y-3">
                {grupos.map(g => {
                  const selected = form.grupos.includes(g.id)
                  const horariosFiltrados = form.horarios.filter(h => h.grupoId === g.id)
                  return (
                    <div key={g.id} className={`border rounded-lg p-3 transition-colors ${selected ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selected} onChange={() => toggleGrupo(g.id)}
                          className="accent-blue-600 w-4 h-4" />
                        <span className="font-semibold text-sm">{g.nombre}</span>
                        {g.nivel && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{g.nivel}</span>}
                        {g.tarifa > 0 && <span className="text-xs text-slate-500">{Number(g.tarifa).toFixed(2)} €/mes</span>}
                      </label>
                      {selected && (
                        <div className="mt-2 pl-6 space-y-2">
                          {horariosFiltrados.map((h, idx) => {
                            const realIdx = form.horarios.indexOf(h)
                            return (
                              <div key={idx} className="flex items-center gap-2 flex-wrap">
                                <select value={h.dia} onChange={e => updateHorario(realIdx, "dia", +e.target.value)}
                                  className="border rounded px-2 py-1 text-xs">
                                  {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                </select>
                                <input type="time" value={h.ini} onChange={e => updateHorario(realIdx, "ini", e.target.value)}
                                  className="border rounded px-2 py-1 text-xs w-24" />
                                <span className="text-xs text-slate-400">a</span>
                                <input type="time" value={h.fin} onChange={e => updateHorario(realIdx, "fin", e.target.value)}
                                  className="border rounded px-2 py-1 text-xs w-24" />
                                <button onClick={() => removeHorario(realIdx)}
                                  className="text-red-500 text-xs hover:text-red-700">✕</button>
                              </div>
                            )
                          })}
                          <button onClick={() => addHorario(g.id)}
                            className="text-xs text-blue-600 hover:text-blue-800">+ Añadir dia</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">Cancelar</button>
              <button onClick={handleSubmit} disabled={saveMut.isPending}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                {saveMut.isPending ? "Guardando..." : "Guardar alumno"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
