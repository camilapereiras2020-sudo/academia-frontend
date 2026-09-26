import { useAuthStore } from "@/store/authStore"
import NivelesConfigSection from "@/features/niveles/NivelesConfigSection"
import ProfesoresConfigSection from "@/features/profesores/ProfesoresConfigSection"
import EmisoresConfigSection from "@/features/pagos/EmisoresConfigSection"

export default function ConfigPage() {
  const { user } = useAuthStore()

  return (
    <div className="max-w-lg">
      <h1 className="page-title mb-6">Configuración</h1>

      {/* Account info */}
      <div className="card !bg-white p-4 mb-5 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-pine-900 flex items-center justify-center text-khaki-100 font-head text-[16px] flex-shrink-0">
          {user?.email?.[0]?.toUpperCase() ?? "U"}
        </div>
        <div>
          <p className="text-[15px] font-semibold text-ink">{user?.email}</p>
          <p className="text-[14px] text-ink-soft">Cuenta de academia</p>
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
      <div className="mt-6 card !bg-white !border-red-200 p-6">
        <p className="font-label text-[14px] font-semibold uppercase tracking-[0.12em] text-red-700 mb-3">Zona de peligro</p>
        <p className="text-[15px] text-ink-soft mb-4">
          Para cerrar sesión o eliminar la cuenta, contacta con el administrador.
        </p>
        <button
          onClick={() => useAuthStore.getState().logout()}
          className="min-h-[44px] px-4 border border-red-200 text-red-700 rounded-[10px] text-[15px] font-semibold hover:bg-red-50">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
