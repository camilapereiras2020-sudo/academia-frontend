import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pagosApi } from "../api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { pagadoresApi } from "@/features/pagadores/api"
import { gruposApi } from "@/features/grupos/api"
import { tarifasApi } from "@/features/tarifas/api"
import type { Tarifa, Marca } from "@/types"
import { useSetActiveBrand } from "@/store/useSetActiveBrand"

const METODOS = ["efectivo","transferencia","bizum","domiciliacion","tarjeta"]
const MARCAS: { value: Marca; label: string }[] = [
  { value: "rangers_academy", label: "Rangers Academy" },
  { value: "cami_and_co", label: "Cami & Co" },
]

// Tarifas with no fixed price — amount stays manually editable when one of these is selected.
function tarifaAmountIsEditable(t: Tarifa | undefined) {
  if (!t) return true
  return t.marca === "cami_and_co" || t.nombre === "clase_privada" || t.nombre === "clase_recuperada"
}

interface ExtraLine { concepto: string; importe: number }

export default function NuevoPagoPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [error, setError] = useState("")

  const { data: alumnosRaw } = useQuery({ queryKey: ["alumnos"], queryFn: () => alumnosApi.list().then(r => r.data) })
  const { data: pagadoresRaw } = useQuery({ queryKey: ["pagadores"], queryFn: () => pagadoresApi.list().then(r => r.data) })
  const { data: gruposRaw } = useQuery({ queryKey: ["grupos"], queryFn: () => gruposApi.list().then(r => r.data) })
  const { data: tarifasRaw, isLoading: tarifasLoading } = useQuery({ queryKey: ["tarifas"], queryFn: () => tarifasApi.list().then(r => r.data) })

  const alumnos = Array.isArray(alumnosRaw) ? alumnosRaw : (alumnosRaw as any)?.results || []
  const pagadores = Array.isArray(pagadoresRaw) ? pagadoresRaw : (pagadoresRaw as any)?.results || []
  const grupos = Array.isArray(gruposRaw) ? gruposRaw : (gruposRaw as any)?.results || []
  const tarifas: Tarifa[] = Array.isArray(tarifasRaw) ? tarifasRaw : (tarifasRaw as any)?.results || []

  const [marca, setMarca] = useState<Marca | "">("")
  useSetActiveBrand(marca || null)
  const [alumno, setAlumno] = useState<number | "">("")
  const [pagador, setPagador] = useState<number | "">("")
  const [grupo, setGrupo] = useState<number | "">("")
  const [tarifa, setTarifa] = useState<number | "">("")
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7))
  const [mensualidad, setMensualidad] = useState(0)
  const [horas, setHoras] = useState<number | "">("")
  const [descuento, setDescuento] = useState(0)
  const [metodo, setMetodo] = useState("efectivo")
  const [notas, setNotas] = useState("")
  const [extras, setExtras] = useState<ExtraLine[]>([])
  const [estado, setEstado] = useState<"pagado" | "pendiente" | "parcial">("pendiente")

  const selectedTarifa = tarifas.find(t => t.id === tarifa)
  const montoEditable = tarifaAmountIsEditable(selectedTarifa)

  const selectedAlumno = alumnos.find((a: any) => a.id === alumno)
  const alumnoEsAdulto = !!selectedAlumno?.es_adulto

  function onAlumnoChange(aid: number) {
    setAlumno(aid)
    const a = alumnos.find((x: any) => x.id === aid)
    // An adult alumno pays for themself by default — only prefill pagador
    // when one is actually on file (e.g. a parent still covers an adult's fees).
    setPagador(a?.pagador ?? "")
  }

  function onTarifaChange(tid: number) {
    setTarifa(tid)
    const t = tarifas.find(x => x.id === tid)
    if (t && !tarifaAmountIsEditable(t)) setMensualidad(Number(t.precio))
  }

  const extrasTotal = extras.reduce((s, e) => s + e.importe, 0)
  const total = mensualidad - descuento + extrasTotal

  const saveMut = useMutation({
    mutationFn: (borrador: boolean) => pagosApi.create({
      marca: marca as Marca,
      alumno: alumno === "" ? null : alumno,
      pagador: pagador === "" ? null : pagador,
      grupo: grupo || null,
      tarifa: tarifa || null,
      periodo, mensualidad, descuento, extras, total, metodo, notas, estado,
      horas_trabajadas: horas === "" ? 0 : horas,
      fecha: estado === "pagado" ? new Date().toISOString().slice(0, 10) : null,
      ...(borrador ? { guardar_como_borrador: true } : {}),
    }),
    onSuccess: (_res, borrador) => {
      qc.invalidateQueries({ queryKey: ["pagos"] })
      qc.invalidateQueries({ queryKey: ["pagos-pendientes"] })
      qc.invalidateQueries({ queryKey: ["pagos-sugerencias"] })
      navigate(borrador ? "/pagos/pendientes" : "/pagos")
    },
    onError: () => setError("Error al guardar el pago. Verifica todos los campos."),
  })

  function handleSubmit() {
    if (!marca) { setError("Elige la marca/emisor antes de guardar."); return }
    // An adult alumno (es_adulto) pays for themself — pagador is optional in that case.
    if (!alumno || (!pagador && !alumnoEsAdulto) || !periodo) {
      setError("Completa todos los campos obligatorios")
      return
    }
    setError("")
    saveMut.mutate(false)
  }

  function handleSaveDraft() {
    // Same relaxation as a bulk-imported draft: alumno/pagador/grupo can
    // stay blank, only periodo/metodo/total (already defaulted above) and
    // marca (never defaulted — see PagoSerializer) are needed.
    if (!marca) { setError("Elige la marca/emisor antes de guardar, incluso como borrador."); return }
    if (!periodo) { setError("El periodo es obligatorio, incluso para un borrador."); return }
    setError("")
    saveMut.mutate(true)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-head font-normal text-3xl text-pine-900 mb-6">Nuevo pago</h1>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

        <div>
          <label className="block text-xs font-semibold text-pine-700 mb-1">Marca / Emisor *</label>
          <select value={marca} onChange={e => setMarca(e.target.value as Marca)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
            <option value="">Seleccionar...</option>
            {MARCAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">Alumno *</label>
            <select value={alumno} onChange={e => onAlumnoChange(+e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
              <option value="">Seleccionar...</option>
              {alumnos.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">
              Pagador{alumnoEsAdulto ? "" : " *"}
            </label>
            <select value={pagador} onChange={e => setPagador(e.target.value ? +e.target.value : "")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
              <option value="">{alumnoEsAdulto ? "El alumno paga por sí mismo" : "Seleccionar..."}</option>
              {pagadores.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            {alumnoEsAdulto && !pagador && (
              <p className="text-xs text-khaki-500 mt-1">Alumno adulto — el pagador es opcional.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">Grupo</label>
            <select value={grupo} onChange={e => setGrupo(+e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
              <option value="">Sin grupo</option>
              {grupos.map((g: any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">Tarifa</label>
            <select value={tarifa} onChange={e => onTarifaChange(+e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
              <option value="">Sin tarifa / manual</option>
              {tarifasLoading && <option value="" disabled>Cargando tarifas...</option>}
              {(["rangers_academy", "cami_and_co"] as const).map(marca => {
                const opciones = tarifas.filter(t => t.marca === marca)
                if (!opciones.length) return null
                return (
                  <optgroup key={marca} label={marca === "rangers_academy" ? "Rangers Academy" : "Cami & Co"}>
                    {opciones.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nombre_display}
                        {t.horas_semanales ? ` — ${t.horas_semanales}h/sem` : ""}
                        {tarifaAmountIsEditable(t) ? "" : ` — ${Number(t.precio).toFixed(2)}€`}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">Horas</label>
            <input type="number" value={horas} onChange={e => setHoras(e.target.value === "" ? "" : +e.target.value)} min="0" step="0.1"
              placeholder="Ej: 1.5"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">Periodo *</label>
            <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">Mensualidad (€)</label>
            <input type="number" value={mensualidad} onChange={e => setMensualidad(+e.target.value)} min="0" step="0.01"
              disabled={!montoEditable}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 disabled:bg-khaki-100 disabled:text-khaki-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">Descuento (€)</label>
            <input type="number" value={descuento} onChange={e => setDescuento(+e.target.value)} min="0" step="0.01"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">Metodo de pago</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-pine-700 mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value as "pagado" | "pendiente" | "parcial")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500">
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="parcial">Pago parcial</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-pine-700">Extras</label>
            <button onClick={() => setExtras(e => [...e, { concepto: "", importe: 0 }])} className="text-xs text-brass-700 hover:text-pine-900">+ Anadir extra</button>
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

        <div className="flex justify-end gap-2">
          <button onClick={() => navigate("/pagos")} className="px-4 py-2 rounded-lg bg-khaki-100 text-pine-700 text-sm hover:bg-khaki-200">Cancelar</button>
          <button onClick={handleSaveDraft} disabled={saveMut.isPending}
            title="Guarda lo que tengas hasta ahora sin alumno/pagador/grupo definitivos — no genera factura ni reserva número, aparece en Pagos pendientes"
            className="px-4 py-2 rounded-lg bg-orange-100 text-orange-800 text-sm hover:bg-orange-200 disabled:opacity-50">
            {saveMut.isPending ? "Guardando..." : "Guardar como borrador"}
          </button>
          <button onClick={handleSubmit} disabled={saveMut.isPending}
            className="px-4 py-2 rounded-lg bg-brass-500 text-white text-sm hover:bg-brass-700 disabled:opacity-50">
            {saveMut.isPending ? "Guardando..." : "Crear pago"}
          </button>
        </div>
      </div>
    </div>
  )
}
