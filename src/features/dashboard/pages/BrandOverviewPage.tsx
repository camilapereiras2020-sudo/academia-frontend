import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { pagosApi } from "@/features/pagos/api"
import StatItem from "@/components/shared/StatItem"
import { formatEur, formatMonth } from "@/lib/utils"
import type { Pago, Marca } from "@/types"

const ESTADO_CLS: Record<string, string> = {
  pagado:   "bg-green-100 text-green-800",
  pendiente: "bg-red-100 text-red-800",
  parcial:  "bg-amber-100 text-amber-800",
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
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="font-serif font-light text-[2rem] sm:text-[2.5rem] leading-none tracking-[-0.01em] text-pine-800">{titulo}</h1>
        <p className="text-[13px] text-pine-700 mt-1">{formatMonth(mesAct)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 bg-khaki-100 border-2 border-pine-800 rounded-md overflow-hidden">
        <StatItem label="Cobrado este mes" value={formatEur(cobradoMes)} sub={`${estesMes.filter(p => p.estado === "pagado").length} pagos`} />
        <StatItem label="Pendiente de cobro" value={formatEur(importePendiente)} sub={`${pendientes.length} sin cobrar`} />
        <StatItem label="Tasa de cobro" value={coleccionRate !== null ? `${coleccionRate}%` : "—"} sub={totalMes > 0 ? formatMonth(mesAct) : "sin pagos"} />
      </div>

      <div className="bg-khaki-100 border-2 border-pine-800 rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-pine-800">
          <div className="font-head text-[16px] text-khaki-100">📖 Últimos pagos — {titulo}</div>
          <Link to="/pagos" className="text-[13px] font-bold text-brass-300 no-underline">Ver todos →</Link>
        </div>
        {isLoading && <p className="px-5 py-8 text-sm text-pine-700 text-center">Cargando…</p>}
        {!isLoading && !recientes.length && (
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
                            className="text-[13px] font-bold text-brass-700 border border-brass-500/50 rounded px-1.5 py-0.5 hover:bg-brass-500/10 disabled:opacity-50"
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
