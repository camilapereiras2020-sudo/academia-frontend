import { api } from "@/lib/axios"
import type { Pagador } from "@/types"

export const pagadoresApi = {
  list: () => api.get<Pagador[]>("/pagadores/"),
  get: (id: number) => api.get<Pagador>(`/pagadores/${id}/`),
  create: (data: Partial<Pagador>) => api.post<Pagador>("/pagadores/", data),
  update: (id: number, data: Partial<Pagador>) => api.patch<Pagador>(`/pagadores/${id}/`, data),
  delete: (id: number) => api.delete(`/pagadores/${id}/`),
}
