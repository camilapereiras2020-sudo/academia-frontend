import { api } from "@/lib/axios"
import type { Tarea, NotaDificultad } from "@/types"

export const tareasApi = {
  list: (params?: { grupo?: number; alumno?: number }) => {
    const qs = new URLSearchParams()
    if (params?.grupo) qs.append("grupo", String(params.grupo))
    if (params?.alumno) qs.append("alumno", String(params.alumno))
    return api.get<Tarea[]>(`/clases/tareas/?${qs}`)
  },
  create: (data: {
    grupo: number; sesion?: number | null; titulo: string; descripcion?: string
    fecha_asignada: string; fecha_entrega: string
    completados: { alumno: number; estado?: string; nota?: string }[]
  }) => api.post<Tarea>("/clases/tareas/", data),
  update: (id: number, data: Partial<Tarea>) => api.patch<Tarea>(`/clases/tareas/${id}/`, data),
  delete: (id: number) => api.delete(`/clases/tareas/${id}/`),
  historialAlumno: (alumnoId: number) =>
    api.get(`/clases/tareas/historial-alumno/?alumno=${alumnoId}`),
}

export const notasDificultadApi = {
  list: (params?: { grupo?: number; alumno?: number }) => {
    const qs = new URLSearchParams()
    if (params?.grupo) qs.append("grupo", String(params.grupo))
    if (params?.alumno) qs.append("alumno", String(params.alumno))
    return api.get<NotaDificultad[]>(`/clases/notas-dificultad/?${qs}`)
  },
  create: (data: Partial<NotaDificultad>) => api.post<NotaDificultad>("/clases/notas-dificultad/", data),
  update: (id: number, data: Partial<NotaDificultad>) => api.patch<NotaDificultad>(`/clases/notas-dificultad/${id}/`, data),
  delete: (id: number) => api.delete(`/clases/notas-dificultad/${id}/`),
  historialAlumno: (alumnoId: number) =>
    api.get(`/clases/notas-dificultad/historial-alumno/?alumno=${alumnoId}`),
}
