
import { NavLink } from "react-router-dom"
import { useBrandStore } from "@/store/brandStore"
import { useAuthStore } from "@/store/authStore"
import { canAccess } from "@/lib/roles"
import {
  LayoutDashboard, GraduationCap, FolderOpen,
  CheckSquare, Plus, ClipboardList, Clock, Cake, Settings,
  FileText, UserSearch, Building2, MessageCircle,
  Receipt
} from "lucide-react"

const LOGO_SRC = {
  cami_and_co: "/logos/camico-logo-navy-gold.png",
  rangers_academy: "/logos/rangers-academy-logo.png",
} as const

const NAV_SECTIONS = [
  {
    label: "Academia",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Panel" },
      { to: "/alumnos", icon: GraduationCap, label: "Alumnos" },
      { to: "/grupos", icon: FolderOpen, label: "Grupos" },
      { to: "/asistencia", icon: CheckSquare, label: "Asistencia" },
      { to: "/cumpleanos", icon: Cake, label: "Cumpleaños" },
    ]
  },
  {
    label: "Finanzas",
    items: [
      { to: "/pagos/nuevo", icon: Plus, label: "Nuevo pago" },
      { to: "/pagos", icon: ClipboardList, label: "Pagos" },
      { to: "/pendientes", icon: Clock, label: "Pendientes" },
      { to: "/documentos", icon: FileText, label: "Documentos" },
      { to: "/facturacion", icon: Receipt, label: "Facturación" },
    ]
  },
  {
    label: "Crecimiento",
    items: [
      { to: "/crm", icon: UserSearch, label: "CRM" },
      { to: "/whatsapp-respuestas", icon: MessageCircle, label: "Respuestas WhatsApp" },
      { to: "/empresas", icon: Building2, label: "Empresas" },
    ]
  },
]

export default function Sidebar() {
  const activeBrand = useBrandStore((s) => s.activeBrand)
  const brand = activeBrand ?? "cami_and_co"
  const role = useAuthStore((s) => s.user?.role)
  const navSections = NAV_SECTIONS
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccess(role, item.to)) }))
    .filter((section) => section.items.length > 0)
  return (
    <aside style={{
      width: '220px',
      flexShrink: 0,
      background: 'var(--dark-2)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.75rem 1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <div style={{
          background: brand === "rangers_academy" ? "#fff" : "transparent",
          borderRadius: brand === "rangers_academy" ? "8px" : 0,
          padding: brand === "rangers_academy" ? "0.5rem" : 0,
        }}>
          <img
            src={LOGO_SRC[brand]}
            alt={brand === "rangers_academy" ? "Rangers Academy" : "Cami & Co"}
            style={{
              width: '140px',
              height: 'auto',
              opacity: brand === "rangers_academy" ? 1 : 0.9,
              display: 'block',
            }}
          />
        </div>
        <div style={{
          fontSize: '0.55rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
          textAlign: 'center',
        }}>
          Academia de Inglés
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
        {navSections.map((section) => (
          <div key={section.label} style={{ marginBottom: '1.5rem' }}>
            <div style={{
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              padding: '0 0.75rem',
              marginBottom: '0.4rem',
            }}>
              {section.label}
            </div>
            {section.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/pagos"}
                style={{ textDecoration: 'none' }}
                className={({ isActive }) => isActive ? 'nav-active' : ''}
              >
                {({ isActive }) => (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 400,
                    color: isActive ? 'var(--gold)' : 'var(--text-muted)',
                    background: isActive ? 'var(--gold-muted)' : 'transparent',
                    transition: 'all 0.15s',
                    marginBottom: '0.1rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text)'
                      ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                      ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    }
                  }}
                  >
                    <Icon size={14} strokeWidth={1.5} />
                    {label}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <NavLink to="/config" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={13} strokeWidth={1.5} style={{ color: 'var(--text-dim)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Configuración</span>
        </NavLink>
      </div>
    </aside>
  )
}
