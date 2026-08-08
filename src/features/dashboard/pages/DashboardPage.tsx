import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { pagosApi } from "@/features/pagos/api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { gruposApi } from "@/features/grupos/api"
import { formatEur, formatMonth } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import ReceptionSummary from "../components/ReceptionSummary"
import type { Pago, Grupo } from "@/types"

const ESTADO_CLS: Record<string, string> = {
  pagado:   "bg-green-100 text-green-800",
  pendiente: "bg-red-100 text-red-800",
  parcial:  "bg-amber-100 text-amber-800",
}

function buildCalendar() {
  const now = new Date()
  const year = now.getFullYear(), month = now.getMonth(), today = now.getDate()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: { num: number | null; isToday: boolean }[] = []
  for (let i = 0; i < firstDow; i++) cells.push({ num: null, isToday: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ num: d, isToday: d === today })
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
  const mesAct = new Date().toISOString().slice(0, 7)
  const today = new Date()
  const todayDow = (today.getDay() + 6) % 7 // 0=Monday, matching Grupo.horarios.dia

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

  const calendarDays = buildCalendar()

  return (
    <div className="flex flex-col gap-7">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-head text-[26px] font-normal text-pine-800">Station Overview</h1>
          <p className="text-[13px] text-pine-700 mt-1">{formatMonth(mesAct)}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/asistencia" className="px-4 py-2 rounded-[5px] border-2 border-pine-800/25 text-pine-700 text-sm font-semibold no-underline hover:bg-pine-800/5">
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

      {/* Trail Log calendar + Today's timetable */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-5">

        <div className="relative bg-pine-800 border-2 border-pine-800 rounded-md p-5 pb-4.5 overflow-hidden">
          <svg viewBox="0 0 200 160" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.08]">
            <circle cx="100" cy="80" r="20" fill="none" stroke="#F6F1E7" strokeWidth="2" />
            <circle cx="100" cy="80" r="40" fill="none" stroke="#F6F1E7" strokeWidth="2" />
            <circle cx="100" cy="80" r="60" fill="none" stroke="#F6F1E7" strokeWidth="2" />
            <circle cx="100" cy="80" r="80" fill="none" stroke="#F6F1E7" strokeWidth="2" />
          </svg>
          <div className="relative text-[11px] font-bold text-brass-300 uppercase tracking-[0.05em] mb-2">🧭 Trail Log</div>
          <div className="relative flex items-baseline justify-between mb-3.5">
            <div className="font-head text-[16px] text-khaki-100">
              {today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="relative grid grid-cols-7 gap-1.5 text-[10.5px] font-extrabold uppercase text-khaki-300 text-center mb-2">
            {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="relative grid grid-cols-7 gap-1.5">
            {calendarDays.map((d, i) => (
              <div
                key={i}
                className={`aspect-square flex items-center justify-center text-[12.5px] rounded-full ${
                  d.isToday ? "bg-brass-500 text-pine-900 font-extrabold" : d.num !== null ? "text-khaki-100 font-medium border border-white/10" : ""
                }`}
              >
                {d.num ?? ""}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-khaki-100 border-2 border-pine-800 rounded-md overflow-hidden">
          <div className="px-5 py-4 bg-pine-800 font-head text-[16px] text-khaki-100">🧭 Today's Timetable</div>
          <div className="px-5 py-2 pb-4">
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
                      <td className="px-3.5 py-3 border-b border-khaki-300 font-bold text-pine-800 whitespace-nowrap">{p.alumno_nombre}</td>
                      <td className="px-3.5 py-3 border-b border-khaki-300 text-pine-700 whitespace-nowrap">{p.pagador_nombre}</td>
                      <td className="px-3.5 py-3 border-b border-khaki-300 text-pine-700 whitespace-nowrap">{formatMonth(p.periodo)}</td>
                      <td className="px-3.5 py-3 border-b border-khaki-300 font-bold text-pine-900 whitespace-nowrap">{formatEur(Number(p.total))}</td>
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

          {/* Quick actions */}
          <div className="bg-khaki-100 border-2 border-pine-800 rounded-md p-4.5 px-5">
            <div className="font-head text-[15px] text-pine-800 mb-3.5">⚡ Quick Actions</div>
            <div className="flex flex-col gap-2">
              <Link to="/asistencia" className="px-3.5 py-2.5 rounded-[5px] border-2 border-pine-800/20 text-pine-800 text-sm font-semibold no-underline hover:bg-pine-800/5 text-center">
                ✅ Pasar lista
              </Link>
              <Link to="/pagos/nuevo" className="px-3.5 py-2.5 rounded-[5px] bg-pine-800 text-khaki-100 text-sm font-semibold no-underline hover:bg-pine-700 text-center">
                + Nuevo pago
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
                    <span className="text-pine-900 font-semibold truncate">{c.nombre}</span>
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
