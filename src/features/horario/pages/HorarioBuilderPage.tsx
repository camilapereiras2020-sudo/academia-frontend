import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin, { Draggable } from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"
import type { EventContentArg } from "@fullcalendar/core"
import { gruposApi } from "@/features/grupos/api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { PALETTE } from "@/features/grupos/palette"
import { useSetActiveBrand } from "@/store/useSetActiveBrand"
import type { Alumno, Grupo, Marca } from "@/types"

const MAX_PER_CLASS = 6
const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

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
  extendedProps: { grupoId: number; roster: Alumno[]; profesor: string; aula: string; marca: Marca }
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

export default function HorarioBuilderPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [marcaFilter, setMarcaFilter] = useState<Marca | "">("")
  const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null)
  const [toast, setToast] = useState("")
  const sidebarRef = useRef<HTMLDivElement>(null)

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

  const asignarMut = useMutation({
    mutationFn: ({ id, grupo }: { id: number; grupo: number | null }) => alumnosApi.update(id, { grupo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alumnos"] }),
    onError: () => setToast("Error al asignar. Inténtalo de nuevo."),
  })

  const unassignedByAge = useMemo(() => {
    let list = alumnos.filter(a => !a.grupos_detalle?.length)
    if (marcaFilter) list = list.filter(a => a.marca === marcaFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a => a.nombre.toLowerCase().includes(q))
    }
    const groups: Record<AgeGroup, Alumno[]> = { kids: [], teens: [], adults: [], sinEdad: [] }
    list.forEach(a => groups[ageGroupOf(a)].push(a))
    AGE_GROUP_ORDER.forEach(g => groups[g].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    return groups
  }, [alumnos, search, marcaFilter])

  const unassignedCount = AGE_GROUP_ORDER.reduce((sum, g) => sum + unassignedByAge[g].length, 0)

  const rosterByGrupo = useMemo(() => {
    const map = new Map<number, Alumno[]>()
    alumnos.forEach(a => {
      const gid = a.grupos_detalle?.[0]?.grupo
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
    const pal = PALETTE[g.color_idx % PALETTE.length]
    return (g.horarios ?? []).map((h, i) => ({
      id: `${g.id}-${i}`,
      title: g.nombre,
      daysOfWeek: [h.dia === 5 ? 6 : h.dia + 1], // Grupo.dia: 0=Mon..5=Sat -> FullCalendar: 0=Sun..6=Sat
      startTime: h.ini,
      endTime: h.fin,
      backgroundColor: pal.bg,
      borderColor: pal.border,
      textColor: pal.text,
      extendedProps: { grupoId: g.id, roster, profesor: g.profesor, aula: g.aula, marca: g.marca },
    }))
  }), [visibleGrupos, rosterByGrupo])

  // External drag source: student pills in the sidebar
  useEffect(() => {
    if (!sidebarRef.current) return
    const d = new Draggable(sidebarRef.current, {
      itemSelector: ".student-pill",
      eventData: (el) => ({ title: el.getAttribute("data-name") ?? "" }),
    })
    return () => d.destroy()
  }, [unassignedByAge])

  function handleDrop(alumnoId: number, alumnoNombre: string, jsEvent: MouseEvent) {
    const targetEl = (jsEvent.target as HTMLElement)?.closest("[data-grupo-id]") as HTMLElement | null
    const grupoId = targetEl ? Number(targetEl.dataset.grupoId) : null
    if (!grupoId) return
    const grupo = grupos.find(g => g.id === grupoId)
    const alumno = alumnos.find(a => a.id === alumnoId)
    const currentRoster = rosterByGrupo.get(grupoId) ?? []
    if (!grupo || !alumno) return
    if (alumno.marca !== grupo.marca) {
      setToast(`${alumnoNombre} es de ${BRAND_META[alumno.marca].label} — "${grupo.nombre}" es de ${BRAND_META[grupo.marca].label}.`)
      return
    }
    if (currentRoster.length >= MAX_PER_CLASS) {
      setToast(`"${grupo.nombre}" ya tiene ${MAX_PER_CLASS} alumnos (máximo por clase).`)
      return
    }
    asignarMut.mutate({ id: alumnoId, grupo: grupoId })
    setToast(`${alumnoNombre} añadido/a a ${grupo.nombre}.`)
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(""), 2200)
    return () => clearTimeout(t)
  }, [toast])

  function renderEventContent(arg: EventContentArg) {
    const { roster, profesor, marca } = arg.event.extendedProps as CalEvent["extendedProps"]
    const brand = BRAND_META[marca]
    return (
      <div className="px-1 py-[1px] overflow-hidden h-full leading-none relative" data-grupo-id={String(arg.event.extendedProps.grupoId)}>
        <span
          className="absolute top-[1px] right-[1px] text-[7px] font-bold leading-none px-[3px] py-[1px] rounded-sm"
          style={{ background: brand.bg, color: brand.text }}
          title={brand.label}
        >
          {brand.tag}
        </span>
        <div className="font-head text-[11px] leading-tight truncate pr-6">{arg.event.title}</div>
        <div className="text-[9px] leading-tight opacity-80 truncate">
          {arg.timeText}{profesor ? ` · ${profesor}` : ""} · {roster.length}/{MAX_PER_CLASS}
        </div>
      </div>
    )
  }

  const selectedGrupo = grupos.find(g => g.id === selectedGrupoId) ?? null
  const selectedRoster = selectedGrupoId != null ? (rosterByGrupo.get(selectedGrupoId) ?? []) : []

  return (
    <div className="flex gap-5 h-[calc(100vh-140px)]">
      {/* Roster sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col gap-3">
        <div>
          <h1 className="font-head font-normal text-xl text-pine-900">Horario</h1>
          <p className="text-xs text-pine-600 mt-0.5">Arrastra un alumno a una clase para asignarlo.</p>
        </div>

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
              eventClick={(info) => setSelectedGrupoId(Number(info.event.extendedProps.grupoId))}
              droppable
              drop={(info) => {
                const alumnoId = Number(info.draggedEl.getAttribute("data-alumno-id"))
                const nombre = info.draggedEl.getAttribute("data-name") ?? ""
                handleDrop(alumnoId, nombre, info.jsEvent)
              }}
            />
          </div>
        )}
      </div>

      {/* Selected-group roster drawer */}
      {selectedGrupo && (
        <div className="fixed inset-0 bg-black/40 z-40 flex justify-end" onClick={e => { if (e.target === e.currentTarget) setSelectedGrupoId(null) }}>
          <div className="w-80 bg-white h-full shadow-xl flex flex-col">
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
                  {selectedGrupo.profesor ? `Prof. ${selectedGrupo.profesor} · ` : ""}
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
              {selectedRoster.length === 0 ? (
                <p className="text-xs text-pine-600 italic">Sin alumnos todavía. Arrastra desde la izquierda.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedRoster.map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-khaki-100 rounded-lg px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-brass-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                          {initials(a.nombre)}
                        </span>
                        {a.nombre}
                      </span>
                      <button onClick={() => asignarMut.mutate({ id: a.id, grupo: null })}
                        className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-pine-900 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
