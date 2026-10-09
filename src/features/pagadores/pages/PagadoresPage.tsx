import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Search, ChevronDown, ChevronUp } from "lucide-react"
import { pagadoresApi } from "../api"
import type { EstadoPagoFamilia } from "@/types"

const ESTADO_PAGO_CLS: Record<EstadoPagoFamilia, string> = {
  pagado: "bg-pine-100 text-pine-700",
  parcial: "bg-brass-300/40 text-brass-700",
  pendiente: "bg-red-100 text-red-700",
  sin_generar: "bg-khaki-200 text-ink-soft",
}
const ESTADO_PAGO_LABEL: Record<EstadoPagoFamilia, string> = {
  pagado: "Pagado",
  parcial: "Pago parcial",
  pendiente: "Debe este mes",
  sin_generar: "Sin generar",
}

// Orden en la lista: primero a quien hay que reclamar.
const ORDEN_ESTADO: Record<EstadoPagoFamilia, number> = { pendiente: 0, parcial: 1, sin_generar: 2, pagado: 3 }

export default function PagadoresPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [abierto, setAbierto] = useState<number | null>(null)
  const [estadoFiltro, setEstadoFiltro] = useState<"" | EstadoPagoFamilia>("")

  const { data: pagadores, isLoading } = useQuery({
    queryKey: ["pagadores"],
    queryFn: () => pagadoresApi.list().then((r) => r.data),
  })

  const { data: calculo } = useQuery({
    queryKey: ["pagadores", "calculadora"],
    queryFn: () => pagadoresApi.calculadora().then((r) => r.data),
  })
  const calculoPorId = new Map((calculo ?? []).map((c) => [c.pagador_id, c]))

  // Busca por nombre, NIF/DNI, email o teléfono (este último sin espacios).
  const q = search.trim().toLowerCase()
  const qTel = q.replace(/\s/g, "")
  const visibles = (pagadores ?? [])
    .filter((p) =>
      !q
      || p.nombre.toLowerCase().includes(q)
      || (p.nif ?? "").toLowerCase().includes(q)
      || (p.email ?? "").toLowerCase().includes(q)
      || (!!qTel && (p.telefono ?? "").replace(/\s/g, "").includes(qTel))
    )
    .filter((p) => !estadoFiltro || calculoPorId.get(p.id)?.estado_pago === estadoFiltro)
    .sort((a, b) => {
      const ea = calculoPorId.get(a.id)?.estado_pago, eb = calculoPorId.get(b.id)?.estado_pago
      return (ea ? ORDEN_ESTADO[ea] : 9) - (eb ? ORDEN_ESTADO[eb] : 9)
    })

  // Resumen del mes: cuántas familias en cada estado y cuánto queda por cobrar
  // (suma de la cuota estimada de quien debe o ha pagado solo una parte).
  const cuenta: Record<EstadoPagoFamilia, number> = { pendiente: 0, parcial: 0, sin_generar: 0, pagado: 0 }
  let porCobrar = 0
  for (const c of calculo ?? []) {
    cuenta[c.estado_pago] += 1
    if (c.estado_pago === "pendiente" || c.estado_pago === "parcial") porCobrar += c.cuota_mensual_estimada
  }
  const periodo = calculo?.[0]?.periodo

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Pagadores</h1>
          <p className="page-subtitle">{pagadores?.length ?? 0} pagadores registrados</p>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o DNI…"
          className="input !pl-10"
        />
      </div>

      {calculo && (
        <div className="mb-5">
          <p className="text-[15px] text-ink mb-3">
            {periodo && <span className="text-ink-soft">{periodo} · </span>}
            <strong>{cuenta.pendiente + cuenta.parcial}</strong> sin pagar del todo
            {" · "}Por cobrar (estimado): <strong>{porCobrar.toFixed(2)} €</strong>
          </p>
          <div className="flex gap-2 flex-wrap">
            {([
              ["", `Todos (${calculo.length})`],
              ["pendiente", `Debe este mes (${cuenta.pendiente})`],
              ["parcial", `Pago parcial (${cuenta.parcial})`],
              ["sin_generar", `Sin generar (${cuenta.sin_generar})`],
              ["pagado", `Pagado (${cuenta.pagado})`],
            ] as const).map(([v, label]) => (
              <button key={v} onClick={() => setEstadoFiltro(v)}
                className={`min-h-[40px] px-4 rounded-full font-label text-[14px] font-semibold border transition-colors ${
                  estadoFiltro === v
                    ? "bg-pine-900 text-khaki-100 border-pine-900"
                    : "bg-white text-pine-700 border-pine-900/20 hover:bg-khaki-100"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && <p className="text-ink-soft text-[15px]">Cargando...</p>}

      {!isLoading && !visibles.length && (
        <div className="card !bg-white flex flex-col items-center justify-center py-16 text-ink-soft">
          <span className="text-5xl mb-3">👛</span>
          <p className="text-[15px]">Sin pagadores.</p>
        </div>
      )}

      <div className="space-y-2">
        {visibles.map((p) => {
          const c = calculoPorId.get(p.id)
          const estaAbierto = abierto === p.id
          return (
            <div key={p.id} className="card !bg-white p-4 hover:!border-brass-500">
              <div
                onClick={() => navigate(`/payers/${p.id}`)}
                className="cursor-pointer flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-[16px] font-semibold text-ink">{p.nombre}</p>
                  <p className="text-[14px] text-ink-soft mt-0.5">
                    {p.es_alumno_adulto
                      ? "Alumno adulto"
                      : `${p.alumnos_count} alumno${p.alumnos_count !== 1 ? "s" : ""}`}
                    {p.email && ` · ${p.email}`}
                    {p.telefono && ` · ${p.telefono}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!p.es_alumno_adulto && p.alumnos_count > 1 && (
                    <span className="badge bg-khaki-200 text-brass-700 normal-case tracking-normal">
                      Familia
                    </span>
                  )}
                  {c && (
                    <>
                      <span className="text-[15px] font-semibold text-ink whitespace-nowrap">
                        {c.cuota_mensual_estimada.toFixed(2)}€
                      </span>
                      <span className={`badge normal-case tracking-normal whitespace-nowrap ${ESTADO_PAGO_CLS[c.estado_pago]}`}>
                        {ESTADO_PAGO_LABEL[c.estado_pago]}
                      </span>
                      {c.estado_pago === "pagado" && (
                        <span className={`badge normal-case tracking-normal whitespace-nowrap ${c.documento_generado ? "bg-pine-100 text-pine-700" : "bg-red-100 text-red-700"}`}>
                          {c.documento_generado ? "Factura/recibo OK" : "Sin factura/recibo"}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAbierto(estaAbierto ? null : p.id) }}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-ink-soft hover:bg-khaki-100 hover:text-pine-900"
                        title="Ver desglose"
                      >
                        {estaAbierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {estaAbierto && c && (
                <div className="mt-3 pt-3 border-t border-pine-900/10 text-[14px] text-ink space-y-1">
                  <p className="text-ink-soft mb-1.5">Desglose ({c.periodo}):</p>
                  {c.items.map((item, i) => (
                    <p key={i} className="flex items-center justify-between">
                      <span>
                        {item.alumno}
                        {item.tipo === "ranger_express" && " — The Ranger Express"}
                        {item.tipo === "bono_familia" && " — Bono Familia"}
                        {item.tipo === "clase_grupo" && " — Clase Grupo"}
                        {item.tipo === "manual" && " — cuota manual"}
                        {item.tipo === "privada_manual" && " — clase privada (cargar a mano)"}
                        {item.tipo === "sin_tabla" && " — sin calcular (revisar a mano)"}
                      </span>
                      <span className="text-ink-soft">{item.cuota != null ? `${item.cuota.toFixed(2)}€` : "—"}</span>
                    </p>
                  ))}
                  {c.avisos.length > 0 && (
                    <div className="mt-2 text-brass-700">
                      {c.avisos.map((a, i) => <p key={i}>⚠ {a}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
