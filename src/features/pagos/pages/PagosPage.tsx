import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pagosApi, documentosApi } from "../api"
import { formatEur, formatMonth } from "@/lib/utils"
import type { Pago } from "@/types"

const ESTADOS = ["","pendiente","pagado","parcial"]

export default function PagosPage() {
  const qc = useQueryClient()
  const [estadoFilter, setEstadoFilter] = useState("")
  const [periodoFilter, setPeriodoFilter] = useState("")
  const [generatingId, setGeneratingId] = useState<number | null>(null)

  const { data: raw, isLoading } = useQuery({
    queryKey: ["pagos", estadoFilter, periodoFilter],
    queryFn: () => pagosApi.list({ estado: estadoFilter || undefined, periodo: periodoFilter || undefined }).then(r => r.data),
  })
  const pagos: Pago[] = Array.isArray(raw) ? raw : (raw as any)?.results || []

  const marcarMut = useMutation({
    mutationFn: pagosApi.marcarPagado,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pagos"] })
      qc.invalidateQueries({ queryKey: ["documentos"] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: pagosApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagos"] }),
  })

  async function handleGenerar(pagoId: number, tipo: "factura" | "recibo") {
    setGeneratingId(pagoId)
    try {
      const res = await documentosApi.generar(pagoId, tipo)
      qc.invalidateQueries({ queryKey: ["pagos"] })
      qc.invalidateQueries({ queryKey: ["documentos"] })
      // Auto-download
      if (res.data.download_url) {
        window.open(res.data.download_url, "_blank")
      }
      alert(`${tipo === "factura" ? "Factura" : "Recibo"} generado: ${res.data.num_doc}`)
    } catch (err: any) {
      alert(err.response?.data?.error || "Error generando documento")
    } finally {
      setGeneratingId(null)
    }
  }

  const badge = (estado: string) => {
    const cls = estado === "pagado" ? "bg-green-100 text-green-800" :
      estado === "pendiente" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{estado}</span>
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Registro de pagos</h1>
          <p className="text-sm text-slate-500 mt-1">{pagos.length} pagos</p>
        </div>
        <a href="/pagos/nuevo" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Nuevo pago</a>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {ESTADOS.map(e => <option key={e} value={e}>{e || "Todos los estados"}</option>)}
        </select>
        <input type="month" value={periodoFilter} onChange={e => setPeriodoFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {periodoFilter && <button onClick={() => setPeriodoFilter("")} className="text-xs text-blue-600 hover:text-blue-800">Limpiar mes</button>}
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}
      {!isLoading && !pagos.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">📋</span><p className="text-sm">Sin pagos registrados.</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {["Pagador","Alumno","Grupo","Periodo","Total","Estado","Doc","Acciones"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {pagos.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{p.pagador_nombre}</td>
                <td className="px-4 py-3">{p.alumno_nombre}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{p.grupo_nombre}</td>
                <td className="px-4 py-3 text-xs">{formatMonth(p.periodo)}</td>
                <td className="px-4 py-3 font-semibold">{formatEur(Number(p.total))}</td>
                <td className="px-4 py-3">{badge(p.estado)}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{p.num_doc || "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {p.estado !== "pagado" && (
                      <button onClick={() => marcarMut.mutate(p.id)}
                        className="px-2 py-1 border rounded text-xs text-green-700 hover:bg-green-50">✓ Cobrar</button>
                    )}
                    <button onClick={() => handleGenerar(p.id, "factura")}
                      disabled={generatingId === p.id}
                      className="px-2 py-1 border rounded text-xs text-blue-600 hover:bg-blue-50 disabled:opacity-50">
                      {generatingId === p.id ? "..." : "📄 Factura"}
                    </button>
                    <button onClick={() => handleGenerar(p.id, "recibo")}
                      disabled={generatingId === p.id}
                      className="px-2 py-1 border rounded text-xs text-purple-600 hover:bg-purple-50 disabled:opacity-50">
                      {generatingId === p.id ? "..." : "🧾 Recibo"}
                    </button>
                    <button onClick={() => { if (confirm("Eliminar este pago?")) deleteMut.mutate(p.id) }}
                      className="px-2 py-1 border rounded text-xs text-red-600 hover:bg-red-50">✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
