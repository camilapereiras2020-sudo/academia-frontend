import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"

type Documento = {
  id: number
  nombre: string
  tipo: string
  num_doc: string
  created_at: string
  emitida_at: string | null
  estado: string
  pago_info?: { alumno: string; pagador: string; periodo: string; total: string | number; fecha: string | null }
}

function formatFecha(iso: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-ES", opts ?? { day: "2-digit", month: "2-digit", year: "numeric" })
}

const TIPO_CLS: Record<string, string> = {
  factura:          "bg-khaki-200 text-brass-700",
  recibo:           "bg-purple-100 text-purple-800",
  recibo_efectivo:  "bg-amber-100 text-amber-800",
}
const TIPO_LABEL: Record<string, string> = {
  factura: "Facturas", recibo: "Recibos", recibo_efectivo: "Recibos (efectivo)",
}

export default function DocumentosPage() {
  const qc = useQueryClient()
  const [tipoFilter, setTipoFilter] = useState("")
  const [estadoTab, setEstadoTab] = useState<"activas" | "anuladas">("activas")
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [downloadError, setDownloadError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<Documento | null>(null)
  const [confirmAnular, setConfirmAnular] = useState<Documento | null>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState("")
  const [actionError, setActionError] = useState("")

  const { data: raw, isLoading } = useQuery({
    queryKey: ["documentos"],
    queryFn: () => api.get("/documentos/").then(r => r.data),
  })
  const all: Documento[] = Array.isArray(raw) ? raw : (raw as any)?.results ?? []
  const activasCount = all.filter(d => d.estado !== "anulada").length
  const anuladasCount = all.filter(d => d.estado === "anulada").length
  const visibles = all.filter(d => (estadoTab === "anuladas" ? d.estado === "anulada" : d.estado !== "anulada"))
  const docs = tipoFilter ? visibles.filter(d => d.tipo === tipoFilter) : visibles

  // Only a "borrador" (never actually issued — no Drive file) can be hard
  // deleted; the backend rejects deleting anything else with a 409. Every
  // real invoice/receipt must be voided instead, which keeps its num_doc
  // and audit trail intact for tax purposes.
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/documentos/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documentos"] }); setConfirmDelete(null); setActionError("") },
    onError: (err: any) =>
      setActionError(err.response?.data?.error ?? "Error al eliminar el documento."),
  })

  const anularMut = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      api.post(`/documentos/${id}/anular/`, { motivo_anulacion: motivo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentos"] })
      setConfirmAnular(null)
      setMotivoAnulacion("")
      setActionError("")
    },
    onError: (err: any) =>
      setActionError(err.response?.data?.error ?? "Error al anular el documento."),
  })

  async function handleDescargar(d: Documento) {
    setDownloadingId(d.id)
    setDownloadError("")
    try {
      const token = localStorage.getItem("access_token")
      const base = import.meta.env.VITE_API_URL ?? "/api/v1"
      const res = await fetch(`${base}/documentos/${d.id}/descargar/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        throw new Error(`No se pudo descargar el documento (código ${res.status}).`)
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const cliente = d.pago_info?.alumno || d.pago_info?.pagador || ""
      const filename = `${d.num_doc}${cliente ? " " + cliente : ""}.pdf`.replace(/[\\/:*?"<>|]/g, "")
      const a = document.createElement("a")
      a.href = url
      a.download = filename
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

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-head font-normal text-3xl text-pine-900">Documentos</h1>
          <p className="text-sm text-pine-700 mt-1">{visibles.length} documentos generados</p>
        </div>
      </div>

      {downloadError && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg mb-4">{downloadError}</p>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        {["", "factura", "recibo", "recibo_efectivo"].map(v => (
          <button key={v} onClick={() => setTipoFilter(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              tipoFilter === v
                ? "bg-pine-900 text-white border-pine-900"
                : "bg-white text-pine-600 border-khaki-300 hover:border-khaki-400"
            }`}>
            {v === "" ? "Todos" : TIPO_LABEL[v]}
          </button>
        ))}
        <div className="flex gap-2 ml-auto">
          {([
            ["activas", `Activas (${activasCount})`],
            ["anuladas", `Anuladas (${anuladasCount})`],
          ] as const).map(([value, label]) => (
            <button key={value} onClick={() => setEstadoTab(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                estadoTab === value
                  ? value === "anuladas" ? "bg-red-600 text-white border-red-600" : "bg-pine-900 text-white border-pine-900"
                  : "bg-white text-pine-600 border-khaki-300 hover:border-khaki-400"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-khaki-400 text-sm">Cargando...</p>}

      {!isLoading && !docs.length && (
        <div className="flex flex-col items-center justify-center py-16 text-khaki-400">
          <span className="text-5xl mb-3">📁</span>
          <p className="text-sm">
            {tipoFilter
              ? `Sin ${TIPO_LABEL[tipoFilter].toLowerCase()} generados.`
              : estadoTab === "anuladas"
                ? "Sin documentos anulados."
                : "Sin documentos. Genera facturas o recibos desde Pagos."}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {docs.map(d => (
          <div key={d.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between flex-wrap gap-3 ${d.estado === "anulada" ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-lg bg-khaki-100 flex items-center justify-center text-base flex-shrink-0">
                {d.tipo === "factura" ? "🧾" : "📄"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold text-pine-900 font-mono text-sm ${d.estado === "anulada" ? "line-through" : ""}`}>
                    {d.num_doc || d.nombre}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_CLS[d.tipo] ?? "bg-khaki-100 text-pine-600"}`}>
                    {d.tipo}
                  </span>
                  {d.estado === "anulada" && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                      ANULADA
                    </span>
                  )}
                </div>
                <p className="text-xs text-pine-700 mt-0.5 truncate">
                  {d.pago_info
                    ? `${d.pago_info.alumno} · ${d.pago_info.pagador} · ${d.pago_info.periodo} · ${Number(d.pago_info.total).toFixed(2)} €`
                    : null
                  }
                </p>
                <p className="text-xs text-pine-600 mt-0.5">
                  <span title="Cuándo pagó el cliente">Fecha de pago: {formatFecha(d.pago_info?.fecha ?? null)}</span>
                  <span className="mx-1.5">·</span>
                  <span title="Cuándo se emitió este documento/PDF">
                    Fecha de emisión: {formatFecha(d.emitida_at, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => handleDescargar(d)}
                disabled={downloadingId === d.id}
                className="px-3 py-1.5 border rounded-lg text-xs text-brass-700 hover:bg-khaki-100 font-medium disabled:opacity-50">
                {downloadingId === d.id ? "..." : "📥 Descargar"}
              </button>
              {d.estado === "anulada" ? null : d.estado === "borrador" ? (
                <button
                  onClick={() => { setActionError(""); setConfirmDelete(d) }}
                  className="px-3 py-1.5 border rounded-lg text-xs text-red-600 hover:bg-red-50">
                  ✕
                </button>
              ) : (
                <button
                  onClick={() => { setActionError(""); setMotivoAnulacion(""); setConfirmAnular(d) }}
                  title="Anular (mantiene el número en la secuencia, a efectos fiscales)"
                  className="px-3 py-1.5 border rounded-lg text-xs text-red-600 hover:bg-red-50">
                  Anular
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-pine-900 mb-1">Eliminar documento</h3>
            <p className="text-sm text-pine-700 mb-1">
              ¿Eliminar <strong>{confirmDelete.num_doc || confirmDelete.nombre}</strong>?
            </p>
            <p className="text-xs text-pine-600 mb-4">Se eliminará el archivo físico y el registro. No se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg bg-khaki-100 text-pine-700 text-sm hover:bg-khaki-300">
                Cancelar
              </button>
              <button onClick={() => deleteMut.mutate(confirmDelete.id)} disabled={deleteMut.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50">
                {deleteMut.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
            {actionError && <p className="text-red-600 text-xs mt-3">{actionError}</p>}
          </div>
        </div>
      )}

      {/* Anular modal */}
      {confirmAnular && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-pine-900 mb-1">Anular documento</h3>
            <p className="text-sm text-pine-700 mb-1">
              ¿Anular <strong>{confirmAnular.num_doc || confirmAnular.nombre}</strong>?
            </p>
            <p className="text-xs text-pine-600 mb-3">
              El número queda reservado y el PDF se conserva marcado como ANULADA — no se elimina nada, para mantener la secuencia intacta a efectos fiscales.
            </p>
            <label className="block text-xs font-semibold text-pine-700 mb-1">Motivo (obligatorio)</label>
            <textarea value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 resize-none mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAnular(null)}
                className="px-4 py-2 rounded-lg bg-khaki-100 text-pine-700 text-sm hover:bg-khaki-300">
                Cancelar
              </button>
              <button
                onClick={() => anularMut.mutate({ id: confirmAnular.id, motivo: motivoAnulacion.trim() })}
                disabled={anularMut.isPending || !motivoAnulacion.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50">
                {anularMut.isPending ? "Anulando..." : "Anular"}
              </button>
            </div>
            {actionError && <p className="text-red-600 text-xs mt-3">{actionError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
