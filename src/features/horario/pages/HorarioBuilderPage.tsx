import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin, { Draggable } from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"
import type { EventContentArg } from "@fullcalendar/core"
import { gruposApi } from "@/features/grupos/api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { profesoresApi } from "@/features/profesores/api"
import { ProfesorSelect } from "@/features/profesores/ProfesorSelect"
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
    grupoId: number; roster: Alumno[]; profesorId: number | null; profesorNombre: string | null
    aula: string; marca: Marca
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

function committedGruposOf(a: Alumno): Set<number> {
  return new Set((a.grupos_detalle ?? []).map(g => g.grupo))
}

// A student's personal time within a class — null/null means "the full
// class session" (Grupo.horarios as-is). Falls back to horarios[0] as the
// class's reference window; every seeded Grupo meets once a week so this
// hasn't been a real limitation, but a grupo meeting more than once a week
// would need a per-day override to do this properly.
function horarioPersonalFor(a: Alumno, grupoId: number, grupo: Grupo | undefined) {
  const gd = (a.grupos_detalle ?? []).find(x => x.grupo === grupoId)
  const claseIni = grupo?.horarios?.[0]?.ini ?? ""
  const claseFin = grupo?.horarios?.[0]?.fin ?? ""
  const ini = gd?.hora_inicio ?? claseIni
  const fin = gd?.hora_fin ?? claseFin
  return { ini, fin, personalizado: !!(gd?.hora_inicio || gd?.hora_fin) }
}

function draftKey(alumnoId: number, grupoId: number) {
  return `${alumnoId}:${grupoId}`
}

