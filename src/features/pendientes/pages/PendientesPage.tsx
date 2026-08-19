import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pagosApi } from "@/features/pagos/api"
import { formatEur, formatMonth } from "@/lib/utils"
import type { Pago } from "@/types"

const ESTADO_CLS: Record<string, string> = {
  pendiente: "bg-red-100 text-red-800",
  parcial:   "bg-amber-100 text-amber-800",
}

export default function PendientesPage() {
  const qc = useQueryClient()
  const [errorId, setErrorId] = useState<number | null>(null)

  const { data: rawPendiente, isLoading: loadingPendiente } = useQuery({
    queryKey: ["pagos-pendientes"],
    queryFn: () => pagosApi.list({ estado: "pendiente" }).then(r => r.data),
  })
  const { data: rawParcial, isLoading: loadingParcial } = useQuery({
    queryKey: ["pagos-parcial"],
    queryFn: () => pagosApi.list({ estado: "parcial" }).then(r => r.data),
  })

  const pendientes: Pago[] = Array.isArray(rawPendiente) ? rawPendiente : (rawPendiente as any)?.results ?? []
  const parciales: Pago[] = Array.isArray(rawParcial)  ? rawParcial  : (rawParcial  as any)?.results ?? []
  const todos = [...pendientes, ...parciales].sort((a, b) => a.periodo.localeCompare(b.periodo))

  const isLoading = loadingPendiente || loadingParcial
  const total = todos.reduce((s, p) => s + Number(p.total), 0)

  const marcarMut = useMutation({
    mutationFn: pagosApi.marcarPagado,
    onSuccess: () => {
      setErrorId(null)
      qc.invalidateQueries({ queryKey: ["pagos-pendientes"] })
      qc.invalidateQueries({ queryKey: ["pagos-parcial"] })
      qc.invalidateQueries({ queryKey: ["pagos"] })
    },
    onError: (_err, id) => setErrorId(id),
  })

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-head font-normal text-3xl text-pine-900">Pagos pendientes</h1>
          <p className="text-sm text-pine-700 mt-1">
            {todos.length} pago{todos.length !== 1 ? "s" : ""} por cobrar
            {todos.length > 0 && <span className="font-semibold text-red-600 ml-1">— {formatEur(total)}</span>}
          </p>
        </div>
      </div>

      {isLoading && <p className="text-khaki-400 text-sm">Cargando...</p>}

      {!isLoading && !todos.length && (
        <div className="flex flex-col items-center justify-center py-16 text-khaki-400">
          <span className="text-5xl mb-3">✅</span>
          <p className="text-sm font-medium text-green-600">Todo al día. Sin pagos pendientes.</p>
        </div>
      )}

      {/* Summary by period */}
      {todos.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-pine-600 mb-3">Resumen por periodo</p>
          <div className="flex flex-wrap gap-3">
            {Array.from(new Set(todos.map(p => p.periodo))).sort().map(periodo => {
              const slice = todos.filter(p => p.periodo === periodo)
              const sum = slice.reduce((s, p) => s + Number(p.total), 0)
              return (
                <div key={periodo} className="bg-khaki-100 rounded-lg px-3 py-2 text-sm">
                  <span className="font-medium text-pine-700">{formatMonth(periodo)}</span>
                  <span className="text-pine-700 ml-2">{slice.length} pagos · {formatEur(sum)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {todos.map(p => (
          <div key={p.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-pine-900">{p.alumno_nombre}</span>
                <span className="text-xs text-pine-600">→ {p.pagador_nombre}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_CLS[p.estado]}`}>
                  {p.estado}
                </span>
              </div>
              <p className="text-xs text-pine-700 mt-0.5">
                {p.grupo_nombre && <span>{p.grupo_nombre} · </span>}
                {formatMonth(p.periodo)}
                {p.metodo && <span className="ml-1 capitalize">· {p.metodo}</span>}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-lg font-bold text-red-600">{formatEur(Number(p.total))}</span>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => { setErrorId(null); marcarMut.mutate(p.id) }}
                  disabled={marcarMut.isPending && marcarMut.variables === p.id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {marcarMut.isPending && marcarMut.variables === p.id ? "..." : "✓ Cobrar"}
                </button>
                {errorId === p.id && (
                  <span className="text-xs text-red-600">Error al cobrar</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
