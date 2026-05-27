import { api } from "@/lib/axios"
import type { Sesion } from "@/types"

export const asistenciaApi = {
  list: (params?: { grupo?: number; mes?: string; alumno?: number }) => {
    const qs = new URLSearchParams()
    if (params?.grupo) qs.append("grupo", String(params.grupo))
    if (params?.mes) qs.append("mes", params.mes)
    if (params?.alumno) qs.append("alumno", String(params.alumno))
    return api.get<Sesion[]>(`/asistencia/?${qs}`)
  },
  get: (id: number) => api.get<Sesion>(`/asistencia/${id}/`),
  create: (data: { grupo: number; fecha: string; hora?: string; notas?: string; registros: { alumno: number; estado: string; nota?: string; es_invitado?: boolean }[] }) =>
    api.post<Sesion>("/asistencia/", data),
  historialAlumno: (alumnoId: number) =>
    api.get(`/asistencia/historial-alumno/?alumno=${alumnoId}`),
}
