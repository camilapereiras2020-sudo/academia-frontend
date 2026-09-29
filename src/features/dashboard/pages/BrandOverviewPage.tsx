import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { pagosApi } from "@/features/pagos/api"
import StatItem from "@/components/shared/StatItem"
import { formatEur, formatMonth } from "@/lib/utils"
import type { Pago, Marca } from "@/types"

const ESTADO_CLS: Record<string, string> = {
  pagado:   "bg-pine-100 text-pine-900",
  pendiente: "bg-red-100 text-red-800",
  parcial:  "bg-brass-300/40 text-brass-700",
}

// La parte financiera del Dashboard de siempre (cobrado/pendiente/tasa de
// cobro + últimos pagos), pero separada por marca — antes vivía combinada
// en /dashboard, lo que mezclaba la plata de Rangers Academy con la de
// Cami & Co en un solo número.
export default function BrandOverviewPage({ marca, titulo }: { marca: Marca; titulo: string }) {
  const qc = useQueryClient()
  const mesAct = new Date().toISOString().slice(0, 7)

  const { data: pagosRaw, isLoading } = useQuery({
    queryKey: ["pagos", "marca", marca],
    queryFn: () => pagosApi.list({ marca }).then(r => r.data),
  })
  const pagos: Pago[] = Array.isArray(pagosRaw) ? pagosRaw : (pagosRaw as any)?.results ?? []

  const marcarMut = useMutation({
    mutationFn: pagosApi.marcarPagado,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagos", "marca", marca] }),
  })

  const estesMes = pagos.filter(p => p.periodo === mesAct)
  // Una factura anulada sin reemplazo no cuenta como cobrado, aunque el
  // pago siga marcado "pagado" — ver PagoSerializer.documento_anulado.
  const cobradoMes = estesMes.filter(p => p.estado === "pagado" && !p.documento_anulado).reduce((s, p) => s + Number(p.total), 0)
  const totalMes = estesMes.reduce((s, p) => s + Number(p.total), 0)
  const coleccionRate = totalMes > 0 ? Math.round((cobradoMes / totalMes) * 100) : null
  const pendientes = pagos.filter(p => p.estado === "pendiente" || p.estado === "parcial")
  const importePendiente = pendientes.reduce((s, p) => s + Number(p.total), 0)
  const recientes = [...pagos].sort((a, b) => b.id - a.id).slice(0, 8)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">{titulo}</h1>
        <p className="page-subtitle">{formatMonth(mesAct)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatItem label="Cobrado este mes" value={formatEur(cobradoMes)} sub={`${estesMes.filter(p => p.estado === "pagado").length} pagos`} />
        <StatItem label="Pendiente de cobro" value={formatEur(importePendiente)} sub={`${pendientes.length} sin cobrar`} />
        <StatItem label="Tasa de cobro" value={coleccionRate !== null ? `${coleccionRate}%` : "—"} sub={totalMes > 0 ? formatMonth(mesAct) : "sin pagos"} />
      </div>

      <div className="card !bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-pine-900/10">
          <h2 className="font-head text-[18px] leading-tight text-pine-900">Últimos pagos — {titulo}</h2>
          <Link to="/pagos" className="font-label text-[14px] font-semibold text-brass-700 no-underline hover:underline">Ver todos →</Link>
        </div>
        {isLoading && <p className="px-5 py-8 text-[15px] text-ink-soft text-center">Cargando…</p>}
        {!isLoading && !recientes.length && (
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
                        <span className={`badge ${ESTADO_CLS[p.estado]}`}>{p.estado}</span>
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
    </div>
  )
}
