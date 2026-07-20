import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { canAccess } from "@/lib/roles"

export default function RoleProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { pathname } = useLocation()

  // Sessions persisted before `role`/`marca_asignada` existed on the user
  // object have role undefined. canAccess correctly denies that, but
  // redirecting into the same guard then loops forever on a blank page
  // (no error is ever thrown). Force a clean re-login instead, which
  // re-fetches the profile with role included.
  const staleSession = !!user && !user.role

  useEffect(() => {
    if (staleSession) logout()
  }, [staleSession, logout])

  if (staleSession) return <Navigate to="/login" replace />
  return canAccess(user?.role, pathname) ? <Outlet /> : <Navigate to="/alumnos" replace />
}
