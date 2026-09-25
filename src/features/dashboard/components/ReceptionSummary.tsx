import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { dashboardApi } from "../api"

function AttentionCard({
  numero, titulo, to, vacio, children,
}: {
  numero: number; titulo: string; to: string; vacio: boolean; children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={`card !bg-white flex gap-4 p-5 no-underline hover:!border-brass-500 ${vacio ? "opacity-60" : ""}`}
    >
      <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center font-head text-[18px] ${
        vacio ? "bg-khaki-100 text-ink-soft" : "bg-pine-900 text-brass-500"
      }`}>
        {numero}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-head text-[20px] leading-tight text-pine-900 mb-2">{titulo}</p>
        {children}
      </div>
    </Link>
  )
}

export default function ReceptionSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "reception-summary"],
    queryFn: () => dashboardApi.receptionSummary().then(r => r.data),
  })

  const cumples = data?.cumpleanos ?? []
  const whatsappCount = data?.whatsapp_pendientes_count ?? 0
  const incompletos = data?.alumnos_incompletos ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Qué hacer hoy</h1>
        <p className="page-subtitle">Lo que necesita tu atención, en orden de prioridad</p>
      </div>

      {isLoading && <p className="text-[15px] text-ink-soft">Cargando…</p>}

      {!isLoading && (
        <div className="flex flex-col gap-3 max-w-3xl">
          <AttentionCard numero={1} titulo="Cumpleaños próximos" to="/cumpleanos" vacio={!cumples.length}>
            {!cumples.length && (
              <p className="text-[15px] text-ink-soft">Nada pendiente</p>
            )}
            {!!cumples.length && (
              <ul className="list-none flex flex-col gap-1">
                {cumples.slice(0, 5).map(c => (
                  <li key={c.id} className="text-[15px] text-ink-soft">
                    {c.nombre} — {c.dias_para_cumpleanos === 0 ? "¡hoy!" : c.dias_para_cumpleanos === 1 ? "mañana" : `en ${c.dias_para_cumpleanos} días`}
                  </li>
                ))}
                {cumples.length > 5 && (
                  <li className="font-label text-[14px] font-semibold text-brass-700">+{cumples.length - 5} más</li>
                )}
              </ul>
            )}
          </AttentionCard>

          <AttentionCard numero={2} titulo="WhatsApp pendientes" to="/whatsapp-respuestas" vacio={!whatsappCount}>
            <p className="text-[15px] text-ink-soft">
              {whatsappCount ? `${whatsappCount} consulta${whatsappCount === 1 ? "" : "s"} sin responder` : "Nada pendiente"}
            </p>
          </AttentionCard>

          <AttentionCard numero={3} titulo="Alumnos con datos incompletos" to="/alumnos?incompletos=1" vacio={!incompletos.length}>
            {!incompletos.length && (
              <p className="text-[15px] text-ink-soft">Nada pendiente</p>
            )}
            {!!incompletos.length && (
              <ul className="list-none flex flex-col gap-1">
                {incompletos.slice(0, 5).map(a => (
                  <li key={a.id} className="text-[15px] text-ink-soft">
                    {a.nombre} — falta {!a.telefono && !a.email ? "teléfono y email" : !a.telefono ? "teléfono" : "email"}
                  </li>
                ))}
                {incompletos.length > 5 && (
                  <li className="font-label text-[14px] font-semibold text-brass-700">+{incompletos.length - 5} más</li>
                )}
              </ul>
            )}
          </AttentionCard>
        </div>
      )}
    </div>
  )
}
