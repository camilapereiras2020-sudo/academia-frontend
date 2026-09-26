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
        <h1 className="page-title">Facturación</h1>
        <p className="page-subtitle">Generá facturas o recibos para pagos ya cobrados.</p>
      </div>

      {downloadError && (
        <p className="text-red-700 text-[15px] bg-red-50 border border-red-200 px-4 py-3 rounded-[10px] mb-4">{downloadError}</p>
      )}
      {actionError && (
        <p className="text-red-700 text-[15px] bg-red-50 border border-red-200 px-4 py-3 rounded-[10px] mb-4">{actionError}</p>
      )}

      {isLoading && <p className="text-ink-soft text-[15px] py-4">Cargando...</p>}

      {!isLoading && !pagos.length && (
        <div className="card !bg-white flex flex-col items-center justify-center py-16 text-ink-soft">
          <p className="text-[15px]">Sin pagos cobrados todavía.</p>
        </div>
      )}

      {!!pendientes.length && (
        <div className="card !bg-white overflow-x-auto mb-6">
          <div className="px-4 py-3 border-b bg-khaki-100">
            <span className="font-label text-[14px] uppercase tracking-[0.1em] text-pine-700 font-semibold">
              Pendientes de facturar ({pendientes.length})
            </span>
          </div>
          <table className="data-table">
            <thead className="bg-khaki-100 border-b">
              <tr>
                {["Alumno", "Pagador", "Periodo", "Marca", ""].map(h => (
                  <th key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-khaki-100">
              {pendientes.map(p => (
                <tr key={p.id} className="hover:bg-khaki-100">
                  <td className="font-semibold">{p.alumno_nombre ?? "—"}</td>
                  <td className="!text-ink-soft">{p.pagador_nombre ?? "—"}</td>
                  <td className="!text-ink-soft">{formatMonth(p.periodo)}</td>
                  <td className="!text-ink-soft">{p.marca_display ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => generarMut.mutate(p)}
                      disabled={generarMut.isPending && (generarMut.variables as Pago)?.id === p.id}
                      className="inline-flex items-center min-h-[40px] px-3 rounded-[10px] border border-brass-500/50 text-[14px] font-semibold text-brass-700 hover:bg-khaki-100 disabled:opacity-50 whitespace-nowrap"
                    >
                      {generarMut.isPending && (generarMut.variables as Pago)?.id === p.id ? "Confirmando..." : "Confirmar factura"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!!listos.length && (
        <div className="card !bg-white overflow-x-auto">
          <div className="px-4 py-3 border-b bg-khaki-100">
            <span className="font-label text-[14px] uppercase tracking-[0.1em] text-pine-700 font-semibold">
              Ya facturados ({listos.length})
            </span>
          </div>
          <table className="data-table">
            <thead className="bg-khaki-100 border-b">
              <tr>
                {["Alumno", "Pagador", "Periodo", "Doc", ""].map(h => (
                  <th key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-khaki-100">
              {listos.map(p => {
                const doc = docByPago.get(p.id)!
                return (
                  <tr key={p.id} className="hover:bg-khaki-100">
                    <td className="font-semibold">{p.alumno_nombre ?? "—"}</td>
                    <td className="!text-ink-soft">{p.pagador_nombre ?? "—"}</td>
                    <td className="!text-ink-soft">{formatMonth(p.periodo)}</td>
                    <td className="font-mono !text-[13px] !text-ink-soft whitespace-nowrap">{doc.num_doc}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDescargar(doc)}
                        disabled={downloadingId === doc.id}
                        className="inline-flex items-center min-h-[40px] px-3 rounded-[10px] border border-brass-500/50 text-[14px] font-semibold text-brass-700 hover:bg-khaki-100 disabled:opacity-50 whitespace-nowrap"
                      >
                        {downloadingId === doc.id ? "..." : "Descargar"}
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
