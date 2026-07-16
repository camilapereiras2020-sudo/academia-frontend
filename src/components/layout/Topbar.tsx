
import { useTranslation } from "react-i18next"
import { useNavigate, useLocation } from "react-router-dom"
import { LogOut } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { queryClient } from "@/lib/queryClient"

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Panel principal',
  '/alumnos': 'Alumnos',
  '/pagadores': 'Pagadores',
  '/grupos': 'Grupos',
  '/asistencia': 'Asistencia',
  '/pagos': 'Pagos',
  '/pagos/nuevo': 'Nuevo pago',
  '/pendientes': 'Pendientes',
  '/cumpleanos': 'Cumpleaños',
  '/documentos': 'Documentos',
  '/crm': 'CRM',
  '/whatsapp-respuestas': 'Respuestas WhatsApp',
  '/config': 'Configuración',
}

export default function Topbar() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const title = PAGE_TITLES[location.pathname] || 'Cami&Co'

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const handleLogout = () => {
    useAuthStore.getState().logout()
    queryClient.clear()
    navigate('/login')
  }

  return (
    <header style={{
      height: '56px',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.75rem',
      background: 'var(--dark)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
        <span style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '1.1rem',
          fontWeight: 400,
          color: 'var(--text)',
          letterSpacing: '0.01em',
        }}>
          {title}
        </span>
        <span style={{
          fontSize: '0.72rem',
          color: 'var(--text-dim)',
          letterSpacing: '0.03em',
        }}>
          {today}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')}
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '0.25rem 0.6rem',
            cursor: 'pointer',
          }}
        >
          {i18n.language === 'es' ? 'ES' : 'EN'}
        </button>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem 0',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          <LogOut size={13} strokeWidth={1.5} />
          Salir
        </button>
      </div>
    </header>
  )
}
