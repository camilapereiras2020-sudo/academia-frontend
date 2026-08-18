import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { gruposApi } from "@/features/grupos/api"
import { PALETTE } from "@/features/grupos/palette"

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

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
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["grupos"],
    queryFn: () => gruposApi.list().then(r => r.data),
  })
  const grupos = Array.isArray(data) ? data : []

  const cells = useMemo(() => buildMonthCells(year, month), [year, month])

  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDay(today.getDate())
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

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-head font-normal text-3xl text-pine-900">Calendario</h1>
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
              <div key={d} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-pine-700">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const isToday = isCurrentMonth && cell.day === today.getDate()
              const clases = cell.day != null ? clasesForDay(cell.day) : []
              return (
                <button
                  key={idx}
                  disabled={cell.day == null}
                  onClick={() => cell.day != null && setSelectedDay(cell.day)}
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
                              className="text-[10px] px-1.5 py-0.5 rounded truncate"
                              style={{ background: palette.bg, color: palette.text }}>
                              {horario.ini} {grupo.nombre}
                            </span>
                          )
                        })}
                        {clases.length > 3 && (
                          <span className="text-[10px] text-pine-600">+{clases.length - 3} más</span>
                        )}
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
          onClick={e => { if (e.target === e.currentTarget) setSelectedDay(null) }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="font-head font-normal text-lg text-pine-900 capitalize">
                {selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <button onClick={() => setSelectedDay(null)} className="text-khaki-400 hover:text-pine-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-2">
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
                        <p className="text-xs text-pine-600">{horario.ini} – {horario.fin}{grupo.aula ? ` · ${grupo.aula}` : ""}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
