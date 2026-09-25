import { useState } from "react"
import { Receipt, FileText } from "lucide-react"
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
  drive_url?: string | null
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

  const enviarMut = useMutation({
    mutationFn: (id: number) => api.post(`/documentos/${id}/enviar/`),
    onSuccess: (_res, id) => { setActionError(""); setJustSentId(id) },
    onError: (err: any) => setActionError(err.response?.data?.error ?? "Error al enviar la factura."),
  })
  const [justSentId, setJustSentId] = useState<number | null>(null)

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
          <h1 className="page-title">Documentos</h1>
          <p className="page-subtitle">{visibles.length} documentos generados</p>
        </div>
      </div>

      {downloadError && (
        <p className="text-red-700 text-[15px] bg-red-50 border border-red-200 px-4 py-3 rounded-[10px] mb-4">{downloadError}</p>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        {["", "factura", "recibo", "recibo_efectivo"].map(v => (
          <button key={v} onClick={() => setTipoFilter(v)}
            className={`min-h-[40px] px-4 rounded-full font-label text-[14px] font-semibold border transition-colors ${
              tipoFilter === v
                ? "bg-pine-900 text-khaki-100 border-pine-900"
                : "bg-white text-pine-700 border-pine-900/20 hover:bg-khaki-100"
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
              className={`min-h-[40px] px-4 rounded-full font-label text-[14px] font-semibold border transition-colors ${
                estadoTab === value
                  ? value === "anuladas" ? "bg-red-700 text-white border-red-700" : "bg-pine-900 text-khaki-100 border-pine-900"
                  : "bg-white text-pine-700 border-pine-900/20 hover:bg-khaki-100"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-ink-soft text-[15px]">Cargando...</p>}

      {!isLoading && !docs.length && (
        <div className="card !bg-white flex flex-col items-center justify-center py-16 text-ink-soft">
          <p className="text-[15px]">
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
          <div key={d.id} className={`card !bg-white p-4 flex items-center justify-between flex-wrap gap-3 ${d.estado === "anulada" ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-[10px] bg-pine-900 text-brass-500 flex items-center justify-center flex-shrink-0">
                {d.tipo === "factura" ? <Receipt size={20} strokeWidth={1.75} /> : <FileText size={20} strokeWidth={1.75} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold text-ink font-mono text-[15px] ${d.estado === "anulada" ? "line-through" : ""}`}>
                    {d.num_doc || d.nombre}
                  </span>
                  <span className={`badge ${TIPO_CLS[d.tipo] ?? "bg-khaki-100 text-pine-700"}`}>
                    {d.tipo}
                  </span>
                  {d.estado === "anulada" && (
                    <span className="badge bg-red-100 text-red-800">
                      ANULADA
                    </span>
                  )}
                </div>
                <p className="text-[14px] text-ink mt-1 truncate">
                  {d.pago_info
                    ? `${d.pago_info.alumno} · ${d.pago_info.pagador} · ${d.pago_info.periodo} · ${Number(d.pago_info.total).toFixed(2)} €`
                    : null
                  }
                </p>
                <p className="text-[13px] text-ink-soft mt-0.5">
                  <span title="Cuándo pagó el cliente">Fecha de pago: {formatFecha(d.pago_info?.fecha ?? null)}</span>
                  <span className="mx-1.5">·</span>
                  <span title="Cuándo se emitió este documento/PDF">
                    Fecha de emisión: {formatFecha(d.emitida_at, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap flex-shrink-0">
              <button
                onClick={() => handleDescargar(d)}
                disabled={downloadingId === d.id}
                className="inline-flex items-center min-h-[40px] px-3 rounded-[10px] border text-[14px] font-semibold transition-colors border-brass-500/50 text-brass-700 hover:bg-khaki-100 disabled:opacity-50">
                {downloadingId === d.id ? "..." : "Descargar"}
              </button>
              {d.drive_url && (
                <a href={d.drive_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center min-h-[40px] px-3 rounded-[10px] border text-[14px] font-semibold transition-colors border-brass-500/50 text-brass-700 hover:bg-khaki-100">
                  Ver en Drive
                </a>
              )}
              {d.estado !== "anulada" && (
                <button
                  onClick={() => enviarMut.mutate(d.id)}
                  disabled={enviarMut.isPending && enviarMut.variables === d.id}
                  className="inline-flex items-center min-h-[40px] px-3 rounded-[10px] border text-[14px] font-semibold transition-colors border-pine-900/25 text-pine-900 hover:bg-khaki-100 disabled:opacity-50">
                  {enviarMut.isPending && enviarMut.variables === d.id
                    ? "..."
                    : justSentId === d.id ? "✓ Enviado" : "Enviar"}
                </button>
              )}
              {d.estado === "anulada" ? null : d.estado === "borrador" ? (
                <button
                  onClick={() => { setActionError(""); setConfirmDelete(d) }}
                  aria-label="Eliminar documento" title="Eliminar documento"
                  className="inline-flex items-center min-h-[40px] px-3 rounded-[10px] border text-[14px] font-semibold transition-colors border-red-200 text-red-700 hover:bg-red-50">
                  ✕
                </button>
              ) : (
                <button
                  onClick={() => { setActionError(""); setMotivoAnulacion(""); setConfirmAnular(d) }}
                  title="Anular (mantiene el número en la secuencia, a efectos fiscales)"
                  className="inline-flex items-center min-h-[40px] px-3 rounded-[10px] border text-[14px] font-semibold transition-colors border-red-200 text-red-700 hover:bg-red-50">
                  Anular
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete modal */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-head text-[22px] leading-tight text-pine-900 mb-2">Eliminar documento</h3>
            <p className="text-[15px] text-ink mb-1">
              ¿Eliminar <strong>{confirmDelete.num_doc || confirmDelete.nombre}</strong>?
            </p>
            <p className="text-[14px] text-ink-soft mb-5">Se eliminará el archivo físico y el registro. No se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="btn-ghost">
                Cancelar
              </button>
              <button onClick={() => deleteMut.mutate(confirmDelete.id)} disabled={deleteMut.isPending}
                className="min-h-[44px] px-5 rounded-[10px] bg-red-700 text-white text-[15px] font-bold hover:bg-red-800 disabled:opacity-50">
                {deleteMut.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
            {actionError && <p className="text-red-700 text-[14px] mt-3">{actionError}</p>}
          </div>
        </div>
      )}

      {/* Anular modal */}
      {confirmAnular && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-head text-[22px] leading-tight text-pine-900 mb-2">Anular documento</h3>
            <p className="text-[15px] text-ink mb-1">
              ¿Anular <strong>{confirmAnular.num_doc || confirmAnular.nombre}</strong>?
            </p>
            <p className="text-[14px] text-ink-soft mb-4">
              El número queda reservado y el PDF se conserva marcado como ANULADA — no se elimina nada, para mantener la secuencia intacta a efectos fiscales.
            </p>
            <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">Motivo (obligatorio)</label>
            <textarea value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)} rows={2}
              className="input !py-2.5 resize-none mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAnular(null)}
                className="btn-ghost">
                Cancelar
              </button>
              <button
                onClick={() => anularMut.mutate({ id: confirmAnular.id, motivo: motivoAnulacion.trim() })}
                disabled={anularMut.isPending || !motivoAnulacion.trim()}
                className="min-h-[44px] px-5 rounded-[10px] bg-red-700 text-white text-[15px] font-bold hover:bg-red-800 disabled:opacity-50">
                {anularMut.isPending ? "Anulando..." : "Anular"}
              </button>
            </div>
            {actionError && <p className="text-red-700 text-[14px] mt-3">{actionError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
