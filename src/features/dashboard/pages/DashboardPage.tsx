import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { pagosApi } from "@/features/pagos/api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { gruposApi } from "@/features/grupos/api"
import { PALETTE } from "@/features/grupos/palette"
import { formatEur, formatMonth } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import ReceptionSummary from "../components/ReceptionSummary"
import type { Pago, Grupo } from "@/types"

const ESTADO_CLS: Record<string, string> = {
  pagado:   "bg-green-100 text-green-800",
  pendiente: "bg-red-100 text-red-800",
  parcial:  "bg-amber-100 text-amber-800",
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// 0=Monday..6=Sunday, matching Grupo.horarios.dia (0-5, Mon-Sat; no Sunday classes)
function dow(year: number, month: number, day: number) {
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

function StatItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 flex items-center gap-2.5 px-4 py-3.5 border-r border-b border-khaki-300 last:border-r-0">
      <div className="w-1 self-stretch bg-brass-500 rounded-sm flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[10.5px] font-extrabold uppercase tracking-[0.03em] text-pine-700 leading-tight">{label}</div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <div className="font-head text-[18px] text-pine-800 whitespace-nowrap">{value}</div>
          {sub && <div className="text-[10.5px] text-pine-700 font-semibold whitespace-nowrap">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const isReception = useAuthStore((s) => s.user?.role === "reception")
  return isReception ? <ReceptionSummary /> : <OwnerDashboard />
}

function OwnerDashboard() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const mesAct = new Date().toISOString().slice(0, 7)
  const today = new Date()
  const todayDow = (today.getDay() + 6) % 7 // 0=Monday, matching Grupo.horarios.dia

  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const { data: pagosRaw } = useQuery({
    queryKey: ["pagos"],
    queryFn: () => pagosApi.list().then(r => r.data),
  })
  const pagos: Pago[] = Array.isArray(pagosRaw) ? pagosRaw : (pagosRaw as any)?.results ?? []

  const { data: alumnosRaw } = useQuery({
    queryKey: ["alumnos"],
    queryFn: () => alumnosApi.list().then(r => r.data),
  })
  const alumnosCount = (Array.isArray(alumnosRaw) ? alumnosRaw : []).length

  const { data: gruposRaw } = useQuery({
    queryKey: ["grupos"],
    queryFn: () => gruposApi.list().then(r => r.data),
  })
  const grupos: Grupo[] = Array.isArray(gruposRaw) ? gruposRaw : []

  const { data: cumpleRaw } = useQuery({
    queryKey: ["cumpleanos", 30],
    queryFn: () => alumnosApi.cumpleanos(30).then(r => r.data),
  })
  const cumples: any[] = Array.isArray(cumpleRaw) ? cumpleRaw : []

  const marcarMut = useMutation({
    mutationFn: pagosApi.marcarPagado,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagos"] }),
  })

  // Derived stats
  const estesMes       = pagos.filter(p => p.periodo === mesAct)
  const cobradoMes     = estesMes.filter(p => p.estado === "pagado").reduce((s, p) => s + Number(p.total), 0)
  const totalMes       = estesMes.reduce((s, p) => s + Number(p.total), 0)
  const coleccionRate  = totalMes > 0 ? Math.round((cobradoMes / totalMes) * 100) : null
  const pendientes     = pagos.filter(p => p.estado === "pendiente" || p.estado === "parcial")
  const importePendiente = pendientes.reduce((s, p) => s + Number(p.total), 0)
  const recientes      = [...pagos].sort((a, b) => b.id - a.id).slice(0, 6)

  // Today's timetable, computed from each group's weekly schedule
  const timetableHoy = grupos
    .flatMap(g => g.horarios.filter(h => h.dia === todayDow).map(h => ({ grupo: g, horario: h })))
    .sort((a, b) => a.horario.ini.localeCompare(b.horario.ini))

  const calendarDays = useMemo(() => buildMonthCells(calYear, calMonth), [calYear, calMonth])

  function clasesForDay(day: number) {
    const d = dow(calYear, calMonth, day)
    return grupos
      .flatMap(g => g.horarios.filter(h => h.dia === d).map(h => ({ grupo: g, horario: h })))
      .sort((a, b) => a.horario.ini.localeCompare(b.horario.ini))
  }

  function prevMonth() {
    setCalMonth(m => { if (m === 0) { setCalYear(y => y - 1); return 11 } return m - 1 })
  }
  function nextMonth() {
    setCalMonth(m => { if (m === 11) { setCalYear(y => y + 1); return 0 } return m + 1 })
  }
  function goToday() {
    setCalYear(today.getFullYear())
    setCalMonth(today.getMonth())
  }

  const isCurrentCalMonth = calYear === today.getFullYear() && calMonth === today.getMonth()
  const selectedDate = selectedDay != null ? new Date(calYear, calMonth, selectedDay) : null
  const selectedClases = selectedDay != null ? clasesForDay(selectedDay) : []

  return (
    <div className="flex flex-col gap-7">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-head text-[26px] font-normal text-pine-800">Station Overview</h1>
          <p className="text-[13px] text-pine-700 mt-1">{formatMonth(mesAct)}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Secondary action — plain text link, not a boxed button, so it
              doesn't visually compete with the one primary action. */}
          <Link to="/asistencia" className="text-pine-700 text-sm font-semibold no-underline hover:text-pine-900 hover:underline">
            Pasar lista
          </Link>
          <Link to="/pagos/nuevo" className="px-4 py-2 rounded-[5px] bg-brass-500 border-2 border-brass-700 text-pine-900 text-sm font-bold no-underline hover:bg-brass-300">
            + Nuevo pago
          </Link>
        </div>
      </div>

      {/* Stat ledger */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] bg-khaki-100 border-2 border-pine-800 rounded-md overflow-hidden">
        <StatItem label="Cobrado este mes" value={formatEur(cobradoMes)} sub={`${estesMes.filter(p => p.estado === "pagado").length} pagos`} />
        <StatItem label="Pendiente de cobro" value={formatEur(importePendiente)} sub={`${pendientes.length} sin cobrar`} />
        <StatItem label="Tasa de cobro" value={coleccionRate !== null ? `${coleccionRate}%` : "—"} sub={totalMes > 0 ? formatMonth(mesAct) : "sin pagos"} />
        <StatItem label="Alumnos" value={String(alumnosCount)} sub="registrados" />
        <StatItem label="Grupos activos" value={String(grupos.length)} sub="en curso" />
      </div>

      {/* Trail Log calendar (full monthly view, compact) + Today's Timetable
          side by side. `items-start` (not `items-stretch`) so the Trail Log
          card stays sized to its own content (a fixed 7-row calendar grid)
          instead of stretching its background down to match whatever height
          Today's Timetable happens to need — with the bigger fonts that grid
          could otherwise end up with a lot of empty background below it. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-5 items-start">

      <div className="relative bg-pine-800 border-2 border-pine-800 rounded-md p-4 pb-3 overflow-hidden">
        {/* Toned way down (was 0.08, four rings) — this is the highest-contrast
            card on the page but the lowest-information one, so the decoration
            shouldn't compete with the actual numbers for attention. */}
        <svg viewBox="0 0 200 160" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.035]">
          <circle cx="100" cy="80" r="40" fill="none" stroke="#F6F1E7" strokeWidth="2" />
          <circle cx="100" cy="80" r="80" fill="none" stroke="#F6F1E7" strokeWidth="2" />
        </svg>
        <div className="relative flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="text-[11px] font-bold text-brass-300 uppercase tracking-[0.05em]">🧭 Trail Log</div>
          <div className="flex items-center gap-2">
            <button onClick={goToday}
              className="px-2 py-0.5 rounded-md border border-white/20 text-[10.5px] font-semibold text-khaki-100 hover:bg-white/10">
              Hoy
            </button>
            <button onClick={prevMonth} aria-label="Mes anterior"
              className="w-6 h-6 rounded-md border border-white/20 text-khaki-100 hover:bg-white/10 text-[13px]">‹</button>
            <span className="font-head text-[13.5px] text-khaki-100 w-32 text-center">
              {capitalizeFirst(MESES[calMonth])} {calYear}
            </span>
            <button onClick={nextMonth} aria-label="Mes siguiente"
              className="w-6 h-6 rounded-md border border-white/20 text-khaki-100 hover:bg-white/10 text-[13px]">›</button>
          </div>
        </div>
        <div className="relative grid grid-cols-7 gap-1 text-[9.5px] font-extrabold uppercase text-khaki-300 text-center mb-1">
          {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="relative grid grid-cols-7 gap-1">
          {calendarDays.map((d, i) => {
            const isToday = isCurrentCalMonth && d.day === today.getDate()
            const clases = d.day != null ? clasesForDay(d.day) : []
            return (
              <button
                key={i}
                type="button"
                disabled={d.day == null}
                onClick={() => d.day != null && setSelectedDay(d.day)}
                title={clases.length ? `${clases.length} clase${clases.length === 1 ? "" : "s"}` : undefined}
                className={`h-7 rounded-md text-[11px] flex items-center justify-center gap-0.5 transition-colors ${
                  d.day == null ? "cursor-default" : "cursor-pointer hover:bg-white/10"
                } ${isToday ? "bg-brass-500 text-pine-900 font-extrabold" : "text-khaki-100"}`}
              >
                <span>{d.day ?? ""}</span>
                {clases.slice(0, 3).map((c, ci) => (
                  <span key={ci} className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ background: isToday ? "#1E3A2E" : PALETTE[c.grupo.color_idx % PALETTE.length].accent }} />
                ))}
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-khaki-100 border-2 border-pine-800 rounded-md overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-pine-800 font-head text-[16px] text-khaki-100 flex-shrink-0">🧭 Today's Timetable</div>
        <div className="px-5 py-2 pb-4 overflow-y-auto flex-1 min-h-0">
          {!timetableHoy.length && (
            <p className="text-sm text-pine-700 py-4 text-center">Sin clases programadas hoy.</p>
          )}
          {timetableHoy.map(({ grupo, horario }, i) => (
            <div key={`${grupo.id}-${i}`} className="flex items-center gap-3.5 py-2.5 border-b border-khaki-300 last:border-b-0">
              <div className="font-head text-[15px] text-pine-700 w-16 flex-shrink-0">{horario.ini}</div>
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-brass-500" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-pine-900 truncate">{grupo.nombre}</div>
                <div className="text-xs text-pine-700">{grupo.aula || "Sin aula asignada"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      </div>

      {/* Day detail — clicking a calendar cell opens this instead of jumping
          away to /calendario, so a quick look doesn't lose dashboard context. */}
      {selectedDate && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedDay(null) }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="font-head font-normal text-lg text-pine-900">
                {capitalizeFirst(selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }))}
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
        </div>,
        document.body
      )}

      {/* Ledger + side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">

        {/* Recent ledger entries */}
        <div className="bg-khaki-100 border-2 border-pine-800 rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-pine-800">
            <div className="font-head text-[16px] text-khaki-100">📖 Últimos pagos</div>
            <Link to="/pagos" className="text-[13px] font-bold text-brass-300 no-underline">Ver todos →</Link>
          </div>
          {!recientes.length && (
            <p className="px-5 py-8 text-sm text-pine-700 text-center">Sin pagos registrados.</p>
          )}
          {!!recientes.length && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {["Alumno", "Pagador", "Periodo", "Importe", "Estado"].map(h => (
                      <th key={h} className="text-left text-[12px] font-extrabold uppercase tracking-[0.05em] text-pine-700 px-3.5 py-2.5 border-b-2 border-pine-800 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recientes.map(p => (
                    <tr key={p.id}>
                      <td className="px-3.5 py-3 border-b border-khaki-300 font-bold text-[14px] text-pine-800 whitespace-nowrap">
                        {p.alumno ? <Link to={`/alumnos/${p.alumno}`} className="hover:text-brass-700 hover:underline">{p.alumno_nombre}</Link> : p.alumno_nombre}
                      </td>
                      <td className="px-3.5 py-3 border-b border-khaki-300 text-xs text-pine-700 whitespace-nowrap">{p.pagador_nombre}</td>
                      <td className="px-3.5 py-3 border-b border-khaki-300 text-xs text-pine-700 whitespace-nowrap">{formatMonth(p.periodo)}</td>
                      <td className="px-3.5 py-3 border-b border-khaki-300 font-bold text-[15px] text-pine-900 whitespace-nowrap">{formatEur(Number(p.total))}</td>
                      <td className="px-3.5 py-3 border-b border-khaki-300 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block text-xs font-extrabold uppercase tracking-[0.03em] px-2.5 py-1 rounded ${ESTADO_CLS[p.estado]}`}>
                            {p.estado}
                          </span>
                          {(p.estado === "pendiente" || p.estado === "parcial") && (
                            <button
                              onClick={() => marcarMut.mutate(p.id)}
                              disabled={marcarMut.isPending}
                              className="text-[11px] font-bold text-brass-700 border border-brass-500/50 rounded px-1.5 py-0.5 hover:bg-brass-500/10 disabled:opacity-50"
                              title="Marcar como pagado"
                            >
                              ✓ Marcar pagado
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-5">

          {/* Quick actions — the header up top only has room for one primary
              shortcut, so this is where the rest of the day-to-day jumps
              live. Also gives this column enough visual weight to sit next
              to the ledger table without reading as mostly empty space. */}
          <div className="bg-khaki-100 border-2 border-pine-800 rounded-md p-4.5 px-5">
            <div className="font-head text-[15px] text-pine-800 mb-3.5">⚡ Quick Actions</div>
            <div className="flex flex-col gap-2">
              <Link to="/asistencia" className="px-3.5 py-2.5 rounded-[5px] border-2 border-pine-800/20 text-pine-800 text-sm font-semibold no-underline hover:bg-pine-800/5 text-center">
                ✅ Pasar lista
              </Link>
              <Link to="/pagos/nuevo" className="px-3.5 py-2.5 rounded-[5px] bg-pine-800 text-khaki-100 text-sm font-semibold no-underline hover:bg-pine-700 text-center">
                + Nuevo pago
              </Link>
              <Link to="/horario" className="px-3.5 py-2.5 rounded-[5px] border-2 border-pine-800/20 text-pine-800 text-sm font-semibold no-underline hover:bg-pine-800/5 text-center">
                📅 Ver Horario
              </Link>
              <Link to="/crm" className="px-3.5 py-2.5 rounded-[5px] border-2 border-pine-800/20 text-pine-800 text-sm font-semibold no-underline hover:bg-pine-800/5 text-center">
                🧭 Ver CRM
              </Link>
            </div>
          </div>

          {/* Upcoming birthdays */}
          <div className="bg-khaki-100 border-2 border-pine-800 rounded-md p-4.5 px-5">
            <div className="font-head text-[15px] text-pine-800 mb-3">🎂 Upcoming Birthdays</div>
            {!cumples.length && (
              <p className="text-[13.5px] text-pine-700">Sin cumpleaños en los próximos 30 días.</p>
            )}
            {!!cumples.length && (
              <div className="flex flex-col gap-2">
                {cumples.slice(0, 6).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 text-[13.5px]">
                    <Link to={`/alumnos/${c.id}`} className="text-pine-900 font-semibold truncate hover:text-brass-700 hover:underline">{c.nombre}</Link>
                    <span className="text-pine-700 flex-shrink-0">
                      {c.dias_para_cumpleanos === 0 ? "¡hoy!" : c.dias_para_cumpleanos === 1 ? "mañana" : `en ${c.dias_para_cumpleanos}d`}
                    </span>
                  </div>
                ))}
                {cumples.length > 6 && (
                  <Link to="/cumpleanos" className="text-xs font-bold text-brass-700 no-underline mt-1">+{cumples.length - 6} más → Ver todos</Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
