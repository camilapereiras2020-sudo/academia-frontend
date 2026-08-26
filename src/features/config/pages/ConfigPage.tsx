import { useAuthStore } from "@/store/authStore"
import NivelesConfigSection from "@/features/niveles/NivelesConfigSection"
import ProfesoresConfigSection from "@/features/profesores/ProfesoresConfigSection"
import EmisoresConfigSection from "@/features/pagos/EmisoresConfigSection"

export default function ConfigPage() {
  const { user } = useAuthStore()

  return (
    <div className="max-w-lg">
      <h1 className="font-head font-normal text-3xl text-pine-900 mb-6">Configuración</h1>

      {/* Account info */}
      <div className="bg-khaki-100 border rounded-xl p-4 mb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brass-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {user?.email?.[0]?.toUpperCase() ?? "U"}
        </div>
        <div>
          <p className="font-semibold text-pine-900 text-sm">{user?.email}</p>
          <p className="text-xs text-pine-700">Cuenta de academia</p>
        </div>
      </div>

      {/* Billing/legal data — one section per brand (Cami&Co, Rangers
          Academy), since they're two separate fiscal identities. This
          replaced the old single "Datos de la academia" fields, which were
          never actually read by invoice generation. */}
      <EmisoresConfigSection />

      <NivelesConfigSection />

      <ProfesoresConfigSection />

      {/* Danger zone */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-red-100 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">Zona de peligro</p>
        <p className="text-sm text-pine-700 mb-4">
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
