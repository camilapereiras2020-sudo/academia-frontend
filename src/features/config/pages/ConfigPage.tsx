import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/features/auth/api"

export default function ConfigPage() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({
    academia_nombre: "", academia_nif: "", academia_dir: "", academia_tel: "",
  })
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle")

  useEffect(() => {
    if (user) {
      setForm({
        academia_nombre: user.academia_nombre ?? "",
        academia_nif:    user.academia_nif    ?? "",
        academia_dir:    user.academia_dir    ?? "",
        academia_tel:    user.academia_tel    ?? "",
      })
    }
  }, [user])

  const saveMut = useMutation({
    mutationFn: () => authApi.updateProfile(form),
    onSuccess: (res) => {
      setUser(res.data)
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 3000)
    },
    onError: () => { setSaveState("error"); setTimeout(() => setSaveState("idle"), 4000) },
  })

  const field = (key: keyof typeof form, label: string, placeholder = "") => (
    <div key={key}>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input
        type="text"
        value={form[key]}
        placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )

  return (
    <div className="max-w-lg">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Configuración</h1>

      {/* Account info */}
      <div className="bg-slate-50 border rounded-xl p-4 mb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {user?.email?.[0]?.toUpperCase() ?? "U"}
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">{user?.email}</p>
          <p className="text-xs text-slate-700">Cuenta de academia</p>
        </div>
      </div>

      {/* Academy settings */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Datos de la academia</p>

        {field("academia_nombre", "Nombre de la academia", "Mi Academia de Inglés")}
        {field("academia_nif",    "NIF / CIF",             "B12345678")}
        {field("academia_dir",    "Dirección",             "C/ Mayor 1, Madrid")}
        {field("academia_tel",    "Teléfono",              "912 345 678")}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email (no editable)</label>
          <input
            type="text"
            value={user?.email ?? ""}
            disabled
            className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600 cursor-not-allowed"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          {saveState === "saved" && (
            <span className="text-green-600 text-sm font-medium">✓ Guardado</span>
          )}
          {saveState === "error" && (
            <span className="text-red-600 text-sm">Error al guardar.</span>
          )}
          <button
            onClick={() => { setSaveState("idle"); saveMut.mutate() }}
            disabled={saveMut.isPending}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
            {saveMut.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-red-100 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">Zona de peligro</p>
        <p className="text-sm text-slate-700 mb-4">
          Para cerrar sesión o eliminar la cuenta, contacta con el administrador.
        </p>
        <button
          onClick={() => useAuthStore.getState().logout()}
          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
