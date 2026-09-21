import { useEffect, useState } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { pagosApi, documentosApi, emisoresApi } from "@/features/pagos/api"
import { gruposApi } from "@/features/grupos/api"
import { grupoLabel } from "@/features/grupos/palette"
import { tarifasApi } from "@/features/tarifas/api"
import { descargarDocumento } from "@/lib/descargarDocumento"
import { formatEur } from "@/lib/utils"
import type { Alumno, AlumnoCuota, CargoExtra, Pago, Tarifa } from "@/types"

// Atajo desde la sección "Cuota" de la ficha, en dos pasos:
// 1) Generar pago — crea el Pago de este alumno, sin ningún documento
//    (un recibo es por cliente, y a veces hace falta una factura por
//    marca, así que combinar/separar documentos no encaja en este paso).
// 2) Generar documento — una vez pagado, si el pagador tiene otros pagos de
//    este mismo mes sin facturar (hermanos), se ofrece combinarlos en una
//    sola factura (misma regla que Payers: generarCombinado exige 2+ pagos,
//    siempre genera "factura" — nunca recibo, es así en el backend — y si
//    están repartidos entre las dos marcas, obliga a elegir el emisor a
//    mano). Con un solo pago, se genera el documento individual de
//    siempre (factura o recibo, según tipo_doc_for_metodo — no se
//    reimplementa esa regla acá, es la fuente de verdad del backend).
// Para editar un pago ya existente, seguir usando PagoDetailModal.

const METODOS = ["efectivo", "transferencia", "bizum", "domiciliacion", "tarjeta"]

function tarifaAmountIsEditable(t: Tarifa | undefined) {
  if (!t) return true
  return t.marca === "cami_and_co" || t.nombre === "clase_privada" || t.nombre === "clase_recuperada"
}

interface ExtraLine { concepto: string; importe: number }
interface DocumentoGenerado { id: number; num_doc: string; tipo: "factura" | "recibo"; combinada: boolean }

