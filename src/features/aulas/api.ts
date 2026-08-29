import { api } from "@/lib/axios"
import type { Aula } from "@/types"

export const aulasApi = {
  list: (params?: { activo?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.activo !== undefined) qs.append("activo", String(params.activo))
    return api.get<Aula[]>(`/grupos/aulas/?${qs}`)
  },
  create: (data: Partial<Aula>) => api.post<Aula>("/grupos/aulas/", data),
  update: (id: number, data: Partial<Aula>) => api.patch<Aula>(`/grupos/aulas/${id}/`, data),
}
