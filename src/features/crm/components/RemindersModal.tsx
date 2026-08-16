import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { useAuthStore } from "@/store/authStore"

// Fires once per browser session (not once per page load) so it doesn't
// nag on every navigation, but does reappear on the next real login.
const SESSION_FLAG = "rangers_reminders_shown"

interface ReminderLead {
  id: number
  nombre_alumno: string
  nombre_contacto: string
  etapa_display: string
  dias_sin_contacto: number
  proximo_seguimiento: string | null
  razon: "vencido" | "sin_contacto"
}

function razonLabel(lead: ReminderLead): string {
  if (lead.razon === "vencido") {
    return `Seguimiento vencido (${lead.proximo_seguimiento})`
  }
  return `${lead.dias_sin_contacto} dias sin contacto`
}

export default function RemindersModal() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const [dismissed, setDismissed] = useState(() => !!sessionStorage.getItem(SESSION_FLAG))

  // Reception users can't hit /leads/ at all (NotReception permission) —
  // don't even fire the query for them.
  const enabled = role === "owner" || role === "co_manager"

  const { data } = useQuery({
    queryKey: ["crm", "recordatorios"],
    queryFn: () => api.get("/leads/recordatorios/").then((r) => r.data),
    enabled,
    staleTime: 5 * 60 * 1000,
  })

  const snoozeMut = useMutation({
    mutationFn: (id: number) => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const fecha = tomorrow.toISOString().slice(0, 10)
      return api.patch(`/leads/${id}/`, { proximo_seguimiento: fecha })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm", "recordatorios"] }),
  })

  const leads: ReminderLead[] = data?.leads ?? []
  const shouldShow = enabled && !dismissed && leads.length > 0

  function close() {
    sessionStorage.setItem(SESSION_FLAG, "1")
    setDismissed(true)
  }

  function verLead(id: number) {
    close()
    navigate(`/crm?lead=${id}`)
  }

  if (!shouldShow) return null

  const visible = leads.slice(0, 8)
  const extra = leads.length - visible.length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl max-h-[85vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-1">
          {leads.length} seguimiento{leads.length === 1 ? "" : "s"} pendiente{leads.length === 1 ? "" : "s"}
        </h3>
        <p className="text-pine-700 text-sm mb-4">
          Estos leads necesitan una decision hoy — contactar, posponer, o marcarlos frios.
        </p>
        <div className="flex flex-col gap-2 mb-4">
          {visible.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between gap-3 border border-khaki-200 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">
                  {lead.nombre_alumno}
                  {lead.nombre_contacto ? ` (${lead.nombre_contacto})` : ""}
                </div>
                <div className="text-xs text-red-600">{razonLabel(lead)}</div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => snoozeMut.mutate(lead.id)}
                  disabled={snoozeMut.isPending}
                  className="px-2.5 py-1.5 rounded-md bg-khaki-100 text-pine-700 text-xs hover:bg-khaki-200"
                >
                  +1 dia
                </button>
                <button
                  onClick={() => verLead(lead.id)}
                  className="px-2.5 py-1.5 rounded-md bg-pine-700 text-white text-xs hover:bg-pine-800"
                >
                  Ver
                </button>
              </div>
            </div>
          ))}
          {extra > 0 && (
            <div className="text-xs text-pine-700 text-center pt-1">
              + {extra} mas — abrir CRM para verlos todos
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <button
            onClick={close}
            className="px-4 py-2 rounded-lg bg-khaki-100 text-pine-700 text-sm hover:bg-khaki-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