export default function HorarioBuilderPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [marcaFilter, setMarcaFilter] = useState<Marca | "">("")
  const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null)
  const [toast, setToast] = useState("")
  // A student can be enrolled in more than one class at once (2-3x/week is
  // normal), so placements are tracked as individual membership toggles, not
  // "the one grupo this alumno is in". Staged locally, not yet saved — lets
  // you try out arrangements (drag students in and out repeatedly) without
  // committing on every move. Keyed by "alumnoId:grupoId" -> "add" (stage a
  // new membership) or "remove" (stage dropping an existing one).
  const [draft, setDraft] = useState<Map<string, "add" | "remove">>(new Map())
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
    mutationFn: async (entries: [string, "add" | "remove"][]) => {
      for (const [key, action] of entries) {
        const [alumnoId, grupoId] = key.split(":").map(Number)
        if (action === "add") await alumnosApi.agregarGrupo(alumnoId, grupoId)
        else await alumnosApi.quitarGrupo(alumnoId, grupoId)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alumnos"] })
      setDraft(new Map())
      setToast("Cambios guardados.")
    },
    onError: () => setToast("Error al guardar. Los cambios sin guardar siguen aquí — inténtalo de nuevo."),
  })

  // Personal time window (a student who joins late / leaves early) is saved
  // immediately, independent of the placement draft/save-bar above — it edits
  // an existing membership rather than staging a new one.
  const horarioPersonalMut = useMutation({
    mutationFn: ({ alumnoId, grupoId, hora_inicio, hora_fin }: {
      alumnoId: number; grupoId: number; hora_inicio: string | null; hora_fin: string | null
    }) => alumnosApi.horarioPersonal(alumnoId, grupoId, hora_inicio, hora_fin),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["alumnos"] })
      setTimeEdits(prev => {
        const next = { ...prev }
        delete next[vars.alumnoId]
        return next
      })
      setToast("Horario personal guardado.")
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setToast(msg || "Error al guardar el horario personal.")
    },
  })
  // Locally-edited (not-yet-saved) time inputs, keyed by alumnoId — separate
  // from the alumno's actual saved hora_inicio/hora_fin so typing doesn't
  // fire a save on every keystroke.
  const [timeEdits, setTimeEdits] = useState<Record<number, { ini: string; fin: string }>>({})

  // Dropping a student onto an empty cell (no class meets there yet) offers
  // to create a brand-new class right there, with this student as its first
  // enrollment — a normal class like any other, others can be added later.
  const [pendingCreate, setPendingCreate] = useState<{
    alumnoId: number; alumnoNombre: string; dia: number; horaInicio: string; horaFin: string
    profesorId: number | null; aula: string; nombre: string; marca: Marca
  } | null>(null)
  const [pendingCreateError, setPendingCreateError] = useState("")

  const crearClaseMut = useMutation({
    mutationFn: async (form: NonNullable<typeof pendingCreate>) => {
      const grupoRes = await gruposApi.create({
        nombre: form.nombre.trim(),
        marca: form.marca,
        profesor: form.profesorId,
        aula: form.aula.trim(),
        color_idx: grupos.length % PALETTE.length,
        horarios: [{ dia: form.dia, ini: form.horaInicio, fin: form.horaFin }],
      })
      await alumnosApi.agregarGrupo(form.alumnoId, grupoRes.data.id)
      return { grupo: grupoRes.data, alumnoNombre: form.alumnoNombre }
    },
    onSuccess: ({ grupo, alumnoNombre }) => {
      qc.invalidateQueries({ queryKey: ["grupos"] })
      qc.invalidateQueries({ queryKey: ["alumnos"] })
      setPendingCreate(null)
      setPendingCreateError("")
      setToast(`"${grupo.nombre}" creada con ${alumnoNombre}.`)
    },
    onError: () => setPendingCreateError("Error al crear la clase. Revisa los datos e inténtalo de nuevo."),
  })

  function handleCrearClase() {
    if (!pendingCreate) return
    if (!pendingCreate.nombre.trim()) { setPendingCreateError("Ponle un nombre a la clase."); return }
    if (!pendingCreate.profesorId) { setPendingCreateError("Elige un profesor/a."); return }
    if (!pendingCreate.aula.trim()) { setPendingCreateError("Indica el aula."); return }
    if (pendingCreate.horaFin <= pendingCreate.horaInicio) { setPendingCreateError("La hora de fin debe ser posterior a la de inicio."); return }
    setPendingCreateError("")
    crearClaseMut.mutate(pendingCreate)
  }

  // Draft entries regrouped by alumno so effective-membership lookups don't
  // have to scan the whole draft map for every alumno on every render.
  const draftByAlumno = useMemo(() => {
    const map = new Map<number, Map<number, "add" | "remove">>()
    draft.forEach((action, key) => {
      const [alumnoId, grupoId] = key.split(":").map(Number)
      if (!map.has(alumnoId)) map.set(alumnoId, new Map())
      map.get(alumnoId)!.set(grupoId, action)
    })
    return map
  }, [draft])

  function effectiveGruposOf(a: Alumno): Set<number> {
    const committed = committedGruposOf(a)
    const overrides = draftByAlumno.get(a.id)
    if (!overrides) return committed
    const result = new Set(committed)
    overrides.forEach((action, grupoId) => {
      if (action === "add") result.add(grupoId)
      else result.delete(grupoId)
    })
    return result
  }

  // Stage adding alumnoId to grupoId (no-op if they're already effectively in
  // it). Does NOT touch any of their other memberships.
  function stageAdd(alumnoId: number, grupoId: number) {
    const alumno = alumnos.find(a => a.id === alumnoId)
    if (!alumno) return
    const key = draftKey(alumnoId, grupoId)
    setDraft(prev => {
      const next = new Map(prev)
      if (committedGruposOf(alumno).has(grupoId)) next.delete(key) // already committed — nothing to stage
      else next.set(key, "add")
      return next
    })
  }

  // Stage removing alumnoId from grupoId.
  function stageRemove(alumnoId: number, grupoId: number) {
    const alumno = alumnos.find(a => a.id === alumnoId)
    if (!alumno) return
    const key = draftKey(alumnoId, grupoId)
    setDraft(prev => {
      const next = new Map(prev)
      if (committedGruposOf(alumno).has(grupoId)) next.set(key, "remove")
      else next.delete(key) // was only staged as an add — cancel it
      return next
    })
  }

  // Every student is listed here, grouped by age — including ones already in
  // a class, since a student with a class is still a valid drag source for
  // adding a second or third (2-3x/week is normal). This used to only list
  // unassigned students, and finding an already-assigned one required
  // knowing to type their name into search — that trick is now redundant
  // (search still narrows this same list by name) but no longer required.
  const alumnosByAge = useMemo(() => {
    let list = alumnos.slice()
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

  const visibleCount = AGE_GROUP_ORDER.reduce((sum, g) => sum + alumnosByAge[g].length, 0)

  // Kept separate from visibleCount (which follows the search box) so the
  // "N sin asignar" hint in the header stays meaningful even mid-search.
  const unassignedCount = useMemo(() => {
    let list = alumnos.filter(a => effectiveGruposOf(a).size === 0)
    if (marcaFilter) list = list.filter(a => a.marca === marcaFilter)
    return list.length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnos, marcaFilter, draft])

  const rosterByGrupo = useMemo(() => {
    const map = new Map<number, Alumno[]>()
    alumnos.forEach(a => {
      effectiveGruposOf(a).forEach(gid => {
        if (!map.has(gid)) map.set(gid, [])
        map.get(gid)!.push(a)
      })
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnos, draft])

  const committedRosterByGrupo = useMemo(() => {
    const map = new Map<number, Alumno[]>()
    alumnos.forEach(a => {
      committedGruposOf(a).forEach(gid => {
        if (!map.has(gid)) map.set(gid, [])
        map.get(gid)!.push(a)
      })
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
      extendedProps: {
        grupoId: g.id, roster, profesorId: g.profesor ?? null, profesorNombre: g.profesor_nombre ?? null,
        aula: g.aula, marca: g.marca, dirty,
      },
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [visibleGrupos, rosterByGrupo, committedRosterByGrupo, profesorColor])

  // "Por profesor" view renders one calendar per teacher side by side (plus
  // a "Sin profe" bucket), so Candela's and Camila's Wednesday-7pm slots line
  // up directly for comparison instead of sharing one column.
  const [vistaProfesor, setVistaProfesor] = useState(false)

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
  }, [alumnosByAge])

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
  // resourceProfesorId is only meaningful in the "Por profesor" view (comes
  // from the column the drop landed in) — in the regular day view it's
  // undefined and every event at that day/time is a candidate regardless of
  // who teaches it, same as before this feature existed.
  function grupoIdAtDropDate(date: Date, resourceProfesorId?: number | null): number | null {
    const dow = date.getDay() // matches CalEvent.daysOfWeek (0=Sun..6=Sat)
    const hh = String(date.getHours()).padStart(2, "0")
    const mm = String(date.getMinutes()).padStart(2, "0")
    const t = `${hh}:${mm}`
    const match = events.find(e => e.daysOfWeek.includes(dow) && t >= e.startTime && t < e.endTime &&
      (resourceProfesorId === undefined || e.extendedProps.profesorId === resourceProfesorId))
    return match ? match.extendedProps.grupoId : null
  }

  // sourceGrupoId is set when the drag started from an already-open class
  // drawer (a "roster-pill") — that's a reassign/move (drop out of the
  // source class, into the target). A drag from the sidebar (unassigned or
  // search results, no specific source class) is always additive: it adds
  // this class on top of whatever the student is already enrolled in,
  // exactly what "2 or 3 classes a week" needs.
  function handleDrop(
    alumnoId: number, alumnoNombre: string, dropDate: Date, sourceGrupoId?: number,
    resourceProfesorId?: number | null
  ) {
    const grupoId = grupoIdAtDropDate(dropDate, resourceProfesorId)
    if (!grupoId) {
      // Empty cell — no class meets here yet. Rather than no-op, offer to
      // create one on the spot with this student as its first enrollment.
      const alumno = alumnos.find(a => a.id === alumnoId)
      if (!alumno) return
      const dow = dropDate.getDay()
      const dia = dow - 1
      if (dia < 0 || dia > 5) return
      const horaInicio = `${String(dropDate.getHours()).padStart(2, "0")}:${String(dropDate.getMinutes()).padStart(2, "0")}`
      const finDate = new Date(dropDate.getTime() + 60 * 60 * 1000)
      const horaFin = `${String(finDate.getHours()).padStart(2, "0")}:${String(finDate.getMinutes()).padStart(2, "0")}`
      setPendingCreate({
        alumnoId, alumnoNombre, dia, horaInicio, horaFin,
        profesorId: resourceProfesorId ?? null,
        aula: "", nombre: `${DAY_LABELS[dia]} ${horaInicio} — ${alumno.nombre}`,
        marca: alumno.marca,
      })
      return
    }
    const grupo = grupos.find(g => g.id === grupoId)
    const alumno = alumnos.find(a => a.id === alumnoId)
    if (!grupo || !alumno) return
    if (effectiveGruposOf(alumno).has(grupoId)) return // already in this class
    if (alumno.marca !== grupo.marca) {
      setToast(`${alumnoNombre} es de ${BRAND_META[alumno.marca].label} — "${grupo.nombre}" es de ${BRAND_META[grupo.marca].label}.`)
      return
    }
    const currentRoster = rosterByGrupo.get(grupoId) ?? []
    if (currentRoster.length >= MAX_PER_CLASS) {
      setToast(`"${grupo.nombre}" ya tiene ${MAX_PER_CLASS} alumnos (máximo por clase).`)
      return
    }
    if (sourceGrupoId != null && sourceGrupoId !== grupoId) {
      stageRemove(alumnoId, sourceGrupoId)
    }
    stageAdd(alumnoId, grupoId)
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
        {/* Names right on the block, not just a count — so an assignment
            never looks like it "disappeared" after a drag; you can see who's
            in the class without opening the drawer. A student with a
            personal (partial) window also shows their actual time range,
            not just the class's — that's the whole point of the feature. */}
        {roster && roster.length > 0 && (
          <div className="text-[9px] leading-tight font-semibold truncate">
            {roster.map(a => {
              const grupo = props.grupoId != null ? grupos.find(g => g.id === props.grupoId) : undefined
              const hp = props.grupoId != null ? horarioPersonalFor(a, props.grupoId, grupo) : null
              return hp?.personalizado ? `${initials(a.nombre)} ${hp.ini}–${hp.fin}` : initials(a.nombre)
            }).join(" · ")}
          </div>
        )}
      </div>
    )
  }

  const selectedGrupo = grupos.find(g => g.id === selectedGrupoId) ?? null
  const selectedRoster = selectedGrupoId != null ? (rosterByGrupo.get(selectedGrupoId) ?? []) : []
  const profesoresActivos = profesores.filter(p => p.activo)
  // "Por profesor" columns: one per active teacher, plus a bucket for classes
  // with nobody assigned.
  const teacherColumns: { id: number | null; nombre: string }[] = [
    ...profesoresActivos.map(p => ({ id: p.id, nombre: p.nombre })),
    { id: null, nombre: "Sin profe" },
  ]

  // filterProfesorId narrows which events this particular calendar shows
  // (undefined = show everything, used by the single week view). dropColumnProfesorId
  // is what a drop onto THIS calendar's empty cells should be attributed to
  // — each "Por profesor" column already knows its own teacher, no need to
  // detect it from the drop itself.
  function renderCalendar(opts: { filterProfesorId?: number | null; dropColumnProfesorId?: number | null; calKey: string }) {
    const filteredEvents = opts.filterProfesorId === undefined
      ? events
      : events.filter(e => e.extendedProps.profesorId === opts.filterProfesorId)
    return (
      <FullCalendar
        key={opts.calKey}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={false}
        allDaySlot={false}
        weekends={false}
        height="100%"
        slotMinTime="09:00:00"
        slotMaxTime="21:30:00"
        slotDuration="00:30:00"
        // Grid lines every 30 min for readability, but a drag can still land
        // on any 5-minute mark — otherwise a drop snaps to the slot's start
        // (effectively whole hours/half-hours only), while the time inputs
        // elsewhere on this page accept anything. This keeps drag-and-drop
        // just as flexible as typing a time in directly.
        snapDuration="00:05:00"
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        dayHeaderFormat={{ weekday: "long" }}
        locale={esLocale}
        firstDay={1}
        events={filteredEvents}
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
          const sourceAttr = info.draggedEl.getAttribute("data-source-grupo-id")
          const sourceGrupoId = sourceAttr ? Number(sourceAttr) : undefined
          handleDrop(alumnoId, nombre, info.date, sourceGrupoId, opts.dropColumnProfesorId)
        }}
        eventReceive={(info) => info.revert()}
      />
    )
  }

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

        <div className="flex rounded-lg border border-khaki-300 overflow-hidden text-xs font-semibold">
          <button onClick={() => setVistaProfesor(false)}
            className={`flex-1 px-2 py-1.5 ${!vistaProfesor ? "bg-brass-500 text-white" : "bg-white text-pine-600 hover:bg-khaki-100"}`}>
            Vista semana
          </button>
          <button onClick={() => setVistaProfesor(true)}
            className={`flex-1 px-2 py-1.5 border-l border-khaki-300 ${vistaProfesor ? "bg-brass-500 text-white" : "bg-white text-pine-600 hover:bg-khaki-100"}`}
            title="Cada día se divide en una columna por profesor/a">
            Por profesor
          </button>
        </div>

        <input type="text" placeholder="Buscar alumno…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-pine-600">
          Alumnos ({visibleCount})
          <span className="font-normal normal-case text-khaki-400"> · {unassignedCount} sin asignar</span>
        </p>
        <div ref={sidebarRef} className="flex-1 overflow-y-auto flex flex-col gap-3 border-2 border-dashed border-khaki-300 rounded-lg p-2">
          {loadingAlumnos ? (
            <p className="text-xs text-pine-600">Cargando…</p>
          ) : visibleCount === 0 ? (
            <p className="text-xs text-pine-600 italic">{search.trim() ? "Sin resultados." : "Sin alumnos."}</p>
          ) : (
            // Every student shows here, grouped by age — arrastra a un
            // hueco para añadir una clase más, tenga ya alguna o no.
            AGE_GROUP_ORDER.filter(g => alumnosByAge[g].length > 0).map(g => (
              <div key={g}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-khaki-400 mb-1">
                  {AGE_GROUP_LABELS[g]} ({alumnosByAge[g].length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {alumnosByAge[g].map(a => {
                    const n = effectiveGruposOf(a).size
                    return (
                      <span key={a.id}
                        className="student-pill flex items-center gap-1.5 text-xs font-semibold bg-white border border-khaki-300 text-pine-800 rounded-full pl-2 pr-2.5 py-1 cursor-grab select-none"
                        data-name={a.nombre} data-alumno-id={a.id} title={BRAND_META[a.marca].label}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: BRAND_META[a.marca].dot }} />
                        {a.nombre}
                        {n > 0 && (
                          <span className="text-[9px] font-normal text-pine-500">· {n} clase{n === 1 ? "" : "s"}</span>
                        )}
                        <button onClick={() => navigate(`/alumnos/${a.id}`)} title="Ver ficha del alumno"
                          className="text-pine-400 hover:text-brass-700 text-[10px] leading-none">↗</button>
                      </span>
                    )
                  })}
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
        ) : vistaProfesor ? (
          <div className="flex-1 min-h-0 overflow-x-auto">
            <div className="flex gap-3 h-full" style={{ minWidth: `${teacherColumns.length * 380}px` }}>
              {teacherColumns.map(t => (
                <div key={t.id ?? "none"} className="flex flex-col flex-shrink-0" style={{ width: 380 }}>
                  <p className="text-xs font-bold uppercase tracking-wide text-pine-700 mb-1 text-center">{t.nombre}</p>
                  <div className="fc-horario flex-1 min-h-0">
                    {renderCalendar({ filterProfesorId: t.id, dropColumnProfesorId: t.id, calKey: `prof-${t.id ?? "none"}` })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="fc-horario flex-1 min-h-0">
            {renderCalendar({ filterProfesorId: undefined, dropColumnProfesorId: undefined, calKey: "week" })}
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
                <div ref={drawerRosterRef} className="space-y-2">
                  {selectedRoster.map(a => {
                    const hp = horarioPersonalFor(a, selectedGrupoId!, selectedGrupo ?? undefined)
                    const edit = timeEdits[a.id] ?? { ini: hp.ini, fin: hp.fin }
                    const dirtyTime = edit.ini !== hp.ini || edit.fin !== hp.fin
                    return (
                      <div key={a.id} className="bg-khaki-100 rounded-lg px-3 py-2">
                        <div
                          className="roster-pill flex items-center justify-between text-sm cursor-grab select-none"
                          data-name={a.nombre} data-alumno-id={a.id} data-source-grupo-id={selectedGrupoId ?? undefined}>
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-brass-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                              {initials(a.nombre)}
                            </span>
                            {a.nombre}
                          </span>
                          <span className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => navigate(`/alumnos/${a.id}`)} title="Ver ficha del alumno"
                              className="text-pine-400 hover:text-brass-700 text-xs">↗</button>
                            <button onClick={() => selectedGrupoId != null && stageRemove(a.id, selectedGrupoId)}
                              className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          </span>
                        </div>
                        {/* Personal window — a student who comes for part of
                            the session (e.g. class runs 17:00–19:00 but this
                            one only stays 17:00–18:00). Blank = full class. */}
                        <div className="flex items-center gap-1.5 mt-1.5 pl-7">
                          <input type="time" value={edit.ini}
                            onChange={e => setTimeEdits(prev => ({ ...prev, [a.id]: { ini: e.target.value, fin: edit.fin } }))}
                            className="text-[11px] border border-khaki-300 rounded px-1 py-0.5 w-[72px]" />
                          <span className="text-[10px] text-pine-500">–</span>
                          <input type="time" value={edit.fin}
                            onChange={e => setTimeEdits(prev => ({ ...prev, [a.id]: { ini: edit.ini, fin: e.target.value } }))}
                            className="text-[11px] border border-khaki-300 rounded px-1 py-0.5 w-[72px]" />
                          {dirtyTime && (
                            <button
                              onClick={() => horarioPersonalMut.mutate({ alumnoId: a.id, grupoId: selectedGrupoId!, hora_inicio: edit.ini, hora_fin: edit.fin })}
                              disabled={horarioPersonalMut.isPending}
                              className="text-[10px] font-semibold text-white bg-brass-500 hover:bg-brass-700 rounded px-1.5 py-0.5 disabled:opacity-50">
                              Guardar
                            </button>
                          )}
                          {!dirtyTime && hp.personalizado && (
                            <button
                              onClick={() => horarioPersonalMut.mutate({ alumnoId: a.id, grupoId: selectedGrupoId!, hora_inicio: null, hora_fin: null })}
                              disabled={horarioPersonalMut.isPending}
                              title="Volver al horario completo de la clase"
                              className="text-[10px] text-pine-500 hover:text-pine-700 underline disabled:opacity-50">
                              horario completo
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
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

      {/* Dropped a student onto an empty cell — offer to create a class right
          there, prefilled with the day/time (and teacher, if dropped into a
          "Por profesor" column). A real modal (backdrop) since it needs
          undivided attention before it can save anything. */}
      {pendingCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={e => { if (e.target === e.currentTarget && !crearClaseMut.isPending) setPendingCreate(null) }}>
          <div className="bg-white rounded-xl shadow-xl w-96 p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-head text-lg text-pine-900">Nueva clase</h2>
                <p className="text-xs text-pine-600">
                  {DAY_LABELS[pendingCreate.dia]} {pendingCreate.horaInicio}–{pendingCreate.horaFin} · {pendingCreate.alumnoNombre} · {BRAND_META[pendingCreate.marca].label}
                </p>
              </div>
              <button onClick={() => setPendingCreate(null)} disabled={crearClaseMut.isPending}
                className="text-khaki-400 hover:text-pine-600 text-xl leading-none disabled:opacity-50">✕</button>
            </div>

            {pendingCreateError && (
              <p className="text-red-600 text-xs bg-red-50 border border-red-200 p-2 rounded-lg">{pendingCreateError}</p>
            )}

            <div>
              <label className="text-xs font-semibold text-pine-700">Nombre</label>
              <input type="text" value={pendingCreate.nombre}
                onChange={e => setPendingCreate(p => p && { ...p, nombre: e.target.value })}
                className="w-full border rounded-lg px-3 py-1.5 text-sm mt-0.5" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-pine-700">Profesor/a</label>
                <ProfesorSelect value={pendingCreate.profesorId}
                  onChange={v => setPendingCreate(p => p && { ...p, profesorId: v })}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm mt-0.5" />
              </div>
              <div>
                <label className="text-xs font-semibold text-pine-700">Aula</label>
                <input type="text" value={pendingCreate.aula} placeholder="Aula 1, Online…"
                  onChange={e => setPendingCreate(p => p && { ...p, aula: e.target.value })}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm mt-0.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-pine-700">Hora inicio</label>
                <input type="time" value={pendingCreate.horaInicio}
                  onChange={e => setPendingCreate(p => p && { ...p, horaInicio: e.target.value })}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm mt-0.5" />
              </div>
              <div>
                <label className="text-xs font-semibold text-pine-700">Hora fin</label>
                <input type="time" value={pendingCreate.horaFin}
                  onChange={e => setPendingCreate(p => p && { ...p, horaFin: e.target.value })}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm mt-0.5" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setPendingCreate(null)} disabled={crearClaseMut.isPending}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-pine-600 hover:bg-khaki-100 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleCrearClase} disabled={crearClaseMut.isPending}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-brass-500 hover:bg-brass-700 disabled:opacity-50">
                {crearClaseMut.isPending ? "Creando…" : "Crear clase"}
              </button>
            </div>
          </div>
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
