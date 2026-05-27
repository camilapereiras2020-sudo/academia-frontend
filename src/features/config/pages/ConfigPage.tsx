import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/features/auth/api"

export default function ConfigPage() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({
    academia_nombre: "", academia_nif: "", academia_dir: "", academia_tel: ""
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        academia_nombre: user.academia_nombre || "",
        academia_nif: user.academia_nif || "",
        academia_dir: user.academia_dir || "",
        academia_tel: user.academia_tel || "",
      })
    }
  }, [user])

  const saveMut = useMutation({
    mutationFn: () => authApi.updateProfile(form),
    onSuccess: (res) => {
      setUser(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  function setF(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Configuracion</h1>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre de la academia</label>
          <input type="text" value={form.academia_nombre} onChange={setF("academia_nombre")}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">NIF / CIF</label>
          <input type="text" value={form.academia_nif} onChange={setF("academia_nif")}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Direccion</label>
          <input type="text" value={form.academia_dir} onChange={setF("academia_dir")}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Telefono</label>
          <input type="text" value={form.academia_tel} onChange={setF("academia_tel")}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
          <input type="text" value={user?.email || ""} disabled
            className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400" />
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-green-600 text-sm font-medium">Guardado ✓</span>}
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
            {saveMut.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  )
}
