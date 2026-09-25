import { useMemo, useState, type ReactNode } from "react"
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
import { useOverlayMouseGuard } from "@/hooks/useOverlayMouseGuard"

const ESTADO_CLS: Record<string, string> = {
  pagado:    "bg-pine-100 text-pine-900",
  pendiente: "bg-red-100 text-red-800",
  parcial:   "bg-brass-300/40 text-brass-700",
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
    <div className="stat-card min-w-0 !px-4 !py-4">
      <div className="font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-soft leading-tight">{label}</div>
      <div className="font-head text-[24px] leading-tight text-pine-900 mt-1.5 whitespace-nowrap">{value}</div>
      {sub && <div className="text-[13px] text-ink-soft mt-0.5 whitespace-nowrap">{sub}</div>}
    </div>
  )
}

function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-pine-900/10">
      <h2 className="font-head text-[18px] leading-tight text-pine-900">{title}</h2>
      {action}
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
  const dayModalOverlayGuard = useOverlayMouseGuard(() => setSelectedDay(null))

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
    <div className="flex flex-col gap-6">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Resumen</h1>
          <p className="page-subtitle">{capitalizeFirst(formatMonth(mesAct))}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/asistencia" className="btn-ghost inline-flex items-center no-underline">
            Pasar lista
          </Link>
          <Link to="/pagos/nuevo" className="btn-primary inline-flex items-center no-underline">
            + Nuevo pago
          </Link>
        </div>
      </div>

      {/* Cifras */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatItem label="Cobrado este mes" value={formatEur(cobradoMes)} sub={`${estesMes.filter(p => p.estado === "pagado").length} pagos`} />
        <StatItem label="Pendiente de cobro" value={formatEur(importePendiente)} sub={`${pendientes.length} sin cobrar`} />
        <StatItem label="Tasa de cobro" value={coleccionRate !== null ? `${coleccionRate}%` : "—"} sub={totalMes > 0 ? formatMonth(mesAct) : "sin pagos"} />
        <StatItem label="Alumnos" value={String(alumnosCount)} sub="registrados" />
        <StatItem label="Grupos activos" value={String(grupos.length)} sub="en curso" />
      </div>

      {/* Calendario + clases de hoy. `items-start` so the calendar card
          keeps its own height instead of stretching to match the list. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-5 items-start">

        <div className="card !bg-white overflow-hidden">
          <CardHeader
            title={`${capitalizeFirst(MESES[calMonth])} ${calYear}`}
            action={
              <div className="flex items-center gap-1.5">
                <button onClick={goToday} className="btn-ghost !min-h-[40px] !px-3 !text-[14px]">Hoy</button>
                <button onClick={prevMonth} aria-label="Mes anterior"
                  className="w-10 h-10 rounded-[10px] border border-pine-900/20 text-pine-900 hover:bg-pine-900/5 text-[18px] leading-none">‹</button>
                <button onClick={nextMonth} aria-label="Mes siguiente"
                  className="w-10 h-10 rounded-[10px] border border-pine-900/20 text-pine-900 hover:bg-pine-900/5 text-[18px] leading-none">›</button>
              </div>
            }
          />
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 font-label text-[12px] font-semibold uppercase text-ink-soft text-center mb-1.5">
              {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
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
                    className={`h-11 rounded-[10px] text-[15px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                      d.day == null ? "cursor-default" : "cursor-pointer hover:bg-khaki-100"
                    } ${isToday ? "bg-pine-900 text-khaki-100 font-bold hover:!bg-pine-800" : "text-ink"}`}
                  >
                    <span className="leading-none">{d.day ?? ""}</span>
                    {!!clases.length && (
                      <span className="flex gap-0.5 h-1">
                        {clases.slice(0, 3).map((c, ci) => (
                          <span key={ci} className="w-1 h-1 rounded-full"
                            style={{ background: isToday ? "#C8A45A" : PALETTE[c.grupo.color_idx % PALETTE.length].accent }} />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card !bg-white overflow-hidden flex flex-col">
          <CardHeader title="Clases de hoy" />
          <div className="px-5 py-1 overflow-y-auto flex-1 min-h-0">
            {!timetableHoy.length && (
              <p className="text-[15px] text-ink-soft py-8 text-center">Sin clases programadas hoy.</p>
            )}
            {timetableHoy.map(({ grupo, horario }, i) => (
              <div key={`${grupo.id}-${i}`}
                className="flex items-center gap-4 min-h-[56px] py-2.5 border-b border-pine-900/10 last:border-b-0">
                <div className="font-head text-[16px] text-pine-900 w-14 flex-shrink-0">{horario.ini}</div>
                <span className="w-1.5 h-9 rounded-full flex-shrink-0"
                  style={{ background: PALETTE[grupo.color_idx % PALETTE.length].accent }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-ink truncate">{grupo.nombre}</div>
                  <div className="text-[13px] text-ink-soft">{grupo.aula || "Sin aula asignada"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day detail — clicking a calendar cell opens this instead of jumping
          away to /calendario, so a quick look doesn't lose dashboard context. */}
      {selectedDate && createPortal(
        <div className="modal-overlay" {...dayModalOverlayGuard}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
            <div className="pl-6 pr-3 py-3 border-b border-pine-900/10 flex items-center justify-between flex-shrink-0">
              <h2 className="font-head text-[20px] text-pine-900">
                {capitalizeFirst(selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }))}
              </h2>
              <button onClick={() => setSelectedDay(null)} aria-label="Cerrar"
                className="w-11 h-11 rounded-[10px] text-ink-soft hover:bg-khaki-100 hover:text-pine-900 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-2">
              {selectedClases.length === 0 ? (
                <p className="text-[15px] text-ink-soft">Sin clases programadas este día.</p>
              ) : (
                selectedClases.map(({ grupo, horario }, i) => {
                  const palette = PALETTE[grupo.color_idx % PALETTE.length]
                  return (
                    <button key={i} onClick={() => navigate(`/grupos/${grupo.id}`)}
                      className="w-full flex items-center gap-3 min-h-[56px] p-3 rounded-[10px] border text-left hover:bg-khaki-100 transition-colors"
                      style={{ borderColor: palette.border }}>
                      <span className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: palette.accent }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[15px] text-ink truncate">{grupo.nombre}</p>
                        <p className="text-[13px] text-ink-soft">
                          {horario.ini} – {horario.fin}{grupo.aula ? ` · ${grupo.aula}` : ""}{grupo.profesor_nombre ? ` · ${grupo.profesor_nombre}` : ""}
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

      {/* Pagos + paneles laterales */}
      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 items-start">

        <div className="card !bg-white overflow-hidden">
          <CardHeader
            title="Últimos pagos"
            action={<Link to="/pagos" className="font-label text-[14px] font-semibold text-brass-700 no-underline hover:underline">Ver todos →</Link>}
          />
          {!recientes.length && (
            <p className="px-5 py-8 text-[15px] text-ink-soft text-center">Sin pagos registrados.</p>
          )}
          {!!recientes.length && (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {["Alumno", "Pagador", "Periodo", "Importe", "Estado"].map(h => (
                      <th key={h} className="whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recientes.map(p => (
                    <tr key={p.id}>
                      <td className="font-semibold whitespace-nowrap">
                        {p.alumno ? <Link to={`/alumnos/${p.alumno}`} className="text-ink hover:text-brass-700 hover:underline">{p.alumno_nombre}</Link> : p.alumno_nombre}
                      </td>
                      <td className="!text-ink-soft whitespace-nowrap">{p.pagador_nombre}</td>
                      <td className="!text-ink-soft whitespace-nowrap">{formatMonth(p.periodo)}</td>
                      <td className="font-semibold whitespace-nowrap">{formatEur(Number(p.total))}</td>
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`badge ${ESTADO_CLS[p.estado]}`}>
                            {p.estado}
                          </span>
                          {(p.estado === "pendiente" || p.estado === "parcial") && (
                            <button
                              onClick={() => marcarMut.mutate(p.id)}
                              disabled={marcarMut.isPending}
                              className="btn-ghost !min-h-[40px] !px-3 !text-[14px] disabled:opacity-50"
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

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-1 gap-5 items-start">

          {/* Accesos rápidos */}
          <div className="card !bg-white overflow-hidden">
            <CardHeader title="Accesos rápidos" />
            <div className="p-4 grid grid-cols-1 gap-2">
              <Link to="/pagos/nuevo" className="btn-primary inline-flex items-center justify-center no-underline">+ Nuevo pago</Link>
              <Link to="/asistencia" className="btn-ghost inline-flex items-center justify-center no-underline">Pasar lista</Link>
              <Link to="/horario" className="btn-ghost inline-flex items-center justify-center no-underline">Ver horario</Link>
              <Link to="/crm" className="btn-ghost inline-flex items-center justify-center no-underline">Ver CRM</Link>
            </div>
          </div>

          {/* Próximos cumpleaños */}
          <div className="card !bg-white overflow-hidden">
            <CardHeader title="Próximos cumpleaños" />
            <div className="px-5 py-3">
              {!cumples.length && (
                <p className="text-[15px] text-ink-soft py-2">Sin cumpleaños en los próximos 30 días.</p>
              )}
              {!!cumples.length && (
                <div className="flex flex-col">
                  {cumples.slice(0, 6).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 min-h-[44px] border-b border-pine-900/10 last:border-b-0 text-[15px]">
                      <Link to={`/alumnos/${c.id}`} className="text-ink font-semibold truncate hover:text-brass-700 hover:underline">{c.nombre}</Link>
                      <span className={`flex-shrink-0 font-label font-semibold ${c.dias_para_cumpleanos === 0 ? "text-brass-700" : "text-ink-soft"}`}>
                        {c.dias_para_cumpleanos === 0 ? "¡hoy!" : c.dias_para_cumpleanos === 1 ? "mañana" : `en ${c.dias_para_cumpleanos} días`}
                      </span>
                    </div>
                  ))}
                  {cumples.length > 6 && (
                    <Link to="/cumpleanos" className="font-label text-[14px] font-semibold text-brass-700 no-underline py-2.5">+{cumples.length - 6} más → Ver todos</Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
