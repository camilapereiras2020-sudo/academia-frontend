import { api } from "@/lib/axios"
import type { RegistroAsistencia, Sesion } from "@/types"

export const asistenciaApi = {
  list: (params?: { grupo?: number; mes?: string; alumno?: number; fecha?: string }) => {
    const qs = new URLSearchParams()
    if (params?.grupo) qs.append("grupo", String(params.grupo))
    if (params?.mes) qs.append("mes", params.mes)
    if (params?.alumno) qs.append("alumno", String(params.alumno))
    if (params?.fecha) qs.append("fecha", params.fecha)
    return api.get<Sesion[]>(`/asistencia/?${qs}`)
  },
  get: (id: number) => api.get<Sesion>(`/asistencia/${id}/`),
  create: (data: { grupo: number; fecha: string; hora?: string; notas?: string; contenido?: string; registros: { alumno: number; estado: string; nota?: string; es_invitado?: boolean }[] }) =>
    api.post<Sesion>("/asistencia/", data),
  marcar: (data: { grupo: number; fecha: string; alumno: number; estado: string; nota?: string }) =>
    api.post<RegistroAsistencia>("/asistencia/marcar/", data),
  historialAlumno: (alumnoId: number) =>
    api.get(`/asistencia/historial-alumno/?alumno=${alumnoId}`),
}
