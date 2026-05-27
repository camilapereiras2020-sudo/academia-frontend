import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"

export default function DocumentosPage() {
  const qc = useQueryClient()
  const { data: raw, isLoading } = useQuery({
    queryKey: ["documentos"],
    queryFn: () => api.get("/documentos/").then(r => r.data),
  })
  const docs = Array.isArray(raw) ? raw : (raw as any)?.results || []

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/documentos/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documentos"] }),
  })

  async function handleDescargar(id: number, nombre: string) {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`/api/v1/documentos/${id}/descargar/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const badge = (tipo: string) => {
    const cls = tipo === "factura" ? "bg-blue-100 text-blue-800" :
      tipo === "recibo" ? "bg-purple-100 text-purple-800" : "bg-slate-100 text-slate-600"
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{tipo}</span>
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Documentos</h1>
          <p className="text-sm text-slate-500 mt-1">{docs.length} documentos generados</p>
        </div>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Cargando...</p>}
      {!isLoading && !docs.length && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <span className="text-5xl mb-3">📁</span>
          <p className="text-sm">Sin documentos. Genera facturas o recibos desde la seccion de Pagos.</p>
        </div>
      )}

      <div className="space-y-3">
        {docs.map((d: any) => (
          <div key={d.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-800">{d.num_doc || d.nombre}</p>
                {badge(d.tipo)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {d.pago_info
                  ? `${d.pago_info.alumno} · ${d.pago_info.pagador} · ${d.pago_info.periodo} · ${d.pago_info.total} €`
                  : d.created_at?.slice(0, 10)}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => handleDescargar(d.id, d.nombre)}
                className="px-3 py-1.5 border rounded-lg text-xs text-blue-600 hover:bg-blue-50 font-medium">
                📥 Descargar
              </button>
              <button onClick={() => { if (confirm("Eliminar documento?")) deleteMut.mutate(d.id) }}
                className="px-3 py-1.5 border rounded-lg text-xs text-red-600 hover:bg-red-50">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}