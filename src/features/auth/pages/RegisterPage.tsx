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
    onSuccess: () => { alert("Cuenta creada. Inicia sesion."); navigate("/login") },
    onError: () => setError("Error al crear la cuenta"),
  })

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">Crear cuenta</h1>
        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}
        <div className="space-y-3">
          {[
            { k: "academia_nombre", label: "Nombre academia", type: "text" },
            { k: "email", label: "Email", type: "email" },
            { k: "username", label: "Usuario", type: "text" },
            { k: "password", label: "Contrasena", type: "password" },
            { k: "password2", label: "Confirmar contrasena", type: "password" },
          ].map(({ k, label, type }) => (
            <div key={k}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700 mb-1">{label}</label>
              <input type={type} value={form[k as keyof typeof form]} onChange={setF(k)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {mutation.isPending ? "Creando cuenta..." : "Crear cuenta"}
          </button>
          <p className="text-center text-sm text-slate-700">
            Ya tienes cuenta? <Link to="/login" className="text-blue-600 underline">Iniciar sesion</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