export default function GenerarFacturaModal({
  alumno, cuota, cargosExtra, onClose,
}: {
  alumno: Alumno
  cuota: AlumnoCuota | null
  cargosExtra: CargoExtra[]
  pagador?: unknown
  onClose: () => void
}) {
  const qc = useQueryClient()

  const { data: gruposRaw } = useQuery({ queryKey: ["grupos"], queryFn: () => gruposApi.list().then(r => r.data) })
  const grupos = Array.isArray(gruposRaw) ? gruposRaw : (gruposRaw as any)?.results ?? []
  const { data: tarifasRaw } = useQuery({ queryKey: ["tarifas"], queryFn: () => tarifasApi.list().then(r => r.data) })
  const tarifas: Tarifa[] = Array.isArray(tarifasRaw) ? tarifasRaw : (tarifasRaw as any)?.results ?? []

  const [grupo, setGrupo] = useState<number | "">("")
  const [tarifa, setTarifa] = useState<number | "">("")
  const [horas, setHoras] = useState<number | "">("")
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7))
  const [mensualidad, setMensualidad] = useState(cuota?.cuota ?? 0)
  const [descuento, setDescuento] = useState(0)
  const [metodo, setMetodo] = useState("efectivo")
  const [estado, setEstado] = useState<"pagado" | "pendiente" | "parcial">("pagado")
  const [notas, setNotas] = useState("")
  const [extras, setExtras] = useState<ExtraLine[]>(
    cargosExtra.map(c => ({ concepto: c.concepto, importe: Number(c.monto) }))
  )
  const [error, setError] = useState("")
  const [pagoCreado, setPagoCreado] = useState<Pago | null>(null)
  const [doc, setDoc] = useState<DocumentoGenerado | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())
  const [emisorOverride, setEmisorOverride] = useState<number | "">("")
  const [downloading, setDownloading] = useState(false)

  const selectedTarifa = tarifas.find(t => t.id === tarifa)
  const montoEditable = tarifaAmountIsEditable(selectedTarifa)

  function onTarifaChange(tid: number | "") {
    setTarifa(tid)
    const t = tarifas.find(x => x.id === tid)
    if (t && !tarifaAmountIsEditable(t)) setMensualidad(Number(t.precio))
  }

  const extrasTotal = extras.reduce((s, e) => s + Number(e.importe || 0), 0)
  const total = mensualidad - descuento + extrasTotal
  const sinPagador = !alumno.pagador && !alumno.es_adulto

  const crearMut = useMutation({
    mutationFn: () => pagosApi.create({
      marca: alumno.marca,
      alumno: alumno.id,
      pagador: alumno.pagador,
      grupo: grupo || null,
      tarifa: tarifa || null,
      horas_trabajadas: horas === "" ? 0 : horas,
      periodo, mensualidad, descuento, extras, total, metodo, estado, notas,
      fecha: estado === "pagado" ? new Date().toISOString().slice(0, 10) : null,
    }),
    onSuccess: (res) => {
      setPagoCreado(res.data)
      setError("")
      qc.invalidateQueries({ queryKey: ["alumno-resumen", alumno.id] })
    },
    onError: (err: any) =>
      setError(
        err.response?.data?.error ??
        err.response?.data?.non_field_errors?.[0] ??
        err.response?.data?.marca?.[0] ??
        "Error al crear el pago."
      ),
  })

  // Paso 2 — otros pagos del mismo pagador y periodo, sin facturar todavía
  // (hermanos), para ofrecer combinarlos en un solo recibo. Solo tiene
  // sentido consultarlo cuando hay un pagador real de por medio.
  const { data: pagosPagadorRaw } = useQuery({
    queryKey: ["pagos", "pagador-periodo", alumno.pagador, periodo],
    queryFn: () => pagosApi.list({ pagador: alumno.pagador as number, periodo }).then(r => r.data),
    enabled: !!pagoCreado && !!alumno.pagador,
  })
  const pagosPagador: Pago[] = Array.isArray(pagosPagadorRaw) ? pagosPagadorRaw : []
  const pendientes = pagoCreado
    ? (alumno.pagador
        ? pagosPagador.filter(p => p.estado_carga === "completo" && !p.num_doc)
        : [pagoCreado])
    : []

  const { data: emisoresRaw } = useQuery({
    queryKey: ["emisores"],
    queryFn: () => emisoresApi.list().then(r => r.data),
    enabled: !!pagoCreado && pendientes.length >= 2,
  })
  const emisores = Array.isArray(emisoresRaw) ? emisoresRaw : []

  // Todos preseleccionados apenas se conocen — staff puede destildar si
  // alguno de los hermanos no va en este recibo.
  useEffect(() => {
    if (pendientes.length) setSeleccionados(new Set(pendientes.map(p => p.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagosPagadorRaw, pagoCreado])

  function toggleSeleccion(id: number) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const elegidos = pendientes.filter(p => seleccionados.has(p.id))
  const emisorIds = new Set(elegidos.map(p => p.emisor).filter((e): e is number => !!e))
  const necesitaElegirEmisor = emisorIds.size > 1
  const totalRecibo = elegidos.reduce((s, p) => s + Number(p.total), 0)

  const generarReciboMut = useMutation({
    mutationFn: async () => {
      const combinada = elegidos.length >= 2
      const res = combinada
        ? await documentosApi.generarCombinado([...seleccionados], necesitaElegirEmisor ? Number(emisorOverride) : undefined)
        : await documentosApi.generar((elegidos[0] ?? pagoCreado!).id)
      return { ...res.data, combinada } as DocumentoGenerado
    },
    onSuccess: (generado) => {
      setDoc(generado)
      setError("")
      qc.invalidateQueries({ queryKey: ["alumno-resumen", alumno.id] })
      qc.invalidateQueries({ queryKey: ["documentos", "alumno", alumno.id] })
      qc.invalidateQueries({ queryKey: ["pagos"] })
    },
    onError: (err: any) =>
      setError(err.response?.data?.error ?? "Error generando el recibo."),
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

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-xl font-bold text-pine-900">
            {pagoCreado ? "Confirmar documento" : "Generar pago"} — {alumno.nombre}
          </h2>
          <button onClick={onClose} className="text-khaki-400 hover:text-pine-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {sinPagador && !pagoCreado && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              ⚠ Este alumno no tiene pagador vinculado (y no es adulto que pague por sí mismo). Cargá un pagador en
              "Datos generales" antes de crear el pago.
            </p>
          )}
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>}

          {!pagoCreado ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-pine-700 mb-1">Grupo</label>
                  <select value={grupo} onChange={e => setGrupo(e.target.value ? +e.target.value : "")}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
                    <option value="">Sin grupo</option>
                    {grupos.map((g: any) => <option key={g.id} value={g.id}>{grupoLabel(g)}</option>)}
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
                  <label className="block text-xs font-semibold text-pine-700 mb-1">Horas</label>
                  <input type="number" value={horas} onChange={e => setHoras(e.target.value === "" ? "" : +e.target.value)}
                    min="0" step="0.1" placeholder="Ej: 1.5"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-pine-700 mb-1">Periodo *</label>
                  <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-pine-700 mb-1">Mensualidad (€)</label>
                  <input type="number" value={mensualidad} onChange={e => setMensualidad(+e.target.value)}
                    min="0" step="0.01" disabled={!montoEditable}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 disabled:bg-khaki-100 disabled:text-khaki-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-pine-700 mb-1">Descuento (€)</label>
                  <input type="number" value={descuento} onChange={e => setDescuento(+e.target.value)}
                    min="0" step="0.01"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-pine-700 mb-1">Método de pago</label>
                  <select value={metodo} onChange={e => setMetodo(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
                    {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-pine-700 mb-1">Estado</label>
                  <select value={estado} onChange={e => setEstado(e.target.value as "pagado" | "pendiente" | "parcial")}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
                    <option value="pagado">Pagado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="parcial">Pago parcial</option>
                  </select>
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

              <div>
                <label className="block text-xs font-semibold text-pine-700 mb-1">Notas</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 resize-none" />
              </div>

              <div className="bg-khaki-100 rounded-lg p-4 text-right">
                <p className="text-sm text-pine-700">Mensualidad: {mensualidad.toFixed(2)}€ — Descuento: {descuento.toFixed(2)}€ — Extras: {extrasTotal.toFixed(2)}€</p>
                <p className="text-2xl font-bold text-pine-900 mt-1">Total: {total.toFixed(2)} €</p>
              </div>
            </>
          ) : !doc ? (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm text-sage-700">✓ Pago registrado por {formatEur(total)}.</p>

              {pendientes.length >= 2 ? (
                <>
                  <p className="text-xs text-pine-700">
                    Este pagador tiene {pendientes.length} pagos de {periodo} sin facturar (hermanos) — elegí cuáles van
                    juntos en una misma factura combinada:
                  </p>
                  <div className="space-y-1.5">
                    {pendientes.map(p => (
                      <label key={p.id} className="flex items-center gap-2 text-sm bg-khaki-50 border rounded-lg px-3 py-2">
                        <input type="checkbox" checked={seleccionados.has(p.id)} onChange={() => toggleSeleccion(p.id)} />
                        <span className="flex-1">{p.alumno_nombre ?? "—"}</span>
                        <span className="font-mono text-xs text-pine-600">{p.marca_display}</span>
                        <span className="font-semibold">{formatEur(Number(p.total))}</span>
                      </label>
                    ))}
                  </div>
                  {necesitaElegirEmisor && (
                    <div>
                      <label className="block text-xs font-semibold text-pine-700 mb-1">
                        Emisor (los seleccionados están repartidos entre las dos marcas)
                      </label>
                      <select value={emisorOverride} onChange={e => setEmisorOverride(e.target.value ? +e.target.value : "")}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
                        <option value="">Elegir...</option>
                        {emisores.map((em: any) => <option key={em.id} value={em.id}>{em.nombre}</option>)}
                      </select>
                    </div>
                  )}
                  <p className="text-right font-semibold text-pine-900">Total de la factura combinada: {formatEur(totalRecibo)}</p>
                </>
              ) : (
                <p className="text-xs text-pine-600">
                  Sin otros pagos de {periodo} pendientes de facturar para este pagador — se genera el documento
                  (factura o recibo, según el método de pago) solo para este pago.
                </p>
              )}
            </div>
          ) : (
            <div className="border-t pt-4">
              <p className="text-sm text-sage-700 mb-3">
                ✓ {doc.tipo === "factura" ? "Factura" : "Recibo"}{doc.combinada ? " combinada" : ""} generad{doc.tipo === "factura" ? "a" : "o"} correctamente.
              </p>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="font-mono text-sm bg-khaki-100 px-2 py-1 rounded">{doc.num_doc}</span>
                <button onClick={handleDescargar} disabled={downloading}
                  className="px-3 py-1.5 border rounded-lg text-xs text-brass-700 hover:bg-khaki-100 font-medium disabled:opacity-50">
                  {downloading ? "..." : "📥 Ver / Descargar"}
                </button>
              </div>
              <p className="text-xs text-pine-600">
                Las facturas para Hacienda se generan aparte, por marca, desde Payers o "Generar pagos de mes".
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-6 pt-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-khaki-100 text-pine-700 text-sm hover:bg-khaki-200">
            {doc ? "Cerrar" : pagoCreado ? "Cerrar sin generar documento" : "Cancelar"}
          </button>
          {!pagoCreado && (
            <button onClick={() => crearMut.mutate()} disabled={crearMut.isPending || sinPagador || !periodo}
              className="px-4 py-2 rounded-lg bg-brass-500 text-white text-sm hover:bg-brass-700 disabled:opacity-50">
              {crearMut.isPending ? "Creando..." : "💳 Crear pago"}
            </button>
          )}
          {pagoCreado && !doc && (
            <button
              onClick={() => generarReciboMut.mutate()}
              disabled={generarReciboMut.isPending || !elegidos.length || (necesitaElegirEmisor && !emisorOverride)}
              className="px-4 py-2 rounded-lg bg-brass-500 text-white text-sm hover:bg-brass-700 disabled:opacity-50">
              {generarReciboMut.isPending
                ? "Generando..."
                : elegidos.length >= 2 ? "🧾 Generar factura combinada" : "🧾 Generar documento"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
