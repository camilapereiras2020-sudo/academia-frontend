
import { NavLink } from "react-router-dom"
import { useBrandStore } from "@/store/brandStore"
import { useAuthStore } from "@/store/authStore"
import { canAccess } from "@/lib/roles"
import {
  LayoutDashboard, GraduationCap, CreditCard, Building2,
  Compass, CheckSquare, Tag, UserSearch, CalendarDays, CalendarClock,
  Coins, FileText, MessageCircle, Cake, Settings,
} from "lucide-react"

const LOGO_SRC = {
  cami_and_co: "/logos/camico-logo-navy-gold.png",
  rangers_academy: "/logos/rangers-academy-logo.png",
} as const

// `to: null` marks a nav item from the new IA that doesn't have a page yet —
// rendered disabled with a "Soon" tag rather than a broken link.
const NAV_SECTIONS = [
  {
    label: "Front Desk",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
      { to: "/alumnos", icon: GraduationCap, label: "Students" },
      { to: null, icon: CreditCard, label: "Payers" },
      { to: "/empresas", icon: Building2, label: "Companies" },
    ]
  },
  {
    label: "Trail Ops",
    items: [
      { to: "/grupos", icon: Compass, label: "Groups" },
      { to: "/calendario", icon: CalendarDays, label: "Calendar" },
      { to: "/horario", icon: CalendarClock, label: "Schedule" },
      { to: "/asistencia", icon: CheckSquare, label: "Attendance" },
      { to: null, icon: Tag, label: "Rates" },
      { to: "/crm", icon: UserSearch, label: "CRM" },
    ]
  },
  {
    label: "Ledger",
    items: [
      { to: "/pagos", icon: Coins, label: "Payments" },
      { to: "/documentos", icon: FileText, label: "Invoicing" },
      { to: "/whatsapp-respuestas", icon: MessageCircle, label: "WhatsApp" },
      { to: "/cumpleanos", icon: Cake, label: "Birthdays" },
    ]
  },
]

export default function Sidebar() {
  const activeBrand = useBrandStore((s) => s.activeBrand)
  const brand = activeBrand ?? "cami_and_co"
  const role = useAuthStore((s) => s.user?.role)
  const user = useAuthStore((s) => s.user)
  const navSections = NAV_SECTIONS
    .map((section) => ({ ...section, items: section.items.filter((item) => item.to === null || canAccess(role, item.to)) }))
    .filter((section) => section.items.length > 0)

  return (
    <aside className="w-[250px] flex-shrink-0 bg-pine-900 flex flex-col h-screen border-r-4 border-brass-500 relative overflow-hidden">
      {/* Logo / crest */}
      <div className="relative px-6 pt-8 pb-10 border-b border-white/10 overflow-hidden">
        <svg viewBox="0 0 250 90" preserveAspectRatio="none" className="pointer-events-none absolute left-0 right-0 bottom-0 w-full h-[82px] opacity-50">
          <path d="M0 90 L30 38 L55 68 L85 18 L115 60 L150 28 L185 65 L215 34 L250 62 L250 90 Z" fill="#52654f" />
          <path d="M0 90 L45 60 L75 75 L110 44 L140 72 L175 52 L210 75 L250 55 L250 90 Z" fill="#465a48" />
        </svg>
        <div className="relative flex items-center gap-3.5 flex-wrap">
          <img
            src={LOGO_SRC[brand]}
            alt={brand === "rangers_academy" ? "Rangers Academy" : "Cami & Co"}
            className="w-[58px] h-[58px] object-contain flex-shrink-0"
          />
          <div className="font-head text-[19px] text-khaki-100 leading-tight whitespace-nowrap">
            RANGERS
            <br />
            <span className="text-[11px] tracking-[0.2em] text-brass-300 font-body font-bold">STATION DESK</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-4">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-brass-300 px-2 pt-3.5 pb-2">
              {section.label}
            </div>
            {section.items.map(({ to, icon: Icon, label }) =>
              to === null ? (
                <div
                  key={label}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-[7px] font-head text-[16px] text-khaki-100/30 border-2 border-transparent mb-2 cursor-not-allowed"
                >
                  <Icon size={17} strokeWidth={2} />
                  {label}
                  <span className="ml-auto text-[9px] font-body font-bold uppercase tracking-wider text-khaki-100/40 border border-white/10 rounded px-1.5 py-0.5">
                    Soon
                  </span>
                </div>
              ) : (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-3 rounded-[7px] font-head text-[16px] mb-2 border-2 transition-colors ${
                      isActive
                        ? "text-pine-900 bg-brass-500 border-brass-700 shadow-[0_2px_0_#8A6B49]"
                        : "text-khaki-100 bg-white/[0.04] border-white/10 hover:bg-white/10 hover:border-brass-500"
                    }`
                  }
                >
                  <Icon size={17} strokeWidth={2} />
                  {label}
                </NavLink>
              )
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10 flex items-center gap-2.5">
        <div className="w-[34px] h-[34px] rounded-full bg-brass-500 flex items-center justify-center font-head text-pine-900 text-sm flex-shrink-0">
          {(user?.username || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-khaki-200 font-semibold truncate">{user?.username || "Front Desk"}</div>
          <NavLink to="/config" className="text-[11px] text-khaki-300 hover:text-brass-300 no-underline inline-flex items-center gap-1">
            <Settings size={11} strokeWidth={2} />
            Settings
          </NavLink>
        </div>
      </div>
    </aside>
  )
}
