import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { pagosApi } from "@/features/pagos/api"
import { alumnosApi } from "@/features/alumnos/alumnos_api"
import { gruposApi } from "@/features/grupos/api"
import { formatEur, formatMonth } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import ReceptionSummary from "../components/ReceptionSummary"
import type { Pago } from "@/types"

const ESTADO_CLS: Record<string, string> = {
  pagado:   "bg-green-100 text-green-800",
  pendiente: "bg-red-100 text-red-800",
  parcial:  "bg-amber-100 text-amber-800",
}

function StatCard({
  label, value, sub, accent = false,
}: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="stat-card">
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.5rem" }}>
        {label}
      </p>
      <p style={{ fontSize: "1.75rem", fontWeight: 600, color: accent ? "var(--gold)" : "var(--text)", lineHeight: 1, fontFamily: "Cormorant Garamond, serif" }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.35rem" }}>{sub}</p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const isReception = useAuthStore((s) => s.user?.role === "reception")
  return isReception ? <ReceptionSummary /> : <OwnerDashboard />
}

function OwnerDashboard() {
  const qc = useQueryClient()
  const mesAct = new Date().toISOString().slice(0, 7)

  const { data: pagosRaw } = useQuery({
    queryKey: ["pagos"],
    queryFn: () => pagosApi.list().then(r => r.data),
  })
  const pagos: Pago[] = Array.isArray(pagosRaw) ? pagosRaw : (pagosRaw as any)?.results ?? []

  const { data: alumnosRaw } = useQuery({
    queryKey: ["alumnos"],
    queryFn: () => alumnosApi.list().then(r => r.data),
  })
  const alumnosCount = (Array.isArray(alumnosRaw) ? alumnosRaw : []).length

  const { data: gruposRaw } = useQuery({
    queryKey: ["grupos"],
    queryFn: () => gruposApi.list().then(r => r.data),
  })
  const gruposCount = (Array.isArray(gruposRaw) ? gruposRaw : []).length

  const { data: cumpleRaw } = useQuery({
    queryKey: ["cumpleanos", 30],
    queryFn: () => alumnosApi.cumpleanos(30).then(r => r.data),
  })
  const cumples: any[] = Array.isArray(cumpleRaw) ? cumpleRaw : []

  const marcarMut = useMutation({
    mutationFn: pagosApi.marcarPagado,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pagos"] }),
  })

  // Derived stats
  const estesMes       = pagos.filter(p => p.periodo === mesAct)
  const cobradoMes     = estesMes.filter(p => p.estado === "pagado").reduce((s, p) => s + Number(p.total), 0)
  const totalMes       = estesMes.reduce((s, p) => s + Number(p.total), 0)
  const coleccionRate  = totalMes > 0 ? Math.round((cobradoMes / totalMes) * 100) : null
  const pendientes     = pagos.filter(p => p.estado === "pendiente" || p.estado === "parcial")
  const importePendiente = pendientes.reduce((s, p) => s + Number(p.total), 0)
  const recientes      = [...pagos].sort((a, b) => b.id - a.id).slice(0, 6)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 className="page-title">Panel</h1>
          <p className="page-subtitle">{formatMonth(mesAct)}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link to="/asistencia" className="btn-ghost">Pasar lista</Link>
          <Link to="/pagos/nuevo" className="btn-primary">+ Nuevo pago</Link>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
        <StatCard
          label="Cobrado este mes"
          value={formatEur(cobradoMes)}
          sub={`${estesMes.filter(p => p.estado === "pagado").length} pagos cobrados`}
          accent
        />
        <StatCard
          label="Pendiente de cobro"
          value={formatEur(importePendiente)}
          sub={`${pendientes.length} sin cobrar`}
        />
        <StatCard
          label="Tasa de cobro"
          value={coleccionRate !== null ? `${coleccionRate}%` : "—"}
          sub={totalMes > 0 ? `de ${formatEur(totalMes)} en ${formatMonth(mesAct)}` : "sin pagos este mes"}
          accent={coleccionRate !== null && coleccionRate >= 80}
        />
        <StatCard label="Alumnos" value={String(alumnosCount)} sub="registrados" />
        <StatCard label="Grupos activos" value={String(gruposCount)} sub="en curso" />
      </div>

      {/* Middle row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

        {/* Pending payments */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text)" }}>Pagos pendientes</span>
            <Link to="/pendientes" style={{ fontSize: "0.75rem", color: "var(--gold)", textDecoration: "none" }}>Ver todos →</Link>
          </div>
          {!pendientes.length && (
            <div style={{ padding: "2.5rem 1.25rem", textAlign: "center", color: "var(--text-dim)" }}>
              <p style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>✓</p>
              <p style={{ fontSize: "0.8rem" }}>Todo cobrado. Sin pendientes.</p>
            </div>
          )}
          <ul style={{ listStyle: "none" }}>
            {pendientes.slice(0, 6).map(p => (
              <li key={p.id} style={{ padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.alumno_nombre}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.pagador_nombre} · {formatMonth(p.periodo)}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>{formatEur(Number(p.total))}</span>
                  <span className={`badge ${ESTADO_CLS[p.estado]}`}>{p.estado}</span>
                  <button
                    onClick={() => marcarMut.mutate(p.id)}
                    disabled={marcarMut.isPending && marcarMut.variables === p.id}
                    className="btn-ghost"
                    style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", color: "var(--gold)" }}
                  >✓</button>
                </div>
              </li>
            ))}
          </ul>
          {pendientes.length > 6 && (
            <div style={{ padding: "0.75rem 1.25rem", background: "var(--dark-3)", textAlign: "center" }}>
              <Link to="/pendientes" style={{ fontSize: "0.75rem", color: "var(--gold)", textDecoration: "none" }}>
                +{pendientes.length - 6} más → Ver todos
              </Link>
            </div>
          )}
        </div>

        {/* Upcoming birthdays */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text)" }}>Próximos cumpleaños</span>
            <Link to="/cumpleanos" style={{ fontSize: "0.75rem", color: "var(--gold)", textDecoration: "none" }}>Ver todos →</Link>
          </div>
          {!cumples.length && (
            <div style={{ padding: "2.5rem 1.25rem", textAlign: "center", color: "var(--text-dim)" }}>
              <p style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>🎂</p>
              <p style={{ fontSize: "0.8rem" }}>Sin cumpleaños en los próximos 30 días.</p>
            </div>
          )}
          <ul style={{ listStyle: "none" }}>
            {cumples.slice(0, 6).map((c: any) => (
              <li key={c.id} style={{ padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "var(--gold-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>
                  🎂
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                    {c.fecha_nacimiento
                      ? new Date(c.fecha_nacimiento).toLocaleDateString("es-ES", { day: "numeric", month: "long" })
                      : ""}
                  </p>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  {c.dias_para_cumpleanos === 0
                    ? <span className="badge" style={{ background: "var(--gold-muted)", color: "var(--gold)" }}>¡Hoy!</span>
                    : c.dias_para_cumpleanos === 1
                    ? <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--gold)" }}>Mañana</span>
                    : <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>en {c.dias_para_cumpleanos} días</span>
                  }
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent payments */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text)" }}>Últimos pagos</span>
          <Link to="/pagos" style={{ fontSize: "0.75rem", color: "var(--gold)", textDecoration: "none" }}>Ver todos →</Link>
        </div>
        {!recientes.length && (
          <p style={{ padding: "2rem 1.5rem", fontSize: "0.875rem", color: "var(--text-dim)", textAlign: "center" }}>Sin pagos registrados.</p>
        )}
        {!!recientes.length && (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {["Alumno", "Pagador", "Periodo", "Importe", "Método", "Estado", "Doc"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recientes.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap" }}>{p.alumno_nombre}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{p.pagador_nombre}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatMonth(p.periodo)}</td>
                    <td style={{ fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>{formatEur(Number(p.total))}</td>
                    <td style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>{p.metodo}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={`badge ${ESTADO_CLS[p.estado]}`}>{p.estado}</span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-dim)", whiteSpace: "nowrap" }}>{p.num_doc || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
