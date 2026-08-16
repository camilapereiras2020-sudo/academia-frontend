import { api } from "@/lib/axios"
import type { CategoriaNivel, Nivel } from "@/types"

export const nivelesApi = {
  list: (params?: { categoria?: CategoriaNivel; activo?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.categoria) qs.append("categoria", params.categoria)
    if (params?.activo !== undefined) qs.append("activo", String(params.activo))
    return api.get<Nivel[]>(`/niveles/?${qs}`)
  },
  create: (data: Partial<Nivel>) => api.post<Nivel>("/niveles/", data),
  update: (id: number, data: Partial<Nivel>) => api.patch<Nivel>(`/niveles/${id}/`, data),
  delete: (id: number) => api.delete(`/niveles/${id}/`),
}
