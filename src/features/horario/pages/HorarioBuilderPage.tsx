import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin, { Draggable } from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"
import type { EventContentArg } from "@fullcalendar/core"
import { gruposApi } from "@/features/grupos/api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { profesoresApi } from "@/features/profesores/api"
import { PALETTE } from "@/features/grupos/palette"
import { useSetActiveBrand } from "@/store/useSetActiveBrand"
import type { Alumno, Grupo, Marca, Profesor } from "@/types"

const MAX_PER_CLASS = 6
const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const SIN_PROFESOR_COLOR = { bg: "#e7e3d8", text: "#57534e", border: "#d6d0bf", accent: "#a8a29e" }

const BRAND_META: Record<Marca, { label: string; tag: string; bg: string; text: string; dot: string }> = {
  rangers_academy: { label: "Rangers Academy", tag: "RA", bg: "#3F5242", text: "#F6F1E7", dot: "#3F5242" },
  cami_and_co: { label: "Cami & Co", tag: "C&Co", bg: "#1E3A5F", text: "#F6F1E7", dot: "#1E3A5F" },
}
const MARCAS: { value: Marca; label: string }[] = [
  { value: "rangers_academy", label: "Rangers Academy" },
  { value: "cami_and_co", label: "Cami & Co" },
]

interface CalEvent {
  id: string
  title: string
  daysOfWeek: number[]
  startTime: string
  endTime: string
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: {
    grupoId: number; roster: Alumno[]; profesorNombre: string | null; aula: string; marca: Marca
    dirty: boolean
  }
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

function age(fnac: string | null) {
  if (!fnac) return null
  const b = new Date(fnac), now = new Date()
  return now.getFullYear() - b.getFullYear() -
    (now < new Date(now.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0)
}

type AgeGroup = "kids" | "teens" | "adults" | "sinEdad"
const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  kids: "Kids (hasta 12)", teens: "Teens (13–17)", adults: "Adultos (18+)", sinEdad: "Sin edad registrada",
}
const AGE_GROUP_ORDER: AgeGroup[] = ["kids", "teens", "adults", "sinEdad"]

function ageGroupOf(a: Alumno): AgeGroup {
  if (a.es_adulto) return "adults"
  const yrs = age(a.fnac)
  if (yrs == null) return "sinEdad"
  if (yrs < 13) return "kids"
  if (yrs < 18) return "teens"
  return "adults"
}

function committedGrupoOf(a: Alumno): number | null {
  return a.grupos_detalle?.[0]?.grupo ?? null
}

export default function HorarioBuilderPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [marcaFilter, setMarcaFilter] = useState<Marca | "">("")
  const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null)
  const [toast, setToast] = useState("")
  // Placements staged locally, not yet saved — lets you try out arrangements
  // (drag students in and out repeatedly) without committing on every move.
  // Keyed by alumnoId -> target grupoId (null = unassign).
  const [draft, setDraft] = useState<Map<number, number | null>>(new Map())
  const [saving, setSaving] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const drawerRosterRef = useRef<HTMLDivElement>(null)

  useSetActiveBrand(marcaFilter || null)

  const { data: gruposRaw, isLoading: loadingGrupos } = useQuery({
    queryKey: ["grupos"],
    queryFn: () => gruposApi.list().then(r => r.data),
  })
  const grupos: Grupo[] = Array.isArray(gruposRaw) ? gruposRaw : []

  const { data: alumnosRaw, isLoading: loadingAlumnos } = useQuery({
    queryKey: ["alumnos"],
    queryFn: () => alumnosApi.list().then(r => r.data),
  })
  const alumnos: Alumno[] = Array.isArray(alumnosRaw) ? alumnosRaw : []

  const { data: profesoresRaw } = useQuery({
    queryKey: ["profesores", "all"],
    queryFn: () => profesoresApi.list().then(r => r.data),
  })
  const profesores: Profesor[] = Array.isArray(profesoresRaw) ? profesoresRaw : []

  const profesorColor = useMemo(() => {
    const sorted = profesores.slice().sort((a, b) => a.orden - b.orden)
    const map = new Map<number, typeof PALETTE[number]>()
    sorted.forEach((p, i) => map.set(p.id, PALETTE[i % PALETTE.length]))
    return map
  }, [profesores])

  function colorForProfesor(profesorId: number | null) {
    if (profesorId == null) return SIN_PROFESOR_COLOR
    return profesorColor.get(profesorId) ?? SIN_PROFESOR_COLOR
  }

  const guardarMut = useMutation({
    mutationFn: async (entries: [number, number | null][]) => {
      for (const [alumnoId, grupoId] of entries) {
        await alumnosApi.update(alumnoId, { grupo: grupoId })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alumnos"] })
      setDraft(new Map())
      setToast("Cambios guardados.")
    },
    onError: () => setToast("Error al guardar. Los cambios sin guardar siguen aquí — inténtalo de nuevo."),
  })

  function effectiveGrupoOf(a: Alumno): number | null {
    return draft.has(a.id) ? draft.get(a.id)! : committedGrupoOf(a)
  }

  function stage(alumnoId: number, grupoId: number | null) {
    const alumno = alumnos.find(a => a.id === alumnoId)
    if (!alumno) return
    setDraft(prev => {
      const next = new Map(prev)
      if (grupoId === committedGrupoOf(alumno)) next.delete(alumnoId)
      else next.set(alumnoId, grupoId)
      return next
    })
  }

  const unassignedByAge = useMemo(() => {
    let list = alumnos.filter(a => effectiveGrupoOf(a) == null)
    if (marcaFilter) list = list.filter(a => a.marca === marcaFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a => a.nombre.toLowerCase().includes(q))
    }
    const groups: Record<AgeGroup, Alumno[]> = { kids: [], teens: [], adults: [], sinEdad: [] }
    list.forEach(a => groups[ageGroupOf(a)].push(a))
    AGE_GROUP_ORDER.forEach(g => groups[g].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    return groups
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnos, search, marcaFilter, draft])

  const unassignedCount = AGE_GROUP_ORDER.reduce((sum, g) => sum + unassignedByAge[g].length, 0)

  const rosterByGrupo = useMemo(() => {
    const map = new Map<number, Alumno[]>()
    alumnos.forEach(a => {
      const gid = effectiveGrupoOf(a)
      if (gid == null) return
      if (!map.has(gid)) map.set(gid, [])
      map.get(gid)!.push(a)
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnos, draft])

  const committedRosterByGrupo = useMemo(() => {
    const map = new Map<number, Alumno[]>()
    alumnos.forEach(a => {
      const gid = committedGrupoOf(a)
      if (gid == null) return
      if (!map.has(gid)) map.set(gid, [])
      map.get(gid)!.push(a)
    })
    return map
  }, [alumnos])

  const visibleGrupos = useMemo(
    () => marcaFilter ? grupos.filter(g => g.marca === marcaFilter) : grupos,
    [grupos, marcaFilter]
  )

  const events: CalEvent[] = useMemo(() => visibleGrupos.flatMap(g => {
    const roster = rosterByGrupo.get(g.id) ?? []
    const committedRoster = committedRosterByGrupo.get(g.id) ?? []
    const dirty = roster.length !== committedRoster.length ||
      roster.some(a => !committedRoster.some(c => c.id === a.id))
    const pal = colorForProfesor(g.profesor)
    return (g.horarios ?? []).map((h, i) => ({
      id: `${g.id}-${i}`,
      title: g.nombre,
      daysOfWeek: [h.dia === 5 ? 6 : h.dia + 1], // Grupo.dia: 0=Mon..5=Sat -> FullCalendar: 0=Sun..6=Sat
      startTime: h.ini,
      endTime: h.fin,
      backgroundColor: pal.bg,
      borderColor: pal.border,
      textColor: pal.text,
      extendedProps: { grupoId: g.id, roster, profesorNombre: g.profesor_nombre ?? null, aula: g.aula, marca: g.marca, dirty },
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [visibleGrupos, rosterByGrupo, committedRosterByGrupo, profesorColor])

  // External drag sources: unassigned pills in the sidebar, and already-assigned
  // pills inside the open class drawer (so a student can be dragged straight
  // from one class to another without unassigning first).
  useEffect(() => {
    if (!sidebarRef.current) return
    const d = new Draggable(sidebarRef.current, {
      itemSelector: ".student-pill",
      eventData: (el) => ({ title: el.getAttribute("data-name") ?? "" }),
    })
    return () => d.destroy()
  }, [unassignedByAge])

  useEffect(() => {
    if (!drawerRosterRef.current) return
    const d = new Draggable(drawerRosterRef.current, {
      itemSelector: ".roster-pill",
      eventData: (el) => ({ title: el.getAttribute("data-name") ?? "" }),
    })
    return () => d.destroy()
  }, [selectedGrupoId, rosterByGrupo])

  // Which class (if any) a given drop date/time falls into. Deliberately NOT
  // DOM hit-testing (jsEvent.target) — FullCalendar's drag "mirror" overlay
  // tracks the cursor and can itself be the element under the pointer at
  // drop time, making elementFromPoint miss the real event underneath and
  // silently no-op the whole drop. The drop's date/time from FullCalendar
  // itself is reliable regardless of what's visually on top.
  function grupoIdAtDropDate(date: Date): number | null {
    const dow = date.getDay() // matches CalEvent.daysOfWeek (0=Sun..6=Sat)
    const hh = String(date.getHours()).padStart(2, "0")
    const mm = String(date.getMinutes()).padStart(2, "0")
    const t = `${hh}:${mm}`
    const match = events.find(e => e.daysOfWeek.includes(dow) && t >= e.startTime && t < e.endTime)
    return match ? match.extendedProps.grupoId : null
  }

  function handleDrop(alumnoId: number, alumnoNombre: string, dropDate: Date) {
    const grupoId = grupoIdAtDropDate(dropDate)
    if (!grupoId) return
    const grupo = grupos.find(g => g.id === grupoId)
    const alumno = alumnos.find(a => a.id === alumnoId)
    const currentRoster = rosterByGrupo.get(grupoId) ?? []
    if (!grupo || !alumno) return
    if (effectiveGrupoOf(alumno) === grupoId) return
    if (alumno.marca !== grupo.marca) {
      setToast(`${alumnoNombre} es de ${BRAND_META[alumno.marca].label} — "${grupo.nombre}" es de ${BRAND_META[grupo.marca].label}.`)
      return
    }
    if (currentRoster.length >= MAX_PER_CLASS) {
      setToast(`"${grupo.nombre}" ya tiene ${MAX_PER_CLASS} alumnos (máximo por clase).`)
      return
    }
    stage(alumnoId, grupoId)
    setToast(`${alumnoNombre} → ${grupo.nombre} (sin guardar todavía).`)
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(""), 2500)
    return () => clearTimeout(t)
  }, [toast])

  // Warn before leaving the page with staged-but-unsaved placements.
  useEffect(() => {
    if (draft.size === 0) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [draft.size])

  function handleGuardar() {
    setSaving(true)
    guardarMut.mutate(Array.from(draft.entries()), { onSettled: () => setSaving(false) })
  }

  function handleDescartar() {
    setDraft(new Map())
    setToast("Cambios sin guardar descartados.")
  }

  function renderEventContent(arg: EventContentArg) {
    // FullCalendar's external-drag "mirror" preview reuses this same renderer
    // for a plain title-only event with no extendedProps at all — guard every
    // field instead of assuming a real CalEvent, or the drag crashes mid-drop.
    const props = arg.event.extendedProps as Partial<CalEvent["extendedProps"]>
    const { roster, profesorNombre, marca, dirty } = props
    const brand = marca ? BRAND_META[marca] : null
    return (
      <div className="px-1 py-[1px] overflow-hidden h-full leading-none relative" data-grupo-id={props.grupoId != null ? String(props.grupoId) : undefined}>
        {dirty && (
          <span className="absolute top-[1px] left-[1px] w-[6px] h-[6px] rounded-full bg-brass-500 ring-2 ring-white"
            title="Cambios sin guardar" />
        )}
        {brand && (
          <span
            className="absolute top-[1px] right-[1px] text-[7px] font-bold leading-none px-[3px] py-[1px] rounded-sm"
            style={{ background: brand.bg, color: brand.text }}
            title={brand.label}
          >
            {brand.tag}
          </span>
        )}
        <div className="font-head text-[11px] leading-tight truncate pr-6">{arg.event.title}</div>
        {roster && (
          <div className="text-[9px] leading-tight opacity-80 truncate">
            {arg.timeText}{profesorNombre ? ` · ${profesorNombre}` : ""} · {roster.length}/{MAX_PER_CLASS}
          </div>
        )}
      </div>
    )
  }

  const selectedGrupo = grupos.find(g => g.id === selectedGrupoId) ?? null
  const selectedRoster = selectedGrupoId != null ? (rosterByGrupo.get(selectedGrupoId) ?? []) : []
  const profesoresActivos = profesores.filter(p => p.activo)

  return (
    <div className="flex gap-5 h-[calc(100vh-140px)]">
      {/* Roster sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col gap-3">
        <div>
          <h1 className="font-head font-normal text-xl text-pine-900">Horario</h1>
          <p className="text-xs text-pine-600 mt-0.5">
            Arrastra alumnos para probar huecos. Nada se guarda hasta que pulses "Guardar cambios".
          </p>
        </div>

        {profesoresActivos.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[10px]">
            {profesoresActivos.map(p => (
              <span key={p.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                style={{ background: colorForProfesor(p.id).bg, color: colorForProfesor(p.id).text }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colorForProfesor(p.id).accent }} />
                {p.nombre}
              </span>
            ))}
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded"
              style={{ background: SIN_PROFESOR_COLOR.bg, color: SIN_PROFESOR_COLOR.text }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SIN_PROFESOR_COLOR.accent }} />
              Sin profe
            </span>
          </div>
        )}

        <div className="flex rounded-lg border border-khaki-300 overflow-hidden text-xs font-semibold">
          <button onClick={() => setMarcaFilter("")}
            className={`flex-1 px-2 py-1.5 ${marcaFilter === "" ? "bg-brass-500 text-white" : "bg-white text-pine-600 hover:bg-khaki-100"}`}>
            Todas
          </button>
          {MARCAS.map(m => (
            <button key={m.value} onClick={() => setMarcaFilter(m.value)}
              className={`flex-1 px-2 py-1.5 border-l border-khaki-300 flex items-center justify-center gap-1 ${marcaFilter === m.value ? "text-white" : "bg-white text-pine-600 hover:bg-khaki-100"}`}
              style={marcaFilter === m.value ? { background: BRAND_META[m.value].bg } : undefined}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: marcaFilter === m.value ? "#fff" : BRAND_META[m.value].dot }} />
              {BRAND_META[m.value].tag}
            </button>
          ))}
        </div>

        <input type="text" placeholder="Buscar alumno…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-pine-600">
          Sin asignar ({unassignedCount})
        </p>
        <div ref={sidebarRef} className="flex-1 overflow-y-auto flex flex-col gap-3 border-2 border-dashed border-khaki-300 rounded-lg p-2">
          {loadingAlumnos ? (
            <p className="text-xs text-pine-600">Cargando…</p>
          ) : unassignedCount === 0 ? (
            <p className="text-xs text-pine-600 italic">Todo el mundo está asignado ✓</p>
          ) : (
            AGE_GROUP_ORDER.filter(g => unassignedByAge[g].length > 0).map(g => (
              <div key={g}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-khaki-400 mb-1">
                  {AGE_GROUP_LABELS[g]} ({unassignedByAge[g].length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {unassignedByAge[g].map(a => (
                    <span key={a.id}
                      className="student-pill flex items-center gap-1.5 text-xs font-semibold bg-white border border-khaki-300 text-pine-800 rounded-full pl-2 pr-2.5 py-1 cursor-grab select-none"
                      data-name={a.nombre} data-alumno-id={a.id} title={BRAND_META[a.marca].label}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: BRAND_META[a.marca].dot }} />
                      {a.nombre}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Calendar */}
      <div className="flex-1 min-w-0 flex flex-col">
        {loadingGrupos ? (
          <p className="text-sm text-pine-600">Cargando…</p>
        ) : (
          <div className="fc-horario flex-1 min-h-0">
            <FullCalendar
              plugins={[timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={false}
              allDaySlot={false}
              weekends={false}
              height="100%"
              slotMinTime="09:00:00"
              slotMaxTime="21:30:00"
              slotDuration="00:30:00"
              slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
              eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
              dayHeaderFormat={{ weekday: "long" }}
              locale={esLocale}
              firstDay={1}
              events={events}
              eventContent={renderEventContent}
              eventClick={(info) => {
                const grupoId = Number(info.event.extendedProps.grupoId)
                if (Number.isFinite(grupoId) && grupoId > 0) setSelectedGrupoId(grupoId)
              }}
              // Deliberately NOT `droppable` — that flag makes FullCalendar auto-add
              // the dropped element as its own internal calendar event (a ghost
              // event outside our `events` state, with no grupoId, unremovable and
              // uneditable). `drop` alone already fires for every external-drag
              // drop and is all we need — real assignment happens through
              // `events` (our state) once `stage()`/the API call updates it.
              drop={(info) => {
                const alumnoId = Number(info.draggedEl.getAttribute("data-alumno-id"))
                const nombre = info.draggedEl.getAttribute("data-name") ?? ""
                handleDrop(alumnoId, nombre, info.date)
              }}
              eventReceive={(info) => info.revert()}
            />
          </div>
        )}
      </div>

      {/* Selected-group roster drawer — a docked panel, NOT a modal: no
          full-screen backdrop, so the calendar underneath stays fully
          interactive and a student can be dragged straight from here onto
          a different class to reassign them. */}
      {selectedGrupo && (
        <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl flex flex-col z-40 border-l border-khaki-300">
            <div className="px-5 py-4 border-b flex items-start justify-between">
              <div>
                <p className="font-head font-normal text-lg text-pine-900 flex items-center gap-2">
                  {selectedGrupo.nombre}
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: BRAND_META[selectedGrupo.marca].bg, color: BRAND_META[selectedGrupo.marca].text }}>
                    {BRAND_META[selectedGrupo.marca].tag}
                  </span>
                </p>
                <p className="text-xs text-pine-600 mt-0.5">
                  {selectedGrupo.profesor_nombre ? `Prof. ${selectedGrupo.profesor_nombre} · ` : ""}
                  {(selectedGrupo.horarios ?? []).map((h, i) => (
                    <span key={i}>{DAY_LABELS[h.dia]?.slice(0, 3)} {h.ini}–{h.fin}{i < (selectedGrupo.horarios.length - 1) ? " · " : ""}</span>
                  ))}
                </p>
              </div>
              <button onClick={() => setSelectedGrupoId(null)} className="text-khaki-400 hover:text-pine-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-pine-600 mb-2">
                Alumnos ({selectedRoster.length}/{MAX_PER_CLASS})
              </p>
              <p className="text-[11px] text-pine-600 mb-3">Arrastra a otra clase para reasignar, o pulsa ✕ para quitar.</p>
              {selectedRoster.length === 0 ? (
                <p className="text-xs text-pine-600 italic">Sin alumnos todavía. Arrastra desde la izquierda.</p>
              ) : (
                <div ref={drawerRosterRef} className="space-y-1.5">
                  {selectedRoster.map(a => (
                    <div key={a.id}
                      className="roster-pill flex items-center justify-between bg-khaki-100 rounded-lg px-3 py-2 text-sm cursor-grab select-none"
                      data-name={a.nombre} data-alumno-id={a.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-brass-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                          {initials(a.nombre)}
                        </span>
                        {a.nombre}
                      </span>
                      <button onClick={() => stage(a.id, null)}
                        className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
      )}

      {/* Pending-changes bar */}
      {draft.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-pine-900 text-white text-sm font-medium pl-4 pr-2 py-2 rounded-lg shadow-lg z-50 flex items-center gap-3">
          <span>{draft.size} cambio{draft.size === 1 ? "" : "s"} sin guardar</span>
          <button onClick={handleDescartar} disabled={saving}
            className="px-3 py-1 rounded-md text-xs font-semibold bg-white/10 hover:bg-white/20 disabled:opacity-50">
            Descartar
          </button>
          <button onClick={handleGuardar} disabled={saving}
            className="px-3 py-1 rounded-md text-xs font-semibold bg-brass-500 hover:bg-brass-700 disabled:opacity-50">
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-pine-900 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
