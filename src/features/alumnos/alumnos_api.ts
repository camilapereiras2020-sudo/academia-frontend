import { api } from "@/lib/axios"
import type { Alumno } from "@/types"

export const alumnosApi = {
  list: (params?: { search?: string; grupo?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.append("search", params.search)
    if (params?.grupo) qs.append("grupo", String(params.grupo))
    return api.get<Alumno[]>(`/alumnos/?${qs}`)
  },
  get: (id: number) => api.get<Alumno>(`/alumnos/${id}/`),
  create: (data: Partial<Alumno>) => api.post<Alumno>("/alumnos/", data),
  update: (id: number, data: Partial<Alumno>) => api.patch<Alumno>(`/alumnos/${id}/`, data),
  delete: (id: number) => api.delete(`/alumnos/${id}/`),
  asignarGrupo: (id: number, grupo_id: number, horarios: object[]) =>
    api.post(`/alumnos/${id}/asignar-grupo/`, { grupo_id, horarios }),
  cumpleanos: (dias?: number) =>
    api.get(`/alumnos/cumpleanos/${dias ? `?dias=${dias}` : ""}`),
}
