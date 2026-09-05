import { api } from "@/lib/axios"
import type { Pagador, PagadorCalculo } from "@/types"

export const pagadoresApi = {
  list: () => api.get<Pagador[]>("/pagadores/"),
  get: (id: number) => api.get<Pagador>(`/pagadores/${id}/`),
  create: (data: Partial<Pagador>) => api.post<Pagador>("/pagadores/", data),
  update: (id: number, data: Partial<Pagador>) => api.patch<Pagador>(`/pagadores/${id}/`, data),
  delete: (id: number) => api.delete(`/pagadores/${id}/`),
  enviarEmail: (id: number, asunto: string, cuerpo: string) =>
    api.post<{ ok: boolean; id: string }>(`/pagadores/${id}/enviar-email/`, { asunto, cuerpo }),
  // Cuánto le toca pagar a cada pagador este mes, según la guía de precios —
  // disponible para todos los roles (incluida recepción), a diferencia del
  // resto de este endpoint.
  calculadora: () => api.get<PagadorCalculo[]>("/pagadores/calculadora/"),
}
