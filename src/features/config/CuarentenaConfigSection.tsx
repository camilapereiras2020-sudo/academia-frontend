import { useMutation } from "@tanstack/react-query"
import { authApi } from "@/features/auth/api"
import { useAuthStore } from "@/store/authStore"

// Interruptor del "Modo cuarentena" de facturación (por academia). Mientras
// está activo, todo documento nuevo nace sin número ("Provisional"), sin envío
// y sin Drive, hasta que alguien lo acepta y confirma en Documentos.
export default function CuarentenaConfigSection() {
  const { user, setUser } = useAuthStore()
  const activo = !!user?.modo_cuarentena
  const puedeCambiar = user?.role !== "reception"

  const mut = useMutation({
    mutationFn: (value: boolean) => authApi.updateProfile({ modo_cuarentena: value }),
    onSuccess: (res) => setUser(res.data),
  })

  return (
    <div className="card !bg-white p-5 mb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-label text-[14px] font-semibold uppercase tracking-[0.12em] text-pine-700 mb-1">
            Modo cuarentena
          </p>
          <p className="text-[15px] text-ink">
            {activo
              ? "Activo: los documentos nuevos quedan en cuarentena, sin número, hasta que los aceptes y confirmes en Documentos."
              : "Apagado: los documentos se emiten con su número al generarlos, como siempre."}
          </p>
          <p className="text-[14px] text-ink-soft mt-1">
            Los documentos ya emitidos no se ven afectados.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          aria-label="Modo cuarentena"
          disabled={!puedeCambiar || mut.isPending}
          onClick={() => mut.mutate(!activo)}
          className={`relative flex-shrink-0 w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${
            activo ? "bg-brass-500" : "bg-pine-900/25"
          }`}>
          <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
            activo ? "translate-x-6" : ""
          }`} />
        </button>
      </div>
      {!puedeCambiar && (
        <p className="text-[14px] text-ink-soft mt-3">Solo el administrador puede cambiar este ajuste.</p>
      )}
      {mut.isError && (
        <p className="text-red-700 text-[14px] mt-3">No se pudo cambiar el modo cuarentena.</p>
      )}
    </div>
  )
}
