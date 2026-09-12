import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { gruposApi } from "@/features/grupos/api"
import { PALETTE } from "@/features/grupos/palette"
import { avisosApi } from "@/features/avisos/api"
import { useOverlayMouseGuard } from "@/hooks/useOverlayMouseGuard"
import { useAuthStore } from "@/store/authStore"

function pad(n: number) { return String(n).padStart(2, "0") }
function isoDate(year: number, month: number, day: number) { return `${year}-${pad(month + 1)}-${pad(day)}` }

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function dow(year: number, month: number, day: number) {
  // 0=Monday..6=Sunday, matching Grupo.horarios.dia (0-5, Mon-Sat; no Sunday classes)
  return (new Date(year, month, day).getDay() + 6) % 7
}

function buildMonthCells(year: number, month: number) {
  const firstDow = dow(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: { day: number | null }[] = []
  for (let i = 0; i < firstDow; i++) cells.push({ day: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d })
  return cells
}

export default function CalendarioPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const myId = useAuthStore(s => s.user?.id)
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const dayModalOverlayGuard = useOverlayMouseGuard(() => openDay(null))
  const [nuevaTarea, setNuevaTarea] = useState("")
  const [nuevaTareaPara, setNuevaTareaPara] = useState<number | "">("")

  const { data, isLoading } = useQuery({
    queryKey: ["grupos"],
    queryFn: () => gruposApi.list().then(r => r.data),
  })
  const grupos = Array.isArray(data) ? data : []

  const cells = useMemo(() => buildMonthCells(year, month), [year, month])
  const rangoDesde = isoDate(year, month, 1)
  const rangoHasta = isoDate(year, month, new Date(year, month + 1, 0).getDate())

  const { data: tareasRaw } = useQuery({
    queryKey: ["avisos", "calendario", rangoDesde, rangoHasta],
    queryFn: () => avisosApi.list({ desde: rangoDesde, hasta: rangoHasta }).then(r => r.data),
  })
  const tareas = tareasRaw ?? []

  const { data: equipoRaw } = useQuery({
    queryKey: ["avisos", "equipo"],
    queryFn: () => avisosApi.equipo().then(r => r.data),
  })
  const equipo = (equipoRaw ?? []).filter(u => u.id !== myId)

  const crearTareaMut = useMutation({
    mutationFn: () => avisosApi.create({
      titulo: nuevaTarea.trim(), fecha: isoDate(year, month, selectedDay!), para: nuevaTareaPara || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avisos"] })
      setNuevaTarea(""); setNuevaTareaPara("")
    },
  })
  const toggleTareaMut = useMutation({
    mutationFn: ({ id, hecha }: { id: number; hecha: boolean }) => avisosApi.update(id, { hecha }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avisos"] }),
  })
  const eliminarTareaMut = useMutation({
    mutationFn: (id: number) => avisosApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avisos"] }),
  })

  function tareasForDay(day: number) {
    const iso = isoDate(year, month, day)
    return tareas.filter(t => t.fecha === iso)
  }

  function openDay(day: number | null) {
    setSelectedDay(day)
    setNuevaTarea("")
    setNuevaTareaPara("")
  }

  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    openDay(today.getDate())
  }
  function prevMonth() {
    setMonth(m => { if (m === 0) { setYear(y => y - 1); return 11 } return m - 1 })
  }
  function nextMonth() {
    setMonth(m => { if (m === 11) { setYear(y => y + 1); return 0 } return m + 1 })
  }

  function clasesForDay(day: number) {
    const d = dow(year, month, day)
    return grupos
      .flatMap(g => g.horarios.filter(h => h.dia === d).map(h => ({ grupo: g, horario: h })))
      .sort((a, b) => a.horario.ini.localeCompare(b.horario.ini))
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const selectedDate = selectedDay != null ? new Date(year, month, selectedDay) : null
  const selectedClases = selectedDay != null ? clasesForDay(selectedDay) : []
  const selectedTareas = selectedDay != null ? tareasForDay(selectedDay) : []

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif font-light text-[2.5rem] leading-none tracking-[-0.01em] text-pine-900">Calendario</h1>
          <p className="text-sm text-pine-700 mt-1">Clases programadas por semana. Reuniones y feriados, próximamente.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday}
            className="px-3 py-1.5 rounded-lg border border-khaki-300 text-sm font-medium text-pine-700 hover:bg-khaki-100">
            Hoy
          </button>
          <button onClick={prevMonth} aria-label="Mes anterior"
            className="w-8 h-8 rounded-lg border border-khaki-300 text-pine-700 hover:bg-khaki-100">‹</button>
          <span className="font-head font-normal text-lg text-pine-900 w-40 text-center">
            {MESES[month]} {year}
          </span>
          <button onClick={nextMonth} aria-label="Mes siguiente"
            className="w-8 h-8 rounded-lg border border-khaki-300 text-pine-700 hover:bg-khaki-100">›</button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-pine-600">Cargando…</p>
      ) : (
        <div className="bg-white rounded-2xl border border-khaki-300 overflow-hidden">
          <div className="grid grid-cols-7 bg-khaki-100 border-b border-khaki-300">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="px-2 py-2 text-center text-[13px] font-bold uppercase tracking-wider text-pine-700">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const isToday = isCurrentMonth && cell.day === today.getDate()
              const clases = cell.day != null ? clasesForDay(cell.day) : []
              const tareasDia = cell.day != null ? tareasForDay(cell.day) : []
              return (
                <button
                  key={idx}
                  disabled={cell.day == null}
                  onClick={() => cell.day != null && openDay(cell.day)}
                  className={`min-h-[92px] p-2 border-b border-r border-khaki-200 text-left align-top flex flex-col gap-1 transition-colors ${
                    cell.day == null ? "bg-khaki-100/40 cursor-default" : "bg-white hover:bg-khaki-100 cursor-pointer"
                  }`}
                >
                  {cell.day != null && (
                    <>
                      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? "bg-brass-500 text-white" : "text-pine-700"
                      }`}>
                        {cell.day}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {clases.slice(0, 3).map(({ grupo, horario }, i) => {
                          const palette = PALETTE[grupo.color_idx % PALETTE.length]
                          return (
                            <span key={i}
                              className="text-[11px] px-1.5 py-0.5 rounded truncate"
                              style={{ background: palette.bg, color: palette.text }}>
                              {horario.ini} {grupo.nombre}
                            </span>
                          )
                        })}
                        {clases.length > 3 && (
                          <span className="text-[11px] text-pine-600">+{clases.length - 3} más</span>
                        )}
                        {tareasDia.slice(0, 2).map(t => (
                          <span key={t.id}
                            className={`text-[11px] px-1.5 py-0.5 rounded truncate border ${
                              t.hecha ? "border-khaki-300 text-pine-400 line-through" : "border-brass-500/50 text-brass-700 bg-brass-500/10"
                            }`}>
                            ✓ {t.titulo}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectedDate && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          {...dayModalOverlayGuard}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="font-head font-normal text-lg text-pine-900">
                {capitalizeFirst(selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }))}
              </h2>
              <button onClick={() => openDay(null)} className="text-khaki-400 hover:text-pine-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-pine-600">Tareas</p>
                {!selectedTareas.length && (
                  <p className="text-sm text-pine-600">Sin tareas para este día.</p>
                )}
                {selectedTareas.map(t => (
                  <div key={t.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-khaki-200">
                    <input
                      type="checkbox"
                      checked={t.hecha}
                      onChange={() => toggleTareaMut.mutate({ id: t.id, hecha: !t.hecha })}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${t.hecha ? "line-through text-pine-400" : "text-pine-900"}`}>{t.titulo}</p>
                      {t.para_nombre && <p className="text-xs text-pine-600">Para {t.para_nombre}</p>}
                    </div>
                    <button
                      onClick={() => eliminarTareaMut.mutate(t.id)}
                      aria-label="Quitar tarea"
                      className="text-khaki-400 hover:text-red-600 text-sm flex-shrink-0"
                    >✕</button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <input
                    value={nuevaTarea}
                    onChange={e => setNuevaTarea(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && nuevaTarea.trim() && crearTareaMut.mutate()}
                    placeholder="Nueva tarea..."
                    className="flex-1 min-w-[10rem] border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500"
                  />
                  <select
                    value={nuevaTareaPara}
                    onChange={e => setNuevaTareaPara(e.target.value ? Number(e.target.value) : "")}
                    className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500"
                  >
                    <option value="">Sin asignar</option>
                    {equipo.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                  <button
                    onClick={() => crearTareaMut.mutate()}
                    disabled={!nuevaTarea.trim() || crearTareaMut.isPending}
                    className="px-3 py-1.5 rounded-lg bg-brass-500 text-white text-sm font-semibold hover:bg-brass-700 disabled:opacity-50"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-pine-600">Clases</p>
                {selectedClases.length === 0 ? (
                  <p className="text-sm text-pine-600">Sin clases programadas este día.</p>
                ) : (
                  selectedClases.map(({ grupo, horario }, i) => {
                    const palette = PALETTE[grupo.color_idx % PALETTE.length]
                    return (
                      <button key={i} onClick={() => navigate(`/grupos/${grupo.id}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border text-left hover:bg-khaki-100 transition-colors"
                        style={{ borderColor: palette.border }}>
                        <span className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: palette.accent }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-pine-900 truncate">{grupo.nombre}</p>
                          <p className="text-xs text-pine-600">
                            {horario.ini} – {horario.fin}{grupo.aula ? ` · ${grupo.aula}` : ""}{grupo.profesor_nombre ? ` · 🧑‍🏫 ${grupo.profesor_nombre}` : ""}
                          </p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
