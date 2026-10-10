import { api } from "@/lib/axios"
import type { Aviso, AvisoMensaje, EquipoUser } from "@/types"

export const avisosApi = {
  list: (params?: { desde?: string; hasta?: string; para_mi?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.desde) qs.append("desde", params.desde)
    if (params?.hasta) qs.append("hasta", params.hasta)
    if (params?.para_mi) qs.append("para_mi", "1")
    return api.get<Aviso[]>(`/avisos/?${qs}`)
  },
  create: (data: { titulo: string; fecha?: string | null; para?: number | null; para_todos?: boolean }) =>
    api.post<Aviso>("/avisos/", data),
  update: (id: number, data: Partial<{ titulo: string; fecha: string | null; para: number | null; hecha: boolean }>) =>
    api.patch<Aviso>(`/avisos/${id}/`, data),
  delete: (id: number) => api.delete(`/avisos/${id}/`),
  // Conversación de un aviso. Pedir el hilo lo marca como leído para mí.
  mensajes: (id: number) => api.get<AvisoMensaje[]>(`/avisos/${id}/mensajes/`),
  responder: (id: number, texto: string) => api.post<AvisoMensaje>(`/avisos/${id}/mensajes/`, { texto }),
  // Leído por mí, sin resolverlo para los demás.
  leido: (id: number) => api.post(`/avisos/${id}/leido/`),
  // Every login account in this academia (owner + staff) — who a task or
  // note can be addressed to.
  equipo: () => api.get<EquipoUser[]>("/avisos/equipo/"),
}
