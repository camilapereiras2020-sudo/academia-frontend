import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pagosApi, documentosApi } from "./api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { pagadoresApi } from "@/features/pagadores/api"
import { gruposApi } from "@/features/grupos/api"
import { tarifasApi } from "@/features/tarifas/api"
import type { Pago, Tarifa } from "@/types"

const METODOS = ["efectivo", "transferencia", "bizum", "domiciliacion", "tarjeta"]

interface Documento {
  id: number
  nombre: string
  tipo: string
  num_doc: string
  emitida_at: string | null
}

function formatFechaEmision(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

// Tarifas with no fixed price — amount stays manually editable when one of these is selected.
function tarifaAmountIsEditable(t: Tarifa | undefined) {
  if (!t) return true
  return t.marca === "cami_and_co" || t.nombre === "clase_privada" || t.nombre === "clase_recuperada"
}

interface ExtraLine { concepto: string; importe: number }

export default function PagoDetailModal({ pago: initial, onClose }: { pago: Pago; onClose: () => void }) {
  const qc = useQueryClient()
  const [pago, setPago] = useState(initial)
  const [error, setError] = useState("")
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const { data: alumnosRaw } = useQuery({ queryKey: ["alumnos"], queryFn: () => alumnosApi.list().then(r => r.data) })
  const { data: pagadoresRaw } = useQuery({ queryKey: ["pagadores"], queryFn: () => pagadoresApi.list().then(r => r.data) })
  const { data: gruposRaw } = useQuery({ queryKey: ["grupos"], queryFn: () => gruposApi.list().then(r => r.data) })
  const { data: tarifasRaw } = useQuery({ queryKey: ["tarifas"], queryFn: () => tarifasApi.list().then(r => r.data) })

  const alumnos = Array.isArray(alumnosRaw) ? alumnosRaw : (alumnosRaw as any)?.results || []
  const pagadores = Array.isArray(pagadoresRaw) ? pagadoresRaw : (pagadoresRaw as any)?.results || []
  const grupos = Array.isArray(gruposRaw) ? gruposRaw : (gruposRaw as any)?.results || []
  const tarifas: Tarifa[] = Array.isArray(tarifasRaw) ? tarifasRaw : (tarifasRaw as any)?.results || []

  const { data: docsRaw } = useQuery({
    queryKey: ["documentos", "pago", pago.id],
    queryFn: () => documentosApi.list({ pago: pago.id }).then(r => r.data),
    enabled: !!pago.num_doc,
  })
  const docs: Documento[] = Array.isArray(docsRaw) ? docsRaw : (docsRaw as any)?.results ?? []

  const [alumno, setAlumno] = useState<number | "">(initial.alumno ?? "")
  const [pagador, setPagador] = useState<number | "">(initial.pagador ?? "")
  const [grupo, setGrupo] = useState<number | "">(initial.grupo ?? "")
  const [tarifa, setTarifa] = useState<number | "">(initial.tarifa ?? "")
  const [periodo, setPeriodo] = useState(initial.periodo)
  // drafts land with mensualidad=0 and the real imported amount in `total` — prefer whichever is set
  const [mensualidad, setMensualidad] = useState(Number(initial.mensualidad) || Number(initial.total) || 0)
  const [horas, setHoras] = useState<number | "">(initial.horas_trabajadas ?? "")
  const [descuento, setDescuento] = useState(Number(initial.descuento) || 0)
  const [metodo, setMetodo] = useState(initial.metodo)
  const [notas, setNotas] = useState(initial.notas)
  const [conceptoLibre, setConceptoLibre] = useState(initial.concepto_libre)
  const [extras, setExtras] = useState<ExtraLine[]>(initial.extras ?? [])

  const selectedTarifa = tarifas.find(t => t.id === tarifa)
  const montoEditable = tarifaAmountIsEditable(selectedTarifa)

  function onAlumnoChange(aid: number | "") {
    setAlumno(aid)
    const a = aid !== "" ? alumnos.find((x: any) => x.id === aid) : undefined
    if (a?.pagador) setPagador(a.pagador)
  }

  function onTarifaChange(tid: number | "") {
    setTarifa(tid)
    const t = tarifas.find(x => x.id === tid)
    if (t && !tarifaAmountIsEditable(t)) setMensualidad(Number(t.precio))
  }

  const extrasTotal = extras.reduce((s, e) => s + Number(e.importe || 0), 0)
  const total = mensualidad - descuento + extrasTotal

  const saveMut = useMutation({
    mutationFn: () => pagosApi.update(pago.id, {
      alumno: alumno as number,
      pagador: pagador as number,
      grupo: grupo === "" ? null : (grupo as number),
      tarifa: tarifa === "" ? null : (tarifa as number),
      periodo,
      mensualidad,
      descuento,
      extras,
      total,
      metodo,
      notas,
      concepto_libre: conceptoLibre,
      horas_trabajadas: horas === "" ? 0 : horas,
    }),
    onSuccess: (res) => {
      setPago(res.data)
      setError("")
      qc.invalidateQueries({ queryKey: ["pagos"] })
      qc.invalidateQueries({ queryKey: ["documentos", "pago", pago.id] })
    },
    onError: (err: any) =>
      setError(
        err.response?.data?.non_field_errors?.[0] ??
        err.response?.data?.detail ??
        JSON.stringify(err.response?.data) ??
        "Error al guardar el pago."
      ),
  })

  const generarMut = useMutation({
    mutationFn: () => documentosApi.generar(pago.id),
    onSuccess: async () => {
      const fresh = await pagosApi.get(pago.id)
      setPago(fresh.data)
      qc.invalidateQueries({ queryKey: ["pagos"] })
      qc.invalidateQueries({ queryKey: ["documentos", "pago", pago.id] })
    },
    onError: (err: any) =>
      setError(err.response?.data?.error ?? "Error generando la factura/recibo."),
  })

  async function handleDescargar(d: Documento) {
    setDownloadingId(d.id)
    setError("")
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
      const a = document.createElement("a")
      a.href = url
      a.target = "_blank"
      a.rel = "noopener noreferrer"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al descargar el documento.")
    } finally {
      setDownloadingId(null)
    }
  }

  function handleSubmit() {
    if (!alumno || !pagador || !periodo) {
      setError("Alumno, pagador y periodo son obligatorios.")
      return
    }
    setError("")
    saveMut.mutate()
  }

  const facturaNoGenerada = pago.notas?.includes("Factura no generada")

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-xl font-bold text-pine-900">Pago #{pago.id}</h2>
          <button onClick={onClose} className="text-khaki-400 hover:text-pine-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {pago.estado_carga === "pendiente_completar" && (
            <p className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-800 inline-block">
              ⚠ Pendiente de completar
            </p>
          )}

          {/* Read-only identification header — this is how you tell apart same-month/same-amount imported rows */}
          <div className="bg-khaki-100 border rounded-lg p-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-pine-600">Fecha de pago: </span>
              <span className="font-medium text-pine-700">{pago.fecha ?? "—"}</span>
            </div>
            <div className="flex-1 min-w-[220px]">
              <span className="text-pine-600">Concepto original: </span>
              <span className="font-medium text-pine-700">{pago.concepto_original || "—"}</span>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-pine-700 mb-1">Alumno *</label>
              <select value={alumno} onChange={e => onAlumnoChange(e.target.value ? +e.target.value : "")}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
                <option value="">Seleccionar...</option>
                {alumnos.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-pine-700 mb-1">Pagador *</label>
              <select value={pagador} onChange={e => setPagador(e.target.value ? +e.target.value : "")}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
                <option value="">Seleccionar...</option>
                {pagadores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-pine-700 mb-1">Grupo</label>
              <select value={grupo} onChange={e => setGrupo(e.target.value ? +e.target.value : "")}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
                <option value="">Sin grupo</option>
                {grupos.map((g: any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-pine-700 mb-1">Tarifa</label>
              <select value={tarifa} onChange={e => onTarifaChange(e.target.value ? +e.target.value : "")}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
                <option value="">Sin tarifa / manual</option>
                {(["rangers_academy", "cami_and_co"] as const).map(marca => {
                  const opciones = tarifas.filter(t => t.marca === marca)
                  if (!opciones.length) return null
                  return (
                    <optgroup key={marca} label={marca === "rangers_academy" ? "Rangers Academy" : "Cami & Co"}>
                      {opciones.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nombre_display}{t.horas_semanales ? ` — ${t.horas_semanales}h/sem` : ""}
                        </option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-pine-700 mb-1">Periodo *</label>
              <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-pine-700 mb-1">Horas</label>
              <input type="number" value={horas} onChange={e => setHoras(e.target.value === "" ? "" : +e.target.value)}
                min="0" step="0.1" placeholder="Ej: 1.5"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-pine-700 mb-1">Importe (€)</label>
              <input type="number" value={mensualidad} onChange={e => setMensualidad(+e.target.value)}
                min="0" step="0.01" disabled={!montoEditable}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 disabled:bg-khaki-100 disabled:text-khaki-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-pine-700 mb-1">Descuento (€)</label>
              <input type="number" value={descuento} onChange={e => setDescuento(+e.target.value)} min="0" step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-pine-700 mb-1">Método</label>
              <select value={metodo} onChange={e => setMetodo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
                {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-pine-700">Extras</label>
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

          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">Concepto libre (línea de la factura)</label>
            <input type="text" value={conceptoLibre} onChange={e => setConceptoLibre(e.target.value)}
              placeholder="Deja en blanco para usar la descripción automática"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 resize-none" />
          </div>

          <div className="bg-khaki-100 rounded-lg p-4 text-right">
            <p className="text-sm text-pine-700">Importe: {mensualidad.toFixed(2)}€ — Descuento: {descuento.toFixed(2)}€ — Extras: {extrasTotal.toFixed(2)}€</p>
            <p className="text-2xl font-bold text-pine-900 mt-1">Total: {total.toFixed(2)} €</p>
          </div>

          {/* Invoice actions — only meaningful once the pago is complete */}
          {pago.estado_carga === "completo" && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-pine-700 mb-2">Factura / Recibo</h3>
              {pago.num_doc ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm bg-khaki-100 px-2 py-1 rounded">{pago.num_doc}</span>
                  {docs.map(d => (
                    <span key={d.id} className="inline-flex items-center gap-2">
                      <button onClick={() => handleDescargar(d)} disabled={downloadingId === d.id}
                        className="px-3 py-1.5 border rounded-lg text-xs text-brass-700 hover:bg-khaki-100 font-medium disabled:opacity-50">
                        {downloadingId === d.id ? "..." : "📥 Ver / Descargar (Ctrl+P para imprimir)"}
                      </button>
                      <span className="text-xs text-pine-600" title="Cuándo se emitió este documento/PDF">
                        Fecha de emisión: {formatFechaEmision(d.emitida_at)}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <div>
                  {facturaNoGenerada && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
                      ⚠ La factura no se generó automáticamente al completar este pago. Puedes reintentar:
                    </p>
                  )}
                  <button onClick={() => generarMut.mutate()} disabled={generarMut.isPending}
                    className="px-3 py-1.5 border rounded-lg text-xs text-brass-700 hover:bg-khaki-100 font-medium disabled:opacity-50">
                    {generarMut.isPending ? "Generando..." : "🧾 Generar factura/recibo"}
                  </button>
                </div>
              )}
              <p className="text-xs text-pine-600 mt-2">
                El envío por email al pagador ocurre automáticamente al generar — no hay un botón de reenvío manual todavía.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-6 pt-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-khaki-100 text-pine-700 text-sm hover:bg-khaki-200">
            Cerrar
          </button>
          <button onClick={handleSubmit} disabled={saveMut.isPending}
            className="px-4 py-2 rounded-lg bg-brass-500 text-white text-sm hover:bg-brass-700 disabled:opacity-50">
            {saveMut.isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}
