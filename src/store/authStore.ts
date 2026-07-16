import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Marca } from "@/types"

export type Role = "owner" | "co_manager" | "reception"

interface User {
  id: number
  email: string
  username: string
  role: Role
  marca_asignada: Marca | null
  academia_nombre: string
  academia_nif: string
  academia_dir: string
  academia_tel: string
  academia_logo: string
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  setTokens: (access: string, refresh: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setTokens: (access, refresh) => {
        localStorage.setItem("access_token", access)
        localStorage.setItem("refresh_token", refresh)
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true })
      },
      setUser: (user) => set({ user }),
      logout: () => {
        localStorage.clear()
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
      },
    }),
    { name: "academia-auth" }
  )
)
