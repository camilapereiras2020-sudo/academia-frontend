import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { asistenciaApi } from "../api"
import { gruposApi } from "@/features/grupos/api"
import { grupoLabel } from "@/features/grupos/palette"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import type { Grupo, Alumno, Sesion, Marca } from "@/types"

const ESTADO_LABELS: Record<string, string> = { present: "✓ Presente", absent: "✗ Ausente", makeup: "↻ Recuperacion", guest: "★ Invitado", other: "? Otro" }
const ESTADO_COLORS: Record<string, string> = { present: "bg-green-100 text-green-800", absent: "bg-red-100 text-red-800", makeup: "bg-khaki-200 text-brass-700", guest: "bg-purple-100 text-purple-800", other: "bg-amber-100 text-amber-800" }

// Duplicado a propósito, mismo criterio que el resto del código (Horario,
// AlumnoDetail, etc. definen su propio BRAND_META/initials en vez de
// importarlos) — no hay un módulo compartido para esto todavía.
const BRAND_META: Record<Marca, { tag: string; bg: string; text: string }> = {
  rangers_academy: { tag: "RA", bg: "#3F5242", text: "#F6F1E7" },
  cami_and_co: { tag: "C&Co", bg: "#1E3A5F", text: "#F6F1E7" },
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

// 0=Monday..6=Sunday, matching Grupo.horarios.dia (0-5, Mon-Sat; no Sunday
// classes) — mismo criterio que dow() en CalendarioPage.tsx.
function diaSemana(fecha: string) {
  return (new Date(fecha + "T00:00:00").getDay() + 6) % 7
}

function nowHHMM() {
  return new Date().toTimeString().slice(0, 5)
}

// Local calendar date as YYYY-MM-DD. Date().toISOString() converts to UTC
// first, which rolls over to the wrong day near midnight in timezones ahead
// of UTC — this stays on the browser's local date instead.
function todayLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const OTRO_OPCIONES: { value: "makeup" | "guest" | "other"; label: string }[] = [
  { value: "makeup", label: "Recupera otro día" },
  { value: "guest", label: "Invitado / Traslado" },
  { value: "other", label: "Otro" },
]

function DiaTab() {
  const qc = useQueryClient()
  const today = todayLocal()
  const [fecha, setFecha] = useState(today)
  const [notaOpenFor, setNotaOpenFor] = useState<string | null>(null) // `${grupoId}-${alumnoId}`
  const [notaDraft, setNotaDraft] = useState<{ estado: "makeup" | "guest" | "other"; nota: string }>({ estado: "makeup", nota: "" })

  const { data: gruposRaw } = useQuery({ queryKey: ["grupos"], queryFn: () => gruposApi.list().then(r => r.data) })
  const grupos: Grupo[] = Array.isArray(gruposRaw) ? gruposRaw : (gruposRaw as any)?.results || []

  const { data: alumnosRaw } = useQuery({ queryKey: ["alumnos"], queryFn: () => alumnosApi.list().then(r => r.data) })
  const allAlumnos: Alumno[] = Array.isArray(alumnosRaw) ? alumnosRaw : (alumnosRaw as any)?.results || []

  const { data: sesionesRaw } = useQuery({
    queryKey: ["sesiones-dia", fecha],
    queryFn: () => asistenciaApi.list({ fecha }).then(r => r.data),
  })
  const sesiones: Sesion[] = Array.isArray(sesionesRaw) ? sesionesRaw : (sesionesRaw as any)?.results || []

  const dia = diaSemana(fecha)
  const clasesHoy = useMemo(() =>
    grupos
      .flatMap(g => g.horarios.filter(h => h.dia === dia).map(h => ({ grupo: g, horario: h })))
      .sort((a, b) => a.horario.ini.localeCompare(b.horario.ini)),
    [grupos, dia]
  )

  const marcarMut = useMutation({
    mutationFn: (vars: { grupo: number; alumno: number; estado: string; nota?: string }) =>
      asistenciaApi.marcar({ ...vars, fecha }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sesiones-dia", fecha] }),
  })

  const isToday = fecha === today
  const nowStr = nowHHMM()

  function shiftDay(delta: number) {
    const d = new Date(fecha + "T00:00:00")
    d.setDate(d.getDate() + delta)
    setFecha(todayLocal(d))
  }

  function registroFor(grupoId: number, alumnoId: number) {
    return sesiones.find(s => s.grupo === grupoId)?.registros.find(r => r.alumno === alumnoId)
  }

  function marcarRapido(grupoId: number, alumnoId: number, estado: "present" | "absent") {
    marcarMut.mutate({ grupo: grupoId, alumno: alumnoId, estado, nota: "" })
  }

  function abrirNota(grupoId: number, alumnoId: number) {
    const key = `${grupoId}-${alumnoId}`
    const actual = registroFor(grupoId, alumnoId)
    setNotaDraft({
      estado: (actual && actual.estado !== "present" && actual.estado !== "absent" ? actual.estado : "makeup") as "makeup" | "guest" | "other",
      nota: actual?.nota ?? "",
    })
    setNotaOpenFor(notaOpenFor === key ? null : key)
  }

  function guardarNota(grupoId: number, alumnoId: number) {
    marcarMut.mutate({ grupo: grupoId, alumno: alumnoId, estado: notaDraft.estado, nota: notaDraft.nota })
    setNotaOpenFor(null)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button onClick={() => setFecha(today)}
          className="px-3 py-1.5 rounded-lg border border-khaki-300 text-sm font-medium text-pine-700 hover:bg-khaki-100">
          Hoy
        </button>
        <button onClick={() => shiftDay(-1)} aria-label="Día anterior"
          className="w-8 h-8 rounded-lg border border-khaki-300 text-pine-700 hover:bg-khaki-100">‹</button>
        <span className="font-head font-normal text-lg text-pine-900 min-w-[220px] text-center capitalize">
          {new Date(fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
        </span>
        <button onClick={() => shiftDay(1)} aria-label="Día siguiente"
          className="w-8 h-8 rounded-lg border border-khaki-300 text-pine-700 hover:bg-khaki-100">›</button>
      </div>

      {clasesHoy.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-khaki-400">
          <span className="text-5xl mb-3">📋</span>
          <p className="text-sm">Sin clases programadas este día.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clasesHoy.map(({ grupo, horario }, i) => {
            const roster = allAlumnos.filter(a => (a.grupos_detalle ?? []).some(gd => gd.grupo === grupo.id))
            const activa = isToday && nowStr >= horario.ini && nowStr < horario.fin
            return (
              <div key={`${grupo.id}-${i}`}
                className={`bg-white rounded-xl border overflow-hidden ${activa ? "border-brass-500 ring-2 ring-brass-200" : "border-khaki-300"}`}>
                <div className="px-4 py-3 border-b bg-khaki-50">
                  <p className="font-head font-normal text-base text-pine-900 flex items-center gap-2 flex-wrap">
                    {grupo.nombre}
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: BRAND_META[grupo.marca].bg, color: BRAND_META[grupo.marca].text }}>
                      {BRAND_META[grupo.marca].tag}
                    </span>
                    {activa && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brass-500 text-white">AHORA</span>}
                  </p>
                  <p className="text-xs text-pine-600 mt-0.5">
                    {grupo.profesor_nombre ? `Prof. ${grupo.profesor_nombre} · ` : ""}{horario.ini}–{horario.fin}
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  {roster.length === 0 ? (
                    <p className="text-xs text-pine-500 italic px-1">Sin alumnos en esta clase.</p>
                  ) : roster.map(a => {
                    const reg = registroFor(grupo.id, a.id)
                    const key = `${grupo.id}-${a.id}`
                    const notaAbierta = notaOpenFor === key
                    const esEspecial = !!reg && reg.estado !== "present" && reg.estado !== "absent"
                    return (
                      <div key={a.id} className="bg-khaki-100 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-brass-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                              {initials(a.nombre)}
                            </span>
                            <span className="truncate">{a.nombre}</span>
                          </span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => marcarRapido(grupo.id, a.id, "present")} title="Presente"
                              className={`w-7 h-7 rounded-full text-xs font-bold ${reg?.estado === "present" ? "bg-green-500 text-white" : "bg-white border border-khaki-300 text-pine-600 hover:bg-green-100"}`}>
                              ✓
                            </button>
                            <button onClick={() => marcarRapido(grupo.id, a.id, "absent")} title="Ausente"
                              className={`w-7 h-7 rounded-full text-xs font-bold ${reg?.estado === "absent" ? "bg-red-500 text-white" : "bg-white border border-khaki-300 text-pine-600 hover:bg-red-100"}`}>
                              ✗
                            </button>
                            <button onClick={() => abrirNota(grupo.id, a.id)} title="Caso especial / comentario"
                              className={`w-7 h-7 rounded-full text-xs font-bold ${esEspecial ? "bg-amber-500 text-white" : "bg-white border border-khaki-300 text-pine-600 hover:bg-amber-100"}`}>
                              ?
                            </button>
                          </span>
                        </div>
                        {esEspecial && !notaAbierta && (
                          <p className="text-[11px] text-pine-600 mt-1 pl-7">
                            {ESTADO_LABELS[reg!.estado]}{reg!.nota ? ` — ${reg!.nota}` : ""}
                          </p>
                        )}
                        {notaAbierta && (
                          <div className="mt-2 pl-7 space-y-1.5">
                            <select value={notaDraft.estado}
                              onChange={e => setNotaDraft(prev => ({ ...prev, estado: e.target.value as "makeup" | "guest" | "other" }))}
                              className="text-xs border border-khaki-300 rounded px-2 py-1 w-full">
                              {OTRO_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <textarea value={notaDraft.nota} placeholder="Comentario (opcional)..." rows={2}
                              onChange={e => setNotaDraft(prev => ({ ...prev, nota: e.target.value }))}
                              className="text-xs border border-khaki-300 rounded px-2 py-1 w-full resize-none" />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setNotaOpenFor(null)} className="text-[11px] text-pine-600 px-2 py-1">Cancelar</button>
                              <button onClick={() => guardarNota(grupo.id, a.id)} disabled={marcarMut.isPending}
                                className="text-[11px] font-semibold text-white bg-brass-500 hover:bg-brass-700 rounded px-2 py-1 disabled:opacity-50">
                                Guardar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function HistorialTab() {
  const qc = useQueryClient()
  const [grupoId, setGrupoId] = useState<number | "">("")
  const [fecha, setFecha] = useState(todayLocal())
  const [showForm, setShowForm] = useState(false)
  const [registros, setRegistros] = useState<{ alumno: number; estado: string; nota: string }[]>([])
  const [saveError, setSaveError] = useState("")

  const { data: gruposRaw } = useQuery({ queryKey: ["grupos"], queryFn: () => gruposApi.list().then(r => r.data) })
  const grupos: Grupo[] = Array.isArray(gruposRaw) ? gruposRaw : (gruposRaw as any)?.results || []

  const { data: alumnosRaw } = useQuery({ queryKey: ["alumnos"], queryFn: () => alumnosApi.list().then(r => r.data) })
  const allAlumnos: Alumno[] = Array.isArray(alumnosRaw) ? alumnosRaw : (alumnosRaw as any)?.results || []

  const mes = fecha.slice(0, 7)
  const { data: sesionesRaw } = useQuery({
    queryKey: ["sesiones", grupoId, mes],
    queryFn: () => asistenciaApi.list({ grupo: grupoId as number, mes }).then(r => r.data),
    enabled: !!grupoId,
  })
  const sesiones: Sesion[] = Array.isArray(sesionesRaw) ? sesionesRaw : (sesionesRaw as any)?.results || []

  const grupoAlumnos = allAlumnos.filter(a => (a.grupos_detalle ?? []).some(g => g.grupo === grupoId))

  function startNewSession() {
    setRegistros(grupoAlumnos.map(a => ({ alumno: a.id, estado: "present", nota: "" })))
    setShowForm(true)
  }

  const saveMut = useMutation({
    mutationFn: () => asistenciaApi.create({
      grupo: grupoId as number,
      fecha,
      registros: registros.map(r => ({ alumno: r.alumno, estado: r.estado, nota: r.nota })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sesiones"] })
      setShowForm(false)
      setSaveError("")
    },
    onError: (err: any) => setSaveError(err.response?.data?.error ?? "Error al guardar la asistencia."),
  })

  function toggleEstado(idx: number) {
    const order = ["present", "absent", "makeup", "guest", "other"]
    setRegistros(prev => {
      const n = [...prev]
      const cur = order.indexOf(n[idx].estado)
      n[idx] = { ...n[idx], estado: order[(cur + 1) % order.length] }
      return n
    })
  }

  return (
    <div>
      <div className="flex gap-3 mb-6 flex-wrap items-end">
        <div>
          <label className="block text-xs font-semibold text-pine-700 mb-1">Grupo</label>
          <select value={grupoId} onChange={e => { setGrupoId(+e.target.value); setShowForm(false) }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
            <option value="">Seleccionar grupo...</option>
            {grupos.map(g => <option key={g.id} value={g.id}>{grupoLabel(g)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-pine-700 mb-1">Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
        </div>
        {grupoId && !showForm && (
          <button onClick={startNewSession} className="bg-brass-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brass-700">
            + Pasar lista
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold text-pine-900 mb-4">Pasar lista — {fecha}</h2>
          {!grupoAlumnos.length && <p className="text-pine-600 text-sm">No hay alumnos en este grupo.</p>}
          <div className="space-y-2">
            {registros.map((r, idx) => {
              const alumno = allAlumnos.find(a => a.id === r.alumno)
              return (
                <div key={r.alumno} className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-sm w-48">{alumno?.nombre}</span>
                  <button onClick={() => toggleEstado(idx)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full min-w-[120px] text-center ${ESTADO_COLORS[r.estado]}`}>
                    {ESTADO_LABELS[r.estado]}
                  </button>
                  <input type="text" placeholder="Nota..." value={r.nota}
                    onChange={e => { const n = [...registros]; n[idx] = { ...n[idx], nota: e.target.value }; setRegistros(n) }}
                    className="border rounded px-2 py-1 text-xs flex-1 min-w-[150px]" />
                </div>
              )
            })}
          </div>
          {saveError && <p className="text-red-600 text-xs mt-3">{saveError}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setShowForm(false); setSaveError("") }} className="px-4 py-2 rounded-lg bg-khaki-100 text-pine-700 text-sm">Cancelar</button>
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
              className="px-4 py-2 rounded-lg bg-brass-500 text-white text-sm hover:bg-brass-700 disabled:opacity-50">
              {saveMut.isPending ? "Guardando..." : "Guardar asistencia"}
            </button>
          </div>
        </div>
      )}

      {grupoId && !showForm && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-pine-900">
              Historial — {(() => { const g = grupos.find(g => g.id === grupoId); return g ? grupoLabel(g) : "" })()}
            </h2>
          </div>
          {!sesiones.length && <p className="p-6 text-pine-600 text-sm">Sin sesiones este mes.</p>}
          {sesiones.map(s => (
            <div key={s.id} className="border-b last:border-b-0 px-6 py-3">
              <p className="text-sm font-semibold text-pine-700">{s.fecha} {s.hora && `— ${s.hora}`}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {(s.registros ?? []).map(r => (
                  <span key={r.id} className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[r.estado]}`}>
                    {r.alumno_nombre}: {ESTADO_LABELS[r.estado]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!grupoId && (
        <div className="flex flex-col items-center justify-center py-16 text-khaki-400">
          <span className="text-5xl mb-3">📋</span><p className="text-sm">Selecciona un grupo para ver o registrar asistencia.</p>
        </div>
      )}
    </div>
  )
}

export default function AsistenciaPage() {
  const [tab, setTab] = useState<"dia" | "historial">("dia")
  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-serif font-light text-[2.5rem] leading-none tracking-[-0.01em] text-pine-900">Asistencia</h1>
        <div className="flex gap-1 bg-khaki-100 rounded-lg p-1">
          <button onClick={() => setTab("dia")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === "dia" ? "bg-white shadow-sm text-pine-900" : "text-pine-600"}`}>
            Hoy
          </button>
          <button onClick={() => setTab("historial")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === "historial" ? "bg-white shadow-sm text-pine-900" : "text-pine-600"}`}>
            Historial
          </button>
        </div>
      </div>
      {tab === "dia" ? <DiaTab /> : <HistorialTab />}
    </div>
  )
}
