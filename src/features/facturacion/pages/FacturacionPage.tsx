import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pagosApi, documentosApi } from "@/features/pagos/api"
import { formatMonth } from "@/lib/utils"
import type { Pago } from "@/types"

type DocumentoLite = { id: number; pago: number; num_doc: string; tipo: string }

export default function FacturacionPage() {
  const qc = useQueryClient()
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [downloadError, setDownloadError] = useState("")
  const [actionError, setActionError] = useState("")

  // Pagador nombre/monto/etc. are intentionally not shown here — this page
  // exists so reception can generate invoices for existing payments without
  // exposing financial totals or reports (that's Pagos/Dashboard, both
  // owner+co_manager only).
  const { data: pagosRaw, isLoading } = useQuery({
    queryKey: ["pagos", "facturacion"],
    queryFn: () => pagosApi.list({ estado: "pagado" }).then(r => r.data),
  })
  const pagos: Pago[] = Array.isArray(pagosRaw) ? pagosRaw : (pagosRaw as any)?.results ?? []

  const { data: docsRaw } = useQuery({
    queryKey: ["documentos", "facturacion"],
    queryFn: () => documentosApi.list().then(r => r.data),
  })
  const docs: DocumentoLite[] = Array.isArray(docsRaw) ? docsRaw : (docsRaw as any)?.results ?? []
  const docByPago = new Map(docs.map(d => [d.pago, d]))

  const generarMut = useMutation({
    mutationFn: (p: Pago) => documentosApi.generar(p.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pagos", "facturacion"] })
      qc.invalidateQueries({ queryKey: ["documentos", "facturacion"] })
      setActionError("")
    },
    onError: (err: any) => setActionError(err.response?.data?.error ?? "Error al generar el documento."),
  })

  async function handleDescargar(doc: DocumentoLite) {
    setDownloadingId(doc.id)
    setDownloadError("")
    try {
      const token = localStorage.getItem("access_token")
      const base = import.meta.env.VITE_API_URL ?? "/api/v1"
      const res = await fetch(`${base}/documentos/${doc.id}/descargar/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`No se pudo descargar el documento (código ${res.status}).`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${doc.num_doc}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Error al descargar el documento.")
    } finally {
      setDownloadingId(null)
    }
  }

  const pendientes = pagos.filter(p => !docByPago.get(p.id))
  const listos = pagos.filter(p => docByPago.get(p.id))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Facturación</h1>
        <p className="text-sm text-slate-500 mt-1">Generá facturas o recibos para pagos ya cobrados.</p>
      </div>

      {downloadError && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg mb-4">{downloadError}</p>
      )}
      {actionError && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg mb-4">{actionError}</p>
      )}

      {isLoading && <p className="text-slate-400 text-sm py-4">Cargando...</p>}

      {!isLoading && !pagos.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-4xl mb-3">🧾</span>
          <p className="text-sm">Sin pagos cobrados todavía.</p>
        </div>
      )}

      {!!pendientes.length && (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto mb-6">
          <div className="px-4 py-3 border-b bg-slate-50">
            <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Pendientes de facturar ({pendientes.length})
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Alumno", "Pagador", "Periodo", "Marca", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendientes.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{p.alumno_nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.pagador_nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatMonth(p.periodo)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{p.marca_display ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => generarMut.mutate(p)}
                      disabled={generarMut.isPending && (generarMut.variables as Pago)?.id === p.id}
                      className="px-3 py-1.5 border rounded-lg text-xs text-blue-600 hover:bg-blue-50 font-medium disabled:opacity-50 whitespace-nowrap"
                    >
                      {generarMut.isPending && (generarMut.variables as Pago)?.id === p.id ? "Generando..." : "🧾 Generar factura/recibo"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!!listos.length && (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <div className="px-4 py-3 border-b bg-slate-50">
            <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
              Ya facturados ({listos.length})
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Alumno", "Pagador", "Periodo", "Doc", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listos.map(p => {
                const doc = docByPago.get(p.id)!
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{p.alumno_nombre ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.pagador_nombre ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatMonth(p.periodo)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{doc.num_doc}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDescargar(doc)}
                        disabled={downloadingId === doc.id}
                        className="px-3 py-1.5 border rounded-lg text-xs text-blue-600 hover:bg-blue-50 font-medium disabled:opacity-50 whitespace-nowrap"
                      >
                        {downloadingId === doc.id ? "..." : "📥 Descargar"}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
