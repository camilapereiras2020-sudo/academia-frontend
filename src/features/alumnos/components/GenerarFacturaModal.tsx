import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { pagosApi, documentosApi } from "@/features/pagos/api"
import { descargarDocumento } from "@/lib/descargarDocumento"
import type { Alumno, AlumnoCuota, CargoExtra, Pagador } from "@/types"

// Atajo desde la sección "Cuota" de la ficha: arma un Pago nuevo con la
// cuota calculada + clases a mayores ya cargadas, lo guarda como "pagado"
// y confirma la factura en el mismo paso — sin pasar por Pagos/Facturación.
// Para editar un pago ya existente, seguir usando PagoDetailModal.

const METODOS = ["efectivo", "transferencia", "bizum", "domiciliacion", "tarjeta"]

interface ExtraLine { concepto: string; importe: number }
interface DocumentoGenerado { id: number; num_doc: string }

export default function GenerarFacturaModal({
  alumno, cuota, cargosExtra, pagador, onClose,
}: {
  alumno: Alumno
  cuota: AlumnoCuota | null
  cargosExtra: CargoExtra[]
  pagador: Pagador | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7))
  const [mensualidad, setMensualidad] = useState(cuota?.cuota ?? 0)
  const [descuento, setDescuento] = useState(0)
  const [metodo, setMetodo] = useState("transferencia")
  const [extras, setExtras] = useState<ExtraLine[]>(
    cargosExtra.map(c => ({ concepto: c.concepto, importe: Number(c.monto) }))
  )
  const [error, setError] = useState("")
  const [doc, setDoc] = useState<DocumentoGenerado | null>(null)
  const [downloading, setDownloading] = useState(false)

  const extrasTotal = extras.reduce((s, e) => s + Number(e.importe || 0), 0)
  const total = mensualidad - descuento + extrasTotal
  const sinPagador = !alumno.pagador && !alumno.es_adulto

  const generarMut = useMutation({
    mutationFn: async () => {
      const creado = await pagosApi.create({
        marca: alumno.marca,
        alumno: alumno.id,
        pagador: alumno.pagador,
        periodo, mensualidad, descuento, extras, total, metodo,
        estado: "pagado",
      })
      const res = await documentosApi.generar(creado.data.id)
      return res.data as DocumentoGenerado
    },
    onSuccess: (generado) => {
      setDoc(generado)
      setError("")
      qc.invalidateQueries({ queryKey: ["alumno-resumen", alumno.id] })
      qc.invalidateQueries({ queryKey: ["documentos", "alumno", alumno.id] })
    },
    onError: (err: any) =>
      setError(
        err.response?.data?.error ??
        err.response?.data?.non_field_errors?.[0] ??
        err.response?.data?.marca?.[0] ??
        "Error generando la factura."
      ),
  })

  const enviarMut = useMutation({
    mutationFn: () => documentosApi.enviar(doc!.id),
    onError: (err: any) => setError(err.response?.data?.error ?? "Error al enviar la factura."),
  })

  async function handleDescargar() {
    if (!doc) return
    setDownloading(true)
    setError("")
    try {
      await descargarDocumento(doc, alumno.nombre)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al descargar el documento.")
    } finally {
      setDownloading(false)
    }
  }

  function whatsappLink(numDoc: string) {
    const tel = (pagador?.telefono || "").replace(/\D/g, "")
    const texto = encodeURIComponent(
      `Hola${pagador?.nombre ? " " + pagador.nombre : ""}, te paso la factura ${numDoc} por ${total.toFixed(2)}€. ¡Gracias!`
    )
    return `https://wa.me/${tel.startsWith("34") ? tel : "34" + tel}?text=${texto}`
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-xl font-bold text-pine-900">Generar factura — {alumno.nombre}</h2>
          <button onClick={onClose} className="text-khaki-400 hover:text-pine-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {sinPagador && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              ⚠ Este alumno no tiene pagador vinculado (y no es adulto que pague por sí mismo). Cargá un pagador en
              "Datos generales" antes de facturar.
            </p>
          )}
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>}

          {!doc ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-pine-700 mb-1">Periodo *</label>
                  <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-pine-700 mb-1">Método</label>
                  <select value={metodo} onChange={e => setMetodo(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
                    {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-pine-700 mb-1">Importe (€)</label>
                  <input type="number" value={mensualidad} onChange={e => setMensualidad(+e.target.value)}
                    min="0" step="0.01"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-pine-700 mb-1">Descuento (€)</label>
                  <input type="number" value={descuento} onChange={e => setDescuento(+e.target.value)}
                    min="0" step="0.01"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-pine-700">Extras (clases a mayores, etc.)</label>
                  <button onClick={() => setExtras(e => [...e, { concepto: "", importe: 0 }])} className="text-xs text-brass-700 hover:text-pine-900">
                    + Añadir extra
                  </button>
                </div>
                {extras.map((ex, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" placeholder="Concepto" value={ex.concepto}
                      onChange={e => { const n = [...extras]; n[i] = { ...n[i], concepto: e.target.value }; setExtras(n) }}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
                    <input type="number" placeholder="€" value={ex.importe} min="0" step="0.01"
                      onChange={e => { const n = [...extras]; n[i] = { ...n[i], importe: +e.target.value }; setExtras(n) }}
                      className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
                    <button onClick={() => setExtras(extras.filter((_, j) => j !== i))} className="text-red-500 text-sm">✕</button>
                  </div>
                ))}
              </div>

              <div className="bg-khaki-100 rounded-lg p-4 text-right">
                <p className="text-sm text-pine-700">Importe: {mensualidad.toFixed(2)}€ — Descuento: {descuento.toFixed(2)}€ — Extras: {extrasTotal.toFixed(2)}€</p>
                <p className="text-2xl font-bold text-pine-900 mt-1">Total: {total.toFixed(2)} €</p>
              </div>
            </>
          ) : (
            <div className="border-t pt-4">
              <p className="text-sm text-sage-700 mb-3">✓ Factura generada correctamente.</p>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-mono text-sm bg-khaki-100 px-2 py-1 rounded">{doc.num_doc}</span>
                <button onClick={handleDescargar} disabled={downloading}
                  className="px-3 py-1.5 border rounded-lg text-xs text-brass-700 hover:bg-khaki-100 font-medium disabled:opacity-50">
                  {downloading ? "..." : "📥 Ver / Descargar"}
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => enviarMut.mutate()} disabled={enviarMut.isPending}
                  className="px-3 py-1.5 border rounded-lg text-xs text-brass-700 hover:bg-khaki-100 font-medium disabled:opacity-50">
                  {enviarMut.isPending ? "Enviando..." : "✉️ Enviar por email"}
                </button>
                <a href={whatsappLink(doc.num_doc)} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 border rounded-lg text-xs text-brass-700 hover:bg-khaki-100 font-medium">
                  💬 Enviar por WhatsApp
                </a>
                {enviarMut.isSuccess && <span className="text-xs text-sage-700">Enviado ✓</span>}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-6 pt-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-khaki-100 text-pine-700 text-sm hover:bg-khaki-200">
            {doc ? "Cerrar" : "Cancelar"}
          </button>
          {!doc && (
            <button onClick={() => generarMut.mutate()} disabled={generarMut.isPending || sinPagador || !periodo}
              className="px-4 py-2 rounded-lg bg-brass-500 text-white text-sm hover:bg-brass-700 disabled:opacity-50">
              {generarMut.isPending ? "Generando..." : "🧾 Generar factura"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
