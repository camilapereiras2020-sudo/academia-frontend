import { useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/features/auth/api"

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    if (!isAuthenticated) return
    // The user object is cached in localStorage from login and never refetched
    // otherwise, so server-side role/permission changes (e.g. an admin change)
    // wouldn't show up until the next full login. Refresh it once per app load.
    authApi.getProfile().then((res) => setUser(res.data)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
