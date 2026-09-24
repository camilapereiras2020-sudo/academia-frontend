import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useLocation } from "react-router-dom"
import { LogOut, Menu } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { queryClient } from "@/lib/queryClient"
import AvisosBell from "@/features/avisos/components/AvisosBell"

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/alumnos': 'Alumnos',
  '/grupos': 'Grupos',
  '/calendario': 'Calendario',
  '/horario': 'Horario',
  '/asistencia': 'Asistencia',
  '/pagos': 'Pagos',
  '/pagos/nuevo': 'Nuevo pago',
  '/pagos/pendientes': 'Pagos pendientes',
  '/pendientes': 'Pendientes',
  '/cumpleanos': 'Cumpleaños',
  '/documentos': 'Documentos',
  '/crm': 'CRM',
  '/whatsapp-respuestas': 'Respuestas WhatsApp',
  '/empresas': 'Empresas',
  '/facturacion': 'Facturación',
  '/precios': 'Precios',
  '/payers': 'Pagadores',
  '/config': 'Configuración',
}

// Detail routes ("/alumnos/12") get their own title; anything else falls
// back to its parent section's title.
const DETAIL_TITLES: Record<string, string> = {
  '/alumnos': 'Ficha del alumno',
  '/grupos': 'Grupo',
  '/payers': 'Pagador',
}

function pageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const parent = '/' + (pathname.split('/').filter(Boolean)[0] ?? '')
  return DETAIL_TITLES[parent] ?? PAGE_TITLES[parent] ?? 'Station Desk'
}

function useClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return time
}

// Below `xl` (tablet/phone) the bar is pine with hamburger, small logo and
// avatar; from `xl` up it's khaki with the page title in Bevan.
export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const now = useClock()

  const title = pageTitle(location.pathname)
  const initial = (user?.username || "?").charAt(0).toUpperCase()

  const todayFull = now.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const clockTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  const handleLogout = () => {
    useAuthStore.getState().logout()
    queryClient.clear()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between gap-3 px-3 sm:px-5 xl:px-8 h-16 xl:h-auto xl:py-5 flex-shrink-0 bg-pine-900 text-khaki-100 xl:bg-khaki-100 xl:text-pine-900 xl:border-b xl:border-pine-900/15">
      {/* Tablet: hamburguesa + logo pequeño */}
      <div className="flex items-center gap-2 min-w-0 xl:hidden">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="w-11 h-11 flex items-center justify-center rounded-[10px] text-khaki-100 hover:bg-white/10 flex-shrink-0"
        >
          <Menu size={22} strokeWidth={2} />
        </button>
        <img src="/logos/rangers-academy-logo.png" alt="Rangers Academy" className="w-8 h-8 object-contain flex-shrink-0" />
        <span className="font-head text-[17px] leading-none truncate">{title}</span>
      </div>

      {/* Escritorio: fecha + título */}
      <div className="hidden xl:block min-w-0">
        <div className="font-label text-[13px] font-semibold uppercase tracking-[0.1em] text-pine-600">
          {todayFull}
        </div>
        <h1 className="font-head text-[28px] leading-tight text-pine-900 mt-1 truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <div className="hidden xl:flex items-center h-11 px-3.5 rounded-[10px] bg-pine-900 text-khaki-100 font-head text-[16px]">
          {clockTime}
        </div>

        <AvisosBell />

        <button
          onClick={() => i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')}
          aria-label="Cambiar idioma"
          className="hidden sm:flex items-center justify-center h-11 min-w-11 px-2.5 rounded-[10px] font-label text-[14px] font-semibold uppercase tracking-[0.1em] border border-khaki-100/30 xl:border-pine-900/25 hover:bg-white/10 xl:hover:bg-pine-900/5"
        >
          {i18n.language === 'es' ? 'ES' : 'EN'}
        </button>

        <button
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="flex items-center justify-center gap-1.5 h-11 min-w-11 px-2.5 rounded-[10px] font-label text-[14px] font-semibold hover:bg-white/10 xl:hover:bg-pine-900/5 xl:hover:text-brass-700"
        >
          <LogOut size={16} strokeWidth={2} />
          <span className="hidden xl:inline">Salir</span>
        </button>

        <div
          className="xl:hidden w-9 h-9 ml-1 rounded-full bg-brass-500 flex items-center justify-center font-head text-pine-900 text-sm flex-shrink-0"
          aria-label={user?.username || "Usuario"}
        >
          {initial}
        </div>
      </div>
    </header>
  )
}
