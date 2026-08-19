import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { gruposApi } from "../api"
import { asistenciaApi } from "@/features/asistencia/api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { tareasApi, notasDificultadApi } from "@/features/clases/api"
import { DIAS, PALETTE } from "../palette"
import type { Alumno, Sesion, Tarea, NotaDificultad } from "@/types"
import { useAuthStore } from "@/store/authStore"

const ESTADO_TAREA_LABELS: Record<string, string> = {
  pendiente: "Pendiente", completada: "Completada", parcial: "Parcial", no_entregada: "No entregada",
}
const ESTADO_TAREA_COLORS: Record<string, string> = {
  pendiente: "bg-khaki-200 text-pine-700", completada: "bg-green-100 text-green-800",
  parcial: "bg-yellow-100 text-yellow-800", no_entregada: "bg-red-100 text-red-800",
}
const ESTADO_TAREA_ORDER = ["pendiente", "completada", "parcial", "no_entregada"]

export default function GrupoDetailPage() {
  const isReception = useAuthStore((s) => s.user?.role === "reception")
  const { id } = useParams()
  const grupoId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  // lesson log form state
  const [sesionFecha, setSesionFecha] = useState(new Date().toISOString().slice(0, 10))
  const [sesionContenido, setSesionContenido] = useState("")
  const [sesionError, setSesionError] = useState("")

  // homework form state
  const [showTareaForm, setShowTareaForm] = useState(false)
  const [tareaForm, setTareaForm] = useState({ titulo: "", descripcion: "", fecha_asignada: new Date().toISOString().slice(0, 10), fecha_entrega: "" })
  const [tareaCompletados, setTareaCompletados] = useState<{ alumno: number; estado: string; nota: string }[]>([])
  const [tareaError, setTareaError] = useState("")

  // struggle tracker form state
  const [notaForm, setNotaForm] = useState({ alumno: "", tema: "", nota: "", fecha: new Date().toISOString().slice(0, 10) })
  const [notaError, setNotaError] = useState("")

  const { data: grupo, isLoading: loadingGrupo } = useQuery({
    queryKey: ["grupo", grupoId],
    queryFn: () => gruposApi.get(grupoId).then(r => r.data),
    enabled: !!grupoId,
  })

  const { data: alumnosRaw } = useQuery({
    queryKey: ["alumnos", "grupo", grupoId],
    queryFn: () => alumnosApi.list({ grupo: grupoId }).then(r => r.data),
    enabled: !!grupoId,
  })
  const roster: Alumno[] = Array.isArray(alumnosRaw) ? alumnosRaw : []

  const { data: sesionesRaw } = useQuery({
    queryKey: ["sesiones", "grupo", grupoId],
    queryFn: () => asistenciaApi.list({ grupo: grupoId }).then(r => r.data),
    enabled: !!grupoId && !isReception,
  })
  const sesiones: Sesion[] = Array.isArray(sesionesRaw) ? sesionesRaw : []

  const { data: tareasRaw } = useQuery({
    queryKey: ["tareas", "grupo", grupoId],
    queryFn: () => tareasApi.list({ grupo: grupoId }).then(r => r.data),
    enabled: !!grupoId && !isReception,
  })
  const tareas: Tarea[] = Array.isArray(tareasRaw) ? tareasRaw : []

  const { data: notasRaw } = useQuery({
    queryKey: ["notas-dificultad", "grupo", grupoId],
    queryFn: () => notasDificultadApi.list({ grupo: grupoId }).then(r => r.data),
    enabled: !!grupoId && !isReception,
  })
  const notas: NotaDificultad[] = Array.isArray(notasRaw) ? notasRaw : []

  const sesionMut = useMutation({
    mutationFn: () => asistenciaApi.create({ grupo: grupoId, fecha: sesionFecha, contenido: sesionContenido, registros: [] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sesiones", "grupo", grupoId] })
      setSesionContenido("")
      setSesionError("")
    },
    onError: () => setSesionError("Error al guardar el registro de clase."),
  })

  const tareaMut = useMutation({
    mutationFn: () => tareasApi.create({ grupo: grupoId, ...tareaForm, completados: tareaCompletados }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tareas", "grupo", grupoId] })
      setShowTareaForm(false)
      setTareaError("")
    },
    onError: () => setTareaError("Error al guardar la tarea."),
  })

  const notaMut = useMutation({
    mutationFn: () => notasDificultadApi.create({ grupo: grupoId, ...notaForm, alumno: Number(notaForm.alumno) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notas-dificultad", "grupo", grupoId] })
      setNotaForm({ alumno: "", tema: "", nota: "", fecha: new Date().toISOString().slice(0, 10) })
      setNotaError("")
    },
    onError: () => setNotaError("Error al guardar la nota."),
  })

  function handleAddSesion() {
    if (!sesionContenido.trim()) { setSesionError("Describe lo que se cubrió en la clase."); return }
    setSesionError("")
    sesionMut.mutate()
  }

  function openTareaForm() {
    setTareaForm({ titulo: "", descripcion: "", fecha_asignada: new Date().toISOString().slice(0, 10), fecha_entrega: "" })
    setTareaCompletados(roster.map(a => ({ alumno: a.id, estado: "pendiente", nota: "" })))
    setTareaError("")
    setShowTareaForm(true)
  }

  function toggleTareaEstado(idx: number) {
    setTareaCompletados(prev => {
      const n = [...prev]
      const cur = ESTADO_TAREA_ORDER.indexOf(n[idx].estado)
      n[idx] = { ...n[idx], estado: ESTADO_TAREA_ORDER[(cur + 1) % ESTADO_TAREA_ORDER.length] }
      return n
    })
  }

  function handleSaveTarea() {
    if (!tareaForm.titulo.trim() || !tareaForm.fecha_asignada || !tareaForm.fecha_entrega) {
      setTareaError("Título, fecha asignada y fecha de entrega son obligatorios.")
      return
    }
    setTareaError("")
    tareaMut.mutate()
  }

  function handleAddNota() {
    if (!notaForm.alumno || !notaForm.tema.trim() || !notaForm.nota.trim()) {
      setNotaError("Alumno, tema y nota son obligatorios.")
      return
    }
    setNotaError("")
    notaMut.mutate()
  }

  if (loadingGrupo) return <p className="text-pine-300 text-sm">Cargando...</p>
  if (!grupo) return <p className="text-pine-700 text-sm">Grupo no encontrado.</p>

  const c = PALETTE[grupo.color_idx % PALETTE.length]
  const horarios = grupo.horarios ?? []

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <button onClick={() => navigate("/grupos")} className="text-sm text-pine-800 hover:text-pine-800 mb-3">
        ← Volver a grupos
      </button>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6">
        <div className="flex items-stretch">
          <div className="w-1.5 flex-shrink-0" style={{ background: c.accent }} />
          <div className="flex-1 p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-head font-normal text-2xl text-pine-900">{grupo.nombre}</h1>
              {grupo.nivel && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                  {grupo.nivel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap mt-2 text-sm text-pine-800">
              <span>👥 {grupo.alumnos_count} alumnos</span>
              {grupo.aula && <span>📍 {grupo.aula}</span>}
              {grupo.profesor && <span>🧑‍🏫 {grupo.profesor}</span>}
              {grupo.tarifa > 0 && <span className="font-semibold text-pine-700">{Number(grupo.tarifa).toFixed(2)} €/mes</span>}
            </div>
          </div>
        </div>

        {/* Horario */}
        <div className="border-t px-5 py-4" style={{ background: c.bg }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: c.text }}>Horario</p>
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
      </div>

      {/* Roster */}
      <section className="bg-white rounded-xl border shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-pine-900 mb-3">Alumnos</h2>
        {!roster.length && <p className="text-pine-700 text-sm">Sin alumnos asignados.</p>}
        <div className="flex flex-wrap gap-2">
          {roster.map(a => (
            <Link key={a.id} to={`/alumnos?openId=${a.id}`}
              className="text-sm px-3 py-1.5 rounded-lg border hover:bg-khaki-100 text-pine-800">
              {a.nombre}
            </Link>
          ))}
        </div>
      </section>

      {/* Lesson log (asistencia) — out of reception's scope */}
      {!isReception && (
      <section className="bg-white rounded-xl border shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-pine-900 mb-3">Registro de clases</h2>
        {sesionError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-2 rounded-lg mb-3">{sesionError}</p>}
        <div className="flex gap-2 flex-wrap items-end mb-4">
          <div>
            <label className="block text-xs font-semibold text-pine-800 mb-1">Fecha</label>
            <input type="date" value={sesionFecha} onChange={e => setSesionFecha(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-pine-800 mb-1">Qué se cubrió</label>
            <input type="text" value={sesionContenido} placeholder="Present perfect, unidad 4…"
              onChange={e => setSesionContenido(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
          </div>
          <button onClick={handleAddSesion} disabled={sesionMut.isPending}
            className="px-4 py-2 rounded-lg bg-brass-500 text-white text-sm hover:bg-brass-700 disabled:opacity-50">
            {sesionMut.isPending ? "Guardando..." : "Añadir"}
          </button>
        </div>
        {!sesiones.length && <p className="text-pine-700 text-sm">Sin clases registradas.</p>}
        <div className="space-y-2">
          {sesiones.map(s => (
            <div key={s.id} className="border rounded-lg px-4 py-2.5">
              <p className="text-sm font-semibold text-pine-800">{s.fecha}</p>
              {s.contenido ? (
                <p className="text-sm text-pine-700 mt-0.5">{s.contenido}</p>
              ) : (
                <p className="text-xs text-pine-700 italic mt-0.5">Sin contenido registrado.</p>
              )}
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Homework tracker — out of reception's scope */}
      {!isReception && (
      <section className="bg-white rounded-xl border shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-pine-900">Tareas</h2>
          {!showTareaForm && (
            <button onClick={openTareaForm} className="text-sm text-brass-700 hover:text-brass-700">+ Nueva tarea</button>
          )}
        </div>

        {showTareaForm && (
          <div className="border rounded-lg p-4 mb-4 bg-khaki-100">
            {tareaError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-2 rounded-lg mb-3">{tareaError}</p>}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-pine-800 mb-1">Título *</label>
                <input type="text" value={tareaForm.titulo}
                  onChange={e => setTareaForm(f => ({ ...f, titulo: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-pine-800 mb-1">Descripción</label>
                <textarea rows={2} value={tareaForm.descripcion}
                  onChange={e => setTareaForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brass-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-pine-800 mb-1">Fecha asignada</label>
                <input type="date" value={tareaForm.fecha_asignada}
                  onChange={e => setTareaForm(f => ({ ...f, fecha_asignada: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-pine-800 mb-1">Fecha entrega *</label>
                <input type="date" value={tareaForm.fecha_entrega}
                  onChange={e => setTareaForm(f => ({ ...f, fecha_entrega: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
              </div>
            </div>

            {!roster.length && <p className="text-pine-700 text-sm mb-3">Sin alumnos en este grupo.</p>}
            <div className="space-y-2 mb-4">
              {tareaCompletados.map((tc, idx) => {
                const alumno = roster.find(a => a.id === tc.alumno)
                return (
                  <div key={tc.alumno} className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-sm w-48">{alumno?.nombre}</span>
                    <button onClick={() => toggleTareaEstado(idx)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full min-w-[110px] text-center ${ESTADO_TAREA_COLORS[tc.estado]}`}>
                      {ESTADO_TAREA_LABELS[tc.estado]}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowTareaForm(false)} className="px-4 py-2 rounded-lg bg-khaki-200 text-pine-800 text-sm">Cancelar</button>
              <button onClick={handleSaveTarea} disabled={tareaMut.isPending}
                className="px-4 py-2 rounded-lg bg-brass-500 text-white text-sm hover:bg-brass-700 disabled:opacity-50">
                {tareaMut.isPending ? "Guardando..." : "Guardar tarea"}
              </button>
            </div>
          </div>
        )}

        {!tareas.length && <p className="text-pine-700 text-sm">Sin tareas asignadas.</p>}
        <div className="space-y-2">
          {tareas.map(t => (
            <div key={t.id} className="border rounded-lg px-4 py-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-semibold text-pine-800">{t.titulo}</p>
                <span className="text-xs text-pine-800">Entrega: {t.fecha_entrega}</span>
              </div>
              {t.descripcion && <p className="text-sm text-pine-700 mt-0.5">{t.descripcion}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {t.completados.map(c2 => (
                  <span key={c2.id} className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_TAREA_COLORS[c2.estado]}`}>
                    {c2.alumno_nombre}: {ESTADO_TAREA_LABELS[c2.estado]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Struggle tracker — out of reception's scope */}
      {!isReception && (
      <section className="bg-white rounded-xl border shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-pine-900 mb-3">Seguimiento de dificultades</h2>
        {notaError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-2 rounded-lg mb-3">{notaError}</p>}
        <div className="space-y-2 mb-4">
          <select value={notaForm.alumno} onChange={e => setNotaForm(f => ({ ...f, alumno: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
            <option value="">Selecciona un alumno…</option>
            {roster.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <input type="text" placeholder="Tema (ej: Present perfect)" value={notaForm.tema}
            onChange={e => setNotaForm(f => ({ ...f, tema: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
          <textarea rows={2} placeholder="Qué está costando…" value={notaForm.nota}
            onChange={e => setNotaForm(f => ({ ...f, nota: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brass-500" />
          <input type="date" value={notaForm.fecha}
            onChange={e => setNotaForm(f => ({ ...f, fecha: e.target.value }))}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
          <button onClick={handleAddNota} disabled={notaMut.isPending}
            className="w-full px-4 py-2 rounded-lg bg-brass-500 text-white text-sm hover:bg-brass-700 disabled:opacity-50">
            {notaMut.isPending ? "Guardando..." : "Registrar"}
          </button>
        </div>

        {!notas.length && <p className="text-pine-700 text-sm">Sin dificultades registradas.</p>}
        <div className="space-y-2">
          {notas.map(n => (
            <div key={n.id} className="bg-khaki-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-semibold text-pine-800">{n.alumno_nombre} — {n.tema}</span>
                <span className="text-xs text-pine-700">{n.fecha}</span>
              </div>
              <p className="text-sm text-pine-700">{n.nota}</p>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Placeholders */}
      <section className="border-2 border-dashed rounded-xl p-5 mb-4 text-center text-pine-700">
        <p className="text-sm font-semibold">Materiales</p>
        <p className="text-xs mt-1">Próximamente: sube archivos y materiales de clase.</p>
      </section>
      <section className="border-2 border-dashed rounded-xl p-5 mb-6 text-center text-pine-700">
        <p className="text-sm font-semibold">Programa / Syllabus</p>
        <p className="text-xs mt-1">Próximamente: seguimiento del programa del curso.</p>
      </section>
    </div>
  )
}
