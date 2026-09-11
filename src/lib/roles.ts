import type { Role } from "@/store/authStore"

export const ALL_ROLES: Role[] = ["owner", "co_manager", "reception"]

// Single source of truth for page-level access, shared by RoleProtectedRoute
// (blocks direct URL access) and Sidebar (hides the nav item). Routes not
// listed here (e.g. /grupos/:id) are open to every authenticated role.
export const PAGE_ROLES: Record<string, Role[]> = {
  "/dashboard": ALL_ROLES,
  "/alumnos": ALL_ROLES,
  "/grupos": ALL_ROLES,
  "/calendario": ALL_ROLES,
  "/horario": ALL_ROLES,
  "/asistencia": ["owner", "co_manager"],
  "/pagos": ["owner", "co_manager"],
  "/pagos/nuevo": ["owner", "co_manager"],
  "/pagos/pendientes": ["owner", "co_manager"],
  "/cumpleanos": ALL_ROLES,
  "/documentos": ["owner", "co_manager"],
  "/config": ["owner", "co_manager"],
  "/pendientes": ["owner", "co_manager"],
  "/crm": ALL_ROLES,
  "/whatsapp-respuestas": ALL_ROLES,
  "/empresas": ["owner", "co_manager"],
  "/facturacion": ["reception", "co_manager"],
  "/precios": ALL_ROLES,
  "/payers": ["owner", "co_manager"],
}

export function canAccess(role: Role | undefined, path: string): boolean {
  const allowed = PAGE_ROLES[path] ?? nearestAncestorRule(path)
  if (!allowed) return true
  return !!role && allowed.includes(role)
}

// A dynamic detail route (e.g. "/payers/12") isn't listed itself — it
// inherits its parent's rule ("/payers") so it can't be reached by URL
// just because it's missing from PAGE_ROLES.
function nearestAncestorRule(path: string): Role[] | undefined {
  const segments = path.split("/").filter(Boolean)
  for (let i = segments.length - 1; i > 0; i--) {
    const parent = "/" + segments.slice(0, i).join("/")
    if (PAGE_ROLES[parent]) return PAGE_ROLES[parent]
  }
  return undefined
}
