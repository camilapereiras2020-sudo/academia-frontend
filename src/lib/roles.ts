import type { Role } from "@/store/authStore"

export const ALL_ROLES: Role[] = ["owner", "co_manager", "reception"]

// Single source of truth for page-level access, shared by RoleProtectedRoute
// (blocks direct URL access) and Sidebar (hides the nav item). Routes not
// listed here (e.g. /grupos/:id) are open to every authenticated role.
export const PAGE_ROLES: Record<string, Role[]> = {
  "/dashboard": ["owner", "co_manager"],
  "/alumnos": ALL_ROLES,
  "/pagadores": ["owner", "co_manager"],
  "/grupos": ALL_ROLES,
  "/asistencia": ["owner", "co_manager"],
  "/pagos": ["owner", "co_manager"],
  "/pagos/nuevo": ["owner", "co_manager"],
  "/pagos/pendientes": ["owner", "co_manager"],
  "/cumpleanos": ALL_ROLES,
  "/documentos": ["owner", "co_manager"],
  "/config": ["owner", "co_manager"],
  "/pendientes": ["owner", "co_manager"],
  "/crm": ["owner", "co_manager"],
  "/whatsapp-respuestas": ALL_ROLES,
  "/juegos/vocab": ALL_ROLES,
  "/juegos/flashcards": ALL_ROLES,
  "/juegos/memoria": ALL_ROLES,
  "/juegos/scramble": ALL_ROLES,
  "/empresas": ["owner", "co_manager"],
  "/facturacion": ["reception"],
}

export function canAccess(role: Role | undefined, path: string): boolean {
  const allowed = PAGE_ROLES[path]
  if (!allowed) return true
  return !!role && allowed.includes(role)
}
