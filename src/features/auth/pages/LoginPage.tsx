import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { isAxiosError } from "axios"
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
    onError: (err) => {
      const status = isAxiosError(err) ? err.response?.status : undefined
      if (status === 401) setError("Email o contraseña incorrectos")
      // No response, or the dev proxy / hosting reporting the API unreachable.
      else if (status === undefined || [502, 503, 504].includes(status)) setError("No se puede conectar con el servidor. Comprueba que la API está arrancada.")
      else setError(`Error del servidor (${status}). Inténtalo de nuevo.`)
    },
  })

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Panel de marca */}
      <div className="md:w-[44%] bg-pine-900 text-khaki-100 flex flex-col items-center justify-center text-center px-8 py-10 md:py-16">
        <img
          src="/logos/rangers-academy-logo.png"
          alt="Rangers Academy"
          className="w-24 h-24 md:w-36 md:h-36 object-contain"
        />
        <h1 className="font-head text-[28px] md:text-[36px] leading-tight mt-5">Rangers Academy</h1>
        <p className="font-label text-[14px] md:text-[15px] font-semibold uppercase tracking-[0.12em] text-brass-500 mt-3 max-w-xs">
          Official Cambridge Preparation Centre · Pontevedra
        </p>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 md:px-12">
        <div className="w-full max-w-sm">
          <h2 className="font-head text-[28px] leading-tight text-pine-900">Iniciar sesión</h2>
          <p className="text-[15px] text-ink-soft mt-2 mb-7">Accede al Station Desk con tu cuenta.</p>
          {error && (
            <p role="alert" className="text-[15px] text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-[10px] mb-5">{error}</p>
          )}
          <div className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block font-label text-[13px] font-semibold uppercase tracking-[0.1em] text-pine-700 mb-1.5">Email</label>
              <input id="login-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input !min-h-[48px] text-[16px]" />
            </div>
            <div>
              <label htmlFor="login-password" className="block font-label text-[13px] font-semibold uppercase tracking-[0.1em] text-pine-700 mb-1.5">Contraseña</label>
              <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && mutation.mutate()}
                className="input !min-h-[48px] text-[16px]" />
            </div>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
              className="w-full h-12 rounded-[10px] bg-pine-900 text-khaki-100 font-body text-[16px] font-bold hover:bg-pine-800 disabled:opacity-50 transition-colors">
              {mutation.isPending ? "Entrando…" : "Entrar"}
            </button>
            <p className="text-center text-[15px] text-ink-soft">
              ¿No tienes cuenta? <Link to="/register" className="text-brass-700 font-semibold underline">Crear cuenta</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
