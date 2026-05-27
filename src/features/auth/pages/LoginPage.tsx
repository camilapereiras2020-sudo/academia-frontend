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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">Academia de Ingles</h1>
        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Contrasena</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && mutation.mutate()}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {mutation.isPending ? "Iniciando sesion..." : "Iniciar sesion"}
          </button>
          <p className="text-center text-sm text-slate-500">
            No tienes cuenta? <Link to="/register" className="text-blue-600 underline">Crear cuenta</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
