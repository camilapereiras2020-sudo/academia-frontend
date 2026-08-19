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
import type { Alumno, Grupo } from "@/types"

const MAX_PER_CLASS = 6
const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

interface CalEvent {
  id: string
  title: string
  daysOfWeek: number[]
  startTime: string
  endTime: string
  backgroundColor: string
  borderColor: string
  textColor: string
  extendedProps: { grupoId: number; roster: Alumno[]; profesor: string; aula: string }
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

export default function HorarioBuilderPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null)
  const [toast, setToast] = useState("")
  const sidebarRef = useRef<HTMLDivElement>(null)

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

  const unassigned = useMemo(() => {
    const list = alumnos.filter(a => !a.grupos_detalle?.length)
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(a => a.nombre.toLowerCase().includes(q))
  }, [alumnos, search])

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

  const events: CalEvent[] = useMemo(() => grupos.flatMap(g => {
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
      extendedProps: { grupoId: g.id, roster, profesor: g.profesor, aula: g.aula },
    }))
  }), [grupos, rosterByGrupo])

  // External drag source: student pills in the sidebar
  useEffect(() => {
    if (!sidebarRef.current) return
    const d = new Draggable(sidebarRef.current, {
      itemSelector: ".student-pill",
      eventData: (el) => ({ title: el.getAttribute("data-name") ?? "" }),
    })
    return () => d.destroy()
  }, [unassigned])

  function handleDrop(alumnoId: number, alumnoNombre: string, jsEvent: MouseEvent) {
    const targetEl = (jsEvent.target as HTMLElement)?.closest("[data-grupo-id]") as HTMLElement | null
    const grupoId = targetEl ? Number(targetEl.dataset.grupoId) : null
    if (!grupoId) return
    const grupo = grupos.find(g => g.id === grupoId)
    const currentRoster = rosterByGrupo.get(grupoId) ?? []
    if (!grupo) return
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
    const { roster, profesor } = arg.event.extendedProps as CalEvent["extendedProps"]
    return (
      <div className="px-1 py-[1px] overflow-hidden h-full leading-none" data-grupo-id={String(arg.event.extendedProps.grupoId)}>
        <div className="font-head text-[11px] leading-tight truncate">{arg.event.title}</div>
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
        <input type="text" placeholder="Buscar alumno…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-pine-600">
          Sin asignar ({unassigned.length})
        </p>
        <div ref={sidebarRef} className="flex-1 overflow-y-auto flex flex-wrap content-start gap-1.5 border-2 border-dashed border-khaki-300 rounded-lg p-2">
          {loadingAlumnos ? (
            <p className="text-xs text-pine-600">Cargando…</p>
          ) : unassigned.length === 0 ? (
            <p className="text-xs text-pine-600 italic">Todo el mundo está asignado ✓</p>
          ) : (
            unassigned.map(a => (
              <span key={a.id} className="student-pill text-xs font-semibold bg-white border border-khaki-300 text-pine-800 rounded-full px-2.5 py-1 cursor-grab select-none"
                data-name={a.nombre} data-alumno-id={a.id}>
                {a.nombre}
              </span>
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
                <p className="font-head font-normal text-lg text-pine-900">{selectedGrupo.nombre}</p>
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
