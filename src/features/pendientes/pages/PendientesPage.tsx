import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pagosApi } from "@/features/pagos/api"
import { formatEur, formatMonth } from "@/lib/utils"
import type { Pago } from "@/types"

export default function PendientesPage() {
  const qc = useQueryClient()
  const { data: raw, isLoading } = useQuery({
    queryKey: ["pagos-pendientes"],
    queryFn: () => pagosApi.list({ estado: "pendiente" }).then(r => r.data),
  })
  const pagos: Pago[] = Array.isArray(raw) ? raw : (raw as any)?.results || []

  const marcarMut = useMutation({
    mutationFn: pagosApi.marcarPagado,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pagos-pendientes"] })
      qc.invalidateQueries({ queryKey: ["pagos"] })
    },
  })

  const totalPendiente = pagos.reduce((s, p) => s + Number(p.total), 0)

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pagos pendientes</h1>
          <p className="text-sm text-slate-500 mt-1">{pagos.length} pagos por cobrar — {formatEur(totalPendiente)} total</p>
        </div>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}
      {!isLoading && !pagos.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">✅</span><p className="text-sm">No hay pagos pendientes. Todo al dia!</p>
        </div>
      )}

      <div className="space-y-3">
        {pagos.map(p => (
          <div key={p.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">{p.alumno_nombre} <span className="text-xs text-slate-400">→ {p.pagador_nombre}</span></p>
              <p className="text-xs text-slate-500 mt-0.5">{p.grupo_nombre} · {formatMonth(p.periodo)}</p>
            </div>
            <p className="text-lg font-bold text-red-600">{formatEur(Number(p.total))}</p>
            <button onClick={() => marcarMut.mutate(p.id)} disabled={marcarMut.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              ✓ Marcar cobrado
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
