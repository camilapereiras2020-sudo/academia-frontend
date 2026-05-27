import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { pagosApi } from "@/features/pagos/api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { gruposApi } from "@/features/grupos/api"
import { formatEur, formatMonth } from "@/lib/utils"
import type { Pago } from "@/types"

const ESTADO_CLS: Record<string, string> = {
  pagado: "bg-green-100 text-green-800",
  pendiente: "bg-red-100 text-red-800",
  parcial: "bg-amber-100 text-amber-800",
}

function StatCard({ label, value, sub, colorClass }: { label: string; value: string; sub?: string; colorClass: string }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border-t-4 ${colorClass}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const qc = useQueryClient()
  const mesAct = new Date().toISOString().slice(0, 7)

  const { data: pagosRaw } = useQuery({
    queryKey: ["pagos"],
    queryFn: () => pagosApi.list().then(r => r.data),
  })
  const pagos: Pago[] = Array.isArray(pagosRaw) ? pagosRaw : (pagosRaw as any)?.results ?? []

  const { data: alumnosRaw } = useQuery({
    queryKey: ["alumnos"],
    queryFn: () => alumnosApi.list().then(r => r.data),
  })
  const alumnosCount: number = (Array.isArray(alumnosRaw) ? alumnosRaw : []).length

  const { data: gruposRaw } = useQuery({
    queryKey: ["grupos"],
    queryFn: () => gruposApi.list().then(r => r.data),
  })
  const gruposCount: number = (Array.isArray(gruposRaw) ? gruposRaw : []).length

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
  const estesMes = pagos.filter(p => p.periodo === mesAct)
  const cobradoMes = estesMes
    .filter(p => p.estado === "pagado")
    .reduce((s, p) => s + Number(p.total), 0)
  const pendientes = pagos.filter(p => p.estado === "pendiente" || p.estado === "parcial")
  const importePendiente = pendientes.reduce((s, p) => s + Number(p.total), 0)
  const recientes = [...pagos].sort((a, b) => b.id - a.id).slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Panel principal</h1>
          <p className="text-sm text-slate-500 mt-0.5">{formatMonth(mesAct)}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/asistencia"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            Pasar lista
          </Link>
          <Link to="/pagos"
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700">
            + Nuevo pago
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cobrado este mes"
          value={formatEur(cobradoMes)}
          sub={`${estesMes.filter(p => p.estado === "pagado").length} pagos`}
          colorClass="border-green-500"
        />
        <StatCard
          label="Pendiente de cobro"
          value={formatEur(importePendiente)}
          sub={`${pendientes.length} pagos sin cobrar`}
          colorClass="border-red-500"
        />
        <StatCard
          label="Alumnos"
          value={String(alumnosCount)}
          sub="registrados"
          colorClass="border-blue-500"
        />
        <StatCard
          label="Grupos activos"
          value={String(gruposCount)}
          sub="en curso"
          colorClass="border-violet-500"
        />
      </div>

      {/* Middle row: pending + birthdays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending payments */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Pagos pendientes</h2>
            <Link to="/pagos" className="text-xs text-blue-600 hover:text-blue-800">
              Ver todos →
            </Link>
          </div>
          {!pendientes.length && (
            <div className="px-5 py-10 text-center text-slate-400">
              <p className="text-2xl mb-1">✓</p>
              <p className="text-sm">Todo cobrado. Sin pendientes.</p>
            </div>
          )}
          <ul className="divide-y">
            {pendientes.slice(0, 6).map(p => (
              <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.alumno_nombre}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {p.pagador_nombre} · {formatMonth(p.periodo)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-semibold text-slate-800">{formatEur(Number(p.total))}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_CLS[p.estado]}`}>
                    {p.estado}
                  </span>
                  <button
                    onClick={() => marcarMut.mutate(p.id)}
                    disabled={marcarMut.isPending && marcarMut.variables === p.id}
                    className="text-xs px-2 py-1 border rounded text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    ✓
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {pendientes.length > 6 && (
            <div className="px-5 py-3 border-t bg-slate-50 text-center">
              <Link to="/pagos" className="text-xs text-blue-600 hover:text-blue-800">
                +{pendientes.length - 6} más → Ver todos
              </Link>
            </div>
          )}
        </div>

        {/* Upcoming birthdays */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Próximos cumpleaños</h2>
            <Link to="/cumpleanos" className="text-xs text-blue-600 hover:text-blue-800">
              Ver todos →
            </Link>
          </div>
          {!cumples.length && (
            <div className="px-5 py-10 text-center text-slate-400">
              <p className="text-2xl mb-1">🎂</p>
              <p className="text-sm">Sin cumpleaños en los próximos 30 días.</p>
            </div>
          )}
          <ul className="divide-y">
            {cumples.slice(0, 6).map((c: any) => (
              <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">
                  🎂
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{c.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(c.fnac).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {c.dias === 0
                    ? <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">¡Hoy!</span>
                    : c.dias === 1
                    ? <span className="text-xs font-semibold text-orange-600">Mañana</span>
                    : <span className="text-xs text-slate-500">en {c.dias} días</span>
                  }
                </div>
              </li>
            ))}
          </ul>
          {cumples.length > 6 && (
            <div className="px-5 py-3 border-t bg-slate-50 text-center">
              <Link to="/cumpleanos" className="text-xs text-blue-600 hover:text-blue-800">
                +{cumples.length - 6} más → Ver todos
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent payments */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Últimos pagos</h2>
          <Link to="/pagos" className="text-xs text-blue-600 hover:text-blue-800">Ver todos →</Link>
        </div>
        {!recientes.length && (
          <p className="px-6 py-8 text-sm text-slate-400 text-center">Sin pagos registrados.</p>
        )}
        {!!recientes.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {["Alumno", "Pagador", "Periodo", "Importe", "Método", "Estado", "Doc"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500 font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recientes.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{p.alumno_nombre}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.pagador_nombre}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatMonth(p.periodo)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{formatEur(Number(p.total))}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs capitalize whitespace-nowrap">{p.metodo}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_CLS[p.estado]}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{p.num_doc || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
