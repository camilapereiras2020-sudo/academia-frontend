import { api } from "@/lib/axios"
import type { Grupo } from "@/types"

export const gruposApi = {
  list: () => api.get<Grupo[]>("/grupos/"),
  get: (id: number) => api.get<Grupo>(`/grupos/${id}/`),
  create: (data: Partial<Grupo>) => api.post<Grupo>("/grupos/", data),
  update: (id: number, data: Partial<Grupo>) => api.patch<Grupo>(`/grupos/${id}/`, data),
  delete: (id: number) => api.delete(`/grupos/${id}/`),
}