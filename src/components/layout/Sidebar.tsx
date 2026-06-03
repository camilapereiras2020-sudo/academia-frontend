
import { NavLink } from "react-router-dom"
import {
  LayoutDashboard, GraduationCap, Users, FolderOpen,
  CheckSquare, Plus, ClipboardList, Clock, Cake, Settings,
  FileText, UserSearch, Building2,
  Joystick, BookOpen, Grid3X3, Shuffle
} from "lucide-react"

const NAV_SECTIONS = [
  {
    label: "Academia",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Panel" },
      { to: "/alumnos", icon: GraduationCap, label: "Alumnos" },
      { to: "/pagadores", icon: Users, label: "Pagadores" },
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
    ]
  },
  {
    label: "Crecimiento",
    items: [
      { to: "/crm", icon: UserSearch, label: "CRM" },
      { to: "/juegos/vocab", icon: Joystick, label: "Vocab Game" },
      { to: "/juegos/flashcards", icon: BookOpen, label: "Flashcards" },
      { to: "/juegos/memoria", icon: Grid3X3, label: "Memory Match" },
      { to: "/juegos/scramble", icon: Shuffle, label: "Word Scramble" },
      { to: "/empresas", icon: Building2, label: "Empresas" },
    ]
  },
]

export default function Sidebar() {
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
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <img
          src="/image.png"
          alt="Cami&Co"
          style={{
            width: '80px',
            height: 'auto',
            opacity: 0.9,
          }}
        />
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
        {NAV_SECTIONS.map((section) => (
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
