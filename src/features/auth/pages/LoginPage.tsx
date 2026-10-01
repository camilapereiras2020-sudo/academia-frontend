import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "../api"

export default function LoginPage() {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const mutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: async ({ data }) => {
      setTokens(data.access, data.refresh)
      const profile = await authApi.getProfile()
      setUser(profile.data)
      navigate("/dashboard")
    },
    onError: () => setError("Email o contrasena incorrectos"),
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-forest-900">
      <div className="bg-cream rounded-2xl shadow-lg p-8 w-full max-w-sm border border-brass/20">
        <h1 className="text-2xl font-bold text-center text-forest-900 mb-6 font-poster tracking-wide">Rangers Academy</h1>
        {error && <p className="text-red-700 text-sm mb-4 bg-red-100 p-3 rounded-lg">{error}</p>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest-700/70 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-khaki-dark/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass bg-white text-forest-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest-700/70 mb-1">Contrasena</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && mutation.mutate()}
              className="w-full border border-khaki-dark/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brass bg-white text-forest-900" />
          </div>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="w-full bg-brass text-forest-950 py-2 rounded-lg text-sm font-semibold hover:bg-brass-light disabled:opacity-50 transition-colors">
            {mutation.isPending ? "Iniciando sesion..." : "Iniciar sesion"}
          </button>
          <p className="text-center text-sm text-forest-700/70">
            No tienes cuenta? <Link to="/register" className="text-brass-dim underline hover:text-brass">Crear cuenta</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
