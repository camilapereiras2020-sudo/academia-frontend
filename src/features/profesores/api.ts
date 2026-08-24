import { api } from "@/lib/axios"
import type { Profesor } from "@/types"

export const profesoresApi = {
  list: (params?: { activo?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.activo !== undefined) qs.append("activo", String(params.activo))
    return api.get<Profesor[]>(`/profesores/?${qs}`)
  },
  create: (data: Partial<Profesor>) => api.post<Profesor>("/profesores/", data),
  update: (id: number, data: Partial<Profesor>) => api.patch<Profesor>(`/profesores/${id}/`, data),
  delete: (id: number) => api.delete(`/profesores/${id}/`),
}
