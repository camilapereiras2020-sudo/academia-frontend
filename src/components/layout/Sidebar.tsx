import { NavLink } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { canAccess } from "@/lib/roles"
import {
  LayoutDashboard, GraduationCap, CreditCard, Building2,
  Users, CheckSquare, Tag, UserSearch, CalendarDays, CalendarClock,
  Coins, FileText, MessageCircle, Cake, Settings, X,
} from "lucide-react"

const LOGO_SRC = "/logos/rangers-academy-logo.png"

const NAV_SECTIONS = [
  {
    label: "Diario",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/horario", icon: CalendarClock, label: "Horario" },
      { to: "/calendario", icon: CalendarDays, label: "Calendario" },
      { to: "/asistencia", icon: CheckSquare, label: "Asistencia" },
    ]
  },
  {
    label: "Personas",
    items: [
      { to: "/alumnos", icon: GraduationCap, label: "Alumnos" },
      { to: "/grupos", icon: Users, label: "Grupos" },
      { to: "/crm", icon: UserSearch, label: "CRM" },
      { to: "/cumpleanos", icon: Cake, label: "Cumpleaños" },
      { to: "/payers", icon: CreditCard, label: "Pagadores" },
      { to: "/empresas", icon: Building2, label: "Empresas" },
    ]
  },
  {
    label: "Comunicación",
    items: [
      { to: "/whatsapp-respuestas", icon: MessageCircle, label: "WhatsApp" },
    ]
  },
  {
    label: "Dinero",
    items: [
      { to: "/pagos", icon: Coins, label: "Pagos" },
      { to: "/documentos", icon: FileText, label: "Documentos" },
      { to: "/precios", icon: Tag, label: "Precios" },
    ]
  },
]

// `open`/`onClose` only matter below `xl` — that's when the sidebar is an
// overlay drawer instead of always-visible. Above `xl` the sidebar renders
// in flow regardless of `open`.
export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const role = useAuthStore((s) => s.user?.role)
  const user = useAuthStore((s) => s.user)
  const navSections = NAV_SECTIONS
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccess(role, item.to)) }))
    .filter((section) => section.items.length > 0)

  return (
    <aside className={`
      w-[248px] flex-shrink-0 bg-pine-900 flex flex-col h-screen overflow-hidden
      fixed xl:static inset-y-0 left-0 z-50 transition-transform duration-200
      ${open ? "translate-x-0" : "-translate-x-full"} xl:translate-x-0
    `}>
      <button
        onClick={onClose}
        aria-label="Cerrar menú"
        className="xl:hidden absolute top-2 right-2 z-10 w-11 h-11 flex items-center justify-center rounded-[10px] text-khaki-100/70 hover:text-khaki-100 hover:bg-white/10"
      >
        <X size={20} strokeWidth={2} />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5 border-b border-white/10">
        <img
          src={LOGO_SRC}
          alt="Rangers Academy"
          className="w-12 h-12 object-contain flex-shrink-0"
        />
        <div className="min-w-0">
          <div className="font-head text-[20px] leading-none text-khaki-100">Rangers</div>
          <div className="font-label text-[12px] font-semibold tracking-[0.18em] text-brass-500 mt-1.5">STATION DESK</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navSections.map((section) => (
          <div key={section.label} className="mb-3">
            <div className="font-label text-[12px] font-semibold uppercase tracking-[0.14em] text-khaki-100/55 px-3 pt-3 pb-1.5">
              {section.label}
            </div>
            {section.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 h-10 px-3 mb-0.5 rounded-[10px] font-body text-[15px] font-medium transition-colors ${
                    isActive
                      ? "bg-khaki-100/[0.14] text-khaki-100"
                      : "text-khaki-100/80 hover:bg-white/[0.07] hover:text-khaki-100"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      strokeWidth={2}
                      className={isActive ? "text-brass-500" : "text-khaki-100/60 group-hover:text-khaki-100/90"}
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Usuario */}
      <div className="px-4 py-3.5 border-t border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brass-500 flex items-center justify-center font-head text-pine-900 text-sm flex-shrink-0">
          {(user?.username || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] text-khaki-100 font-semibold truncate">{user?.username || "Recepción"}</div>
          {canAccess(role, "/config") && (
            <NavLink
              to="/config"
              onClick={onClose}
              className="font-label text-[13px] text-khaki-100/60 hover:text-brass-500 no-underline inline-flex items-center gap-1"
            >
              <Settings size={12} strokeWidth={2} />
              Configuración
            </NavLink>
          )}
        </div>
      </div>
    </aside>
  )
}
