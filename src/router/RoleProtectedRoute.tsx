import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { canAccess } from "@/lib/roles"

export default function RoleProtectedRoute() {
  const role = useAuthStore((s) => s.user?.role)
  const { pathname } = useLocation()
  return canAccess(role, pathname) ? <Outlet /> : <Navigate to="/alumnos" replace />
}
