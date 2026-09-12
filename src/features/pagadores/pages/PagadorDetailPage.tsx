import { useMemo, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Receipt } from "lucide-react"
import { pagadoresApi } from "../api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { pagosApi, documentosApi, emisoresApi } from "@/features/pagos/api"
import { formatEur, formatMonth } from "@/lib/utils"

const MARCA_LABEL: Record<string, string> = {
  cami_and_co: "Cami & Co",
  rangers_academy: "Rangers Academy",
}

export default function PagadorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const pagadorId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [emisorOverride, setEmisorOverride] = useState<number | "">("")
  const [error, setError] = useState("")

  const { data: pagador, isLoading: loadingPagador } = useQuery({
    queryKey: ["pagador", pagadorId],
    queryFn: () => pagadoresApi.get(pagadorId).then((r) => r.data),
    enabled: !!pagadorId,
  })

  const { data: alumnos, isLoading: loadingAlumnos } = useQuery({
    queryKey: ["alumnos", { pagador: pagadorId }],
    queryFn: () => alumnosApi.list({ pagador: pagadorId }).then((r) => r.data),
    enabled: !!pagadorId,
  })

  const { data: pagos, isLoading: loadingPagos } = useQuery({
    queryKey: ["pagos", { pagador: pagadorId }],
    queryFn: () => pagosApi.list({ pagador: pagadorId }).then((r) => r.data),
    enabled: !!pagadorId,
  })

  const { data: emisores } = useQuery({
    queryKey: ["emisores"],
    queryFn: () => emisoresApi.list().then((r) => r.data),
  })

  // Only pagos with no invoice yet can be bundled — same guard the backend
  // enforces (generar-combinado rejects anything already invoiced).
  const pendientes = useMemo(
    () => (pagos ?? []).filter((p) => p.estado_carga === "completo" && !p.num_doc),
    [pagos]
  )
  const yaFacturados = useMemo(() => (pagos ?? []).filter((p) => p.num_doc), [pagos])

  const seleccionados = pendientes.filter((p) => selected.has(p.id))
  const emisorIds = new Set(seleccionados.map((p) => p.emisor).filter((e): e is number => !!e))
  // The sisters' arrangement: when the family's kids are split across both
  // brands (i.e. the selected pagos don't already agree on one emisor),
  // whoever invoices this family is a business decision, not a guess —
  // require picking it explicitly.
  const needsEmisorChoice = emisorIds.size > 1
  const total = seleccionados.reduce((sum, p) => sum + Number(p.total), 0)

  const combinarMut = useMutation({
    mutationFn: () =>
      documentosApi.generarCombinado(
        [...selected],
        needsEmisorChoice ? Number(emisorOverride) : undefined
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pagos", { pagador: pagadorId }] })
      qc.invalidateQueries({ queryKey: ["documentos"] })
      setSelected(new Set())
      setEmisorOverride("")
      setError("")
    },
    onError: (err: any) => setError(err.response?.data?.error ?? "Error al generar la factura combinada."),
  })

  function toggle(pagoId: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(pagoId)) next.delete(pagoId)
      else next.add(pagoId)
      return next
    })
  }

  const canSubmit = seleccionados.length >= 2 && (!needsEmisorChoice || !!emisorOverride)

  if (loadingPagador) return <p className="text-khaki-400 text-sm">Cargando...</p>
  if (!pagador) return <p className="text-red-600 text-sm">Pagador no encontrado.</p>

  return (
    <div>
      <button
        onClick={() => navigate("/payers")}
        className="flex items-center gap-1.5 text-sm text-pine-700 hover:text-pine-900 mb-4"
      >
        <ArrowLeft size={15} /> Volver a Payers
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif font-light text-[2.5rem] leading-none tracking-[-0.01em] text-pine-900">{pagador.nombre}</h1>
          <p className="text-sm text-pine-700 mt-1">
            {[pagador.email, pagador.telefono].filter(Boolean).join(" · ") || "Sin datos de contacto"}
          </p>
        </div>
      </div>

      {/* Hijos */}
      <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-pine-600 mb-3">
          Alumnos ({alumnos?.length ?? 0})
        </p>
        {loadingAlumnos && <p className="text-khaki-400 text-sm">Cargando...</p>}
        {!loadingAlumnos && !alumnos?.length && <p className="text-sm text-pine-600">Sin alumnos vinculados.</p>}
        <div className="flex flex-wrap gap-2">
          {alumnos?.map((a) => (
            <Link
              key={a.id}
              to={`/alumnos/${a.id}`}
              className="flex items-center gap-2 bg-khaki-100 rounded-lg px-3 py-1.5 text-sm text-pine-900 hover:bg-khaki-200"
            >
              {a.nombre}
              <span className="text-xs text-pine-600">{MARCA_LABEL[a.marca] ?? a.marca}</span>
            </Link>
          ))}
        </div>
        {(alumnos?.length ?? 0) > 1 && new Set(alumnos?.map((a) => a.marca)).size > 1 && (
          <p className="text-xs text-pine-600 mt-3">
            Esta familia tiene hijos en ambas marcas — al combinar sus pagos en una factura hay que elegir quién la emite.
          </p>
        )}
      </div>

      {/* Combinar factura */}
      <div className="bg-white rounded-xl border shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold uppercase tracking-widest text-pine-600">Facturar juntos (Bono Familia)</p>
          <Receipt size={16} className="text-brass-700" />
        </div>
        <p className="text-xs text-pine-600 mb-4">
          Selecciona 2 o más pagos pendientes de facturar para emitir una única factura que los cubra a todos.
        </p>

        {loadingPagos && <p className="text-khaki-400 text-sm">Cargando...</p>}
        {!loadingPagos && !pendientes.length && (
          <p className="text-sm text-pine-600">No hay pagos pendientes de facturar para este pagador.</p>
        )}

        <div className="space-y-1.5 mb-4">
          {pendientes.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                selected.has(p.id) ? "border-brass-500 bg-khaki-50" : "border-khaki-200 hover:border-khaki-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="accent-brass-500"
              />
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <span className="text-sm font-medium text-pine-900">{p.alumno_nombre ?? "—"}</span>
                  <span className="text-xs text-pine-600 ml-2">
                    {formatMonth(p.periodo)} · {MARCA_LABEL[p.marca] ?? p.marca}
                    {p.emisor_nombre && ` · ${p.emisor_nombre}`}
                  </span>
                </div>
                <span className="text-sm font-semibold text-pine-900">{formatEur(Number(p.total))}</span>
              </div>
            </label>
          ))}
        </div>

        {seleccionados.length > 0 && (
          <div className="bg-pine-900 text-white rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-brass-300 font-semibold">
                {seleccionados.length} pago{seleccionados.length !== 1 ? "s" : ""} seleccionados
              </p>
              <p className="text-sm text-khaki-200 mt-0.5">
                {seleccionados.map((p) => p.alumno_nombre).filter(Boolean).join(", ")}
              </p>
            </div>
            <p className="text-2xl font-bold text-brass-300">{formatEur(total)}</p>
          </div>
        )}

        {needsEmisorChoice && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-pine-700 mb-1">
              ¿Quién emite esta factura? (obligatorio: los pagos seleccionados están repartidos entre marcas)
            </label>
            <select
              value={emisorOverride}
              onChange={(e) => setEmisorOverride(e.target.value ? Number(e.target.value) : "")}
              className="w-full max-w-xs border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass-500 bg-white"
            >
              <option value="">Elegir...</option>
              {emisores?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre} ({e.autonoma})
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg mb-4">{error}</p>}

        <button
          onClick={() => combinarMut.mutate()}
          disabled={!canSubmit || combinarMut.isPending}
          className="px-4 py-2 rounded-lg bg-brass-500 text-white text-sm font-medium hover:bg-brass-700 disabled:opacity-50"
        >
          {combinarMut.isPending ? "Generando..." : "Generar factura combinada"}
        </button>
      </div>

      {/* Ya facturados */}
      {yaFacturados.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-pine-600 mb-3">
            Ya facturados ({yaFacturados.length})
          </p>
          <div className="space-y-1.5">
            {yaFacturados.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-pine-700">
                  {p.alumno_nombre} · {formatMonth(p.periodo)}
                </span>
                <span className="font-mono text-xs text-pine-600">{p.num_doc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
