
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useLocation } from "react-router-dom"
import { LogOut } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { queryClient } from "@/lib/queryClient"

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Panel principal',
  '/alumnos': 'Alumnos',
  '/grupos': 'Grupos',
  '/calendario': 'Calendario',
  '/horario': 'Horario',
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

function useClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function Topbar() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const now = useClock()

  const title = PAGE_TITLES[location.pathname] || 'Cami&Co'

  const today = now.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const clockTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  const handleLogout = () => {
    useAuthStore.getState().logout()
    queryClient.clear()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between gap-4 px-7 py-4 bg-khaki-100 border-b-[3px] border-pine-800 flex-shrink-0 flex-wrap">
      <div className="min-w-0">
        <div className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-pine-700 whitespace-nowrap">
          {today}
        </div>
        <h1 className="font-head font-normal text-[24px] text-pine-800 mt-1 whitespace-nowrap">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-end">
        <div className="flex items-center gap-2 bg-pine-800 text-khaki-100 px-3.5 py-2 rounded-[5px] flex-shrink-0">
          <span className="font-head text-[16px] leading-none">{clockTime}</span>
          <span className="text-[10px] font-bold text-brass-300 uppercase tracking-[0.03em] whitespace-nowrap">Trail Time</span>
        </div>

        <button
          onClick={() => i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')}
          className="text-[11px] font-body font-semibold text-pine-700 uppercase tracking-[0.1em] bg-transparent border border-pine-800/30 rounded-md px-2.5 py-1.5 cursor-pointer hover:bg-pine-800/5"
        >
          {i18n.language === 'es' ? 'ES' : 'EN'}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-[13px] text-pine-700 bg-transparent border-none cursor-pointer px-1 py-1 transition-colors hover:text-brass-700"
        >
          <LogOut size={14} strokeWidth={2} />
          Salir
        </button>
      </div>
    </header>
  )
}
