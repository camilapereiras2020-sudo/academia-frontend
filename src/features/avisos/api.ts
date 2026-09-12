import { api } from "@/lib/axios"
import type { Aviso, EquipoUser } from "@/types"

export const avisosApi = {
  list: (params?: { desde?: string; hasta?: string; para_mi?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.desde) qs.append("desde", params.desde)
    if (params?.hasta) qs.append("hasta", params.hasta)
    if (params?.para_mi) qs.append("para_mi", "1")
    return api.get<Aviso[]>(`/avisos/?${qs}`)
  },
  create: (data: { titulo: string; fecha?: string | null; para?: number | null }) =>
    api.post<Aviso>("/avisos/", data),
  update: (id: number, data: Partial<{ titulo: string; fecha: string | null; para: number | null; hecha: boolean }>) =>
    api.patch<Aviso>(`/avisos/${id}/`, data),
  delete: (id: number) => api.delete(`/avisos/${id}/`),
  // Every login account in this academia (owner + staff) — who a task or
  // note can be addressed to.
  equipo: () => api.get<EquipoUser[]>("/avisos/equipo/"),
}
