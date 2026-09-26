import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { authApi } from "../api"

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ academia_nombre: "", email: "", username: "", password: "", password2: "" })
  const [error, setError] = useState("")

  const mutation = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: () => { alert("Cuenta creada. Inicia sesión."); navigate("/login") },
    onError: () => setError("Error al crear la cuenta"),
  })

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center bg-khaki-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm border border-pine-900/10 border-t-4 border-t-pine-900">
        <img src="/logos/rangers-academy-logo.png" alt="Rangers Academy" className="w-16 h-16 object-contain mx-auto mb-3" />
        <h1 className="font-head text-[28px] leading-tight text-center text-pine-900 mb-6">Crear cuenta</h1>
        {error && <p className="text-red-700 text-[15px] mb-4 bg-red-50 border border-red-200 px-4 py-3 rounded-[10px]">{error}</p>}
        <div className="space-y-3">
          {[
            { k: "academia_nombre", label: "Nombre academia", type: "text" },
            { k: "email", label: "Email", type: "email" },
            { k: "username", label: "Usuario", type: "text" },
            { k: "password", label: "Contraseña", type: "password" },
            { k: "password2", label: "Confirmar contraseña", type: "password" },
          ].map(({ k, label, type }) => (
            <div key={k}>
              <label className="block font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">{label}</label>
              <input type={type} value={form[k as keyof typeof form]} onChange={setF(k)}
                className="input" />
            </div>
          ))}
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="w-full h-12 rounded-[10px] bg-pine-900 text-khaki-100 text-[16px] font-bold hover:bg-pine-800 disabled:opacity-50">
            {mutation.isPending ? "Creando cuenta..." : "Crear cuenta"}
          </button>
          <p className="text-center text-[15px] text-ink-soft">
            ¿Ya tienes cuenta? <Link to="/login" className="text-brass-700 font-semibold underline">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
