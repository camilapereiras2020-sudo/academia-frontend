import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"

type Documento = {
  id: number
  nombre: string
  tipo: string
  num_doc: string
  created_at: string
  pago_info?: { alumno: string; pagador: string; periodo: string; total: string | number }
}

const TIPO_CLS: Record<string, string> = {
  factura: "bg-blue-100 text-blue-800",
  recibo:  "bg-purple-100 text-purple-800",
}

export default function DocumentosPage() {
  const qc = useQueryClient()
  const [tipoFilter, setTipoFilter] = useState("")
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Documento | null>(null)

  const { data: raw, isLoading } = useQuery({
    queryKey: ["documentos"],
    queryFn: () => api.get("/documentos/").then(r => r.data),
  })
  const all: Documento[] = Array.isArray(raw) ? raw : (raw as any)?.results ?? []
  const docs = tipoFilter ? all.filter(d => d.tipo === tipoFilter) : all

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/documentos/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documentos"] }); setConfirmDelete(null) },
  })

  async function handleDescargar(d: Documento) {
    setDownloadingId(d.id)
    try {
      const token = localStorage.getItem("access_token")
      const base = import.meta.env.VITE_API_URL ?? "/api/v1"
      const res = await fetch(`${base}/documentos/${d.id}/descargar/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.target = "_blank"
      a.rel = "noopener noreferrer"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Documentos</h1>
          <p className="text-sm text-slate-500 mt-1">{all.length} documentos generados</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {["", "factura", "recibo"].map(v => (
          <button key={v} onClick={() => setTipoFilter(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              tipoFilter === v
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}>
            {v === "" ? "Todos" : v === "factura" ? "Facturas" : "Recibos"}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}

      {!isLoading && !docs.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">📁</span>
          <p className="text-sm">
            {tipoFilter
              ? `Sin ${tipoFilter}s generados.`
              : "Sin documentos. Genera facturas o recibos desde Pagos."}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {docs.map(d => (
          <div key={d.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
                {d.tipo === "factura" ? "🧾" : "📄"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800 font-mono text-sm">
                    {d.num_doc || d.nombre}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_CLS[d.tipo] ?? "bg-slate-100 text-slate-600"}`}>
                    {d.tipo}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {d.pago_info
                    ? `${d.pago_info.alumno} · ${d.pago_info.pagador} · ${d.pago_info.periodo} · ${Number(d.pago_info.total).toFixed(2)} €`
                    : new Date(d.created_at).toLocaleDateString("es-ES")
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => handleDescargar(d)}
                disabled={downloadingId === d.id}
                className="px-3 py-1.5 border rounded-lg text-xs text-blue-600 hover:bg-blue-50 font-medium disabled:opacity-50">
                {downloadingId === d.id ? "..." : "📥 Descargar"}
              </button>
              <button
                onClick={() => setConfirmDelete(d)}
                className="px-3 py-1.5 border rounded-lg text-xs text-red-600 hover:bg-red-50">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-slate-800 mb-1">Eliminar documento</h3>
            <p className="text-sm text-slate-500 mb-1">
              ¿Eliminar <strong>{confirmDelete.num_doc || confirmDelete.nombre}</strong>?
            </p>
            <p className="text-xs text-slate-400 mb-4">Se eliminará el archivo físico y el registro. No se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200">
                Cancelar
              </button>
              <button onClick={() => deleteMut.mutate(confirmDelete.id)} disabled={deleteMut.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50">
                {deleteMut.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
