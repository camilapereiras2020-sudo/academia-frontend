import { useState } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { pagosApi } from "@/features/pagos/api"
import { gruposApi } from "@/features/grupos/api"
import { grupoLabel } from "@/features/grupos/palette"
import { tarifasApi } from "@/features/tarifas/api"
import type { Alumno, AlumnoCuota, CargoExtra, Tarifa } from "@/types"

// Atajo desde la sección "Cuota" de la ficha: arma un Pago nuevo con la
// cuota calculada + clases a mayores ya cargadas. Deliberadamente NO genera
// factura ni recibo acá — un recibo es por cliente, y a veces hace falta
// una factura por marca, así que combinar/separar documentos se sigue
// decidiendo aparte, desde Pagos o Payers. Para editar un pago ya
// existente, seguir usando PagoDetailModal.

const METODOS = ["efectivo", "transferencia", "bizum", "domiciliacion", "tarjeta"]

function tarifaAmountIsEditable(t: Tarifa | undefined) {
  if (!t) return true
  return t.marca === "cami_and_co" || t.nombre === "clase_privada" || t.nombre === "clase_recuperada"
}

interface ExtraLine { concepto: string; importe: number }

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
  const [creado, setCreado] = useState(false)

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
    onSuccess: () => {
      setCreado(true)
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

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-xl font-bold text-pine-900">Generar pago — {alumno.nombre}</h2>
          <button onClick={onClose} className="text-khaki-400 hover:text-pine-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {sinPagador && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              ⚠ Este alumno no tiene pagador vinculado (y no es adulto que pague por sí mismo). Cargá un pagador en
              "Datos generales" antes de crear el pago.
            </p>
          )}
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</p>}

          {!creado ? (
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

              <p className="text-xs text-pine-600 -mt-1">
                Este pago queda pendiente de facturar — nadie recibe número ni email hasta que confirmes la factura
                desde Pagos o desde Payers (si es para combinar con hermanos).
              </p>

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
          ) : (
            <p className="text-sm text-sage-700 border-t pt-4">
              ✓ Pago registrado por {formatEurLocal(total)}. Generá la factura o el recibo cuando corresponda, desde
              Pagos o Payers.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 p-6 pt-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-khaki-100 text-pine-700 text-sm hover:bg-khaki-200">
            {creado ? "Cerrar" : "Cancelar"}
          </button>
          {!creado && (
            <button onClick={() => crearMut.mutate()} disabled={crearMut.isPending || sinPagador || !periodo}
              className="px-4 py-2 rounded-lg bg-brass-500 text-white text-sm hover:bg-brass-700 disabled:opacity-50">
              {crearMut.isPending ? "Creando..." : "💳 Crear pago"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatEurLocal(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
}
