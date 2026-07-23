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
      className="card"
      style={{
        display: "flex", gap: "1rem", padding: "1.25rem", textDecoration: "none",
        opacity: vacio ? 0.55 : 1,
      }}
    >
      <div style={{
        width: "2.25rem", height: "2.25rem", borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: vacio ? "var(--dark-3)" : "var(--gold-muted)",
        color: vacio ? "var(--text-dim)" : "var(--gold)",
        fontWeight: 600, fontFamily: "Cormorant Garamond, serif", fontSize: "1.1rem",
      }}>
        {numero}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--text)", marginBottom: "0.4rem" }}>
          {titulo}
        </p>
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div>
        <h1 className="page-title">Qué hacer hoy</h1>
        <p className="page-subtitle">Lo que necesita tu atención, en orden de prioridad</p>
      </div>

      {isLoading && <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>Cargando…</p>}

      {!isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <AttentionCard numero={1} titulo="Cumpleaños próximos" to="/cumpleanos" vacio={!cumples.length}>
            {!cumples.length && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Nada pendiente</p>
            )}
            {!!cumples.length && (
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {cumples.slice(0, 5).map(c => (
                  <li key={c.id} style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                    {c.nombre} — {c.dias_para_cumpleanos === 0 ? "¡hoy!" : c.dias_para_cumpleanos === 1 ? "mañana" : `en ${c.dias_para_cumpleanos} días`}
                  </li>
                ))}
                {cumples.length > 5 && (
                  <li style={{ fontSize: "0.75rem", color: "var(--gold)" }}>+{cumples.length - 5} más</li>
                )}
              </ul>
            )}
          </AttentionCard>

          <AttentionCard numero={2} titulo="WhatsApp pendientes" to="/whatsapp-respuestas" vacio={!whatsappCount}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
              {whatsappCount ? `${whatsappCount} consulta${whatsappCount === 1 ? "" : "s"} sin responder` : "Nada pendiente"}
            </p>
          </AttentionCard>

          <AttentionCard numero={3} titulo="Alumnos con datos incompletos" to="/alumnos?incompletos=1" vacio={!incompletos.length}>
            {!incompletos.length && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Nada pendiente</p>
            )}
            {!!incompletos.length && (
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {incompletos.slice(0, 5).map(a => (
                  <li key={a.id} style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                    {a.nombre} — falta {!a.telefono && !a.email ? "teléfono y email" : !a.telefono ? "teléfono" : "email"}
                  </li>
                ))}
                {incompletos.length > 5 && (
                  <li style={{ fontSize: "0.75rem", color: "var(--gold)" }}>+{incompletos.length - 5} más</li>
                )}
              </ul>
            )}
          </AttentionCard>
        </div>
      )}
    </div>
  )
}
