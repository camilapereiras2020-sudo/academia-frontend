import { api } from "@/lib/axios"
import type { Tarifa, TarifaMarca } from "@/types"

export const tarifasApi = {
  list: (params?: { marca?: TarifaMarca }) => {
    const qs = new URLSearchParams()
    if (params?.marca) qs.append("marca", params.marca)
    return api.get<Tarifa[]>(`/tarifas/?${qs}`)
  },
  get: (id: number) => api.get<Tarifa>(`/tarifas/${id}/`),
  create: (data: Partial<Tarifa>) => api.post<Tarifa>("/tarifas/", data),
  update: (id: number, data: Partial<Tarifa>) => api.patch<Tarifa>(`/tarifas/${id}/`, data),
  delete: (id: number) => api.delete(`/tarifas/${id}/`),
}
