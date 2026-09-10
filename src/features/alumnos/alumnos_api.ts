import { api } from "@/lib/axios"
import type { Alumno, Marca } from "@/types"

export const alumnosApi = {
  list: (params?: { search?: string; grupo?: number; marca?: Marca; pagador?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.append("search", params.search)
    if (params?.grupo) qs.append("grupo", String(params.grupo))
    if (params?.marca) qs.append("marca", params.marca)
    if (params?.pagador) qs.append("pagador", String(params.pagador))
    return api.get<Alumno[]>(`/alumnos/?${qs}`)
  },
  get: (id: number) => api.get<Alumno>(`/alumnos/${id}/`),
  subirFoto: (id: number, file: File) => {
    const formData = new FormData()
    formData.append("foto", file)
    return api.post<Alumno>(`/alumnos/${id}/foto/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  },
  create: (data: Partial<Alumno>) => api.post<Alumno>("/alumnos/", data),
  update: (id: number, data: Partial<Alumno>) => api.patch<Alumno>(`/alumnos/${id}/`, data),
  delete: (id: number) => api.delete(`/alumnos/${id}/`),
  cumpleanos: (dias?: number) =>
    api.get(`/alumnos/cumpleanos/${dias ? `?dias=${dias}` : ""}`),
  enviarEmail: (id: number, asunto: string, cuerpo: string) =>
    api.post<{ ok: boolean; id: string }>(`/alumnos/${id}/enviar-email/`, { asunto, cuerpo }),
  // A student can be enrolled in more than one class at once — these two are
  // additive/subtractive single-membership ops (not a replace-all PATCH), so
  // the Horario builder can assign/unassign one class without touching the
  // student's other classes.
  agregarGrupo: (id: number, grupoId: number, horario?: { hora_inicio: string | null; hora_fin: string | null }) =>
    api.post<Alumno>(`/alumnos/${id}/agregar-grupo/`, { grupo_id: grupoId, ...horario }),
  quitarGrupo: (id: number, grupoId: number) =>
    api.post<Alumno>(`/alumnos/${id}/quitar-grupo/`, { grupo_id: grupoId }),
  // Sets/resets one membership's personal window within the class (a
  // student who doesn't stay the full session) — pass nulls for both to
  // reset back to the class's own full schedule.
  horarioPersonal: (id: number, grupoId: number, hora_inicio: string | null, hora_fin: string | null) =>
    api.post<Alumno>(`/alumnos/${id}/horario-personal/`, { grupo_id: grupoId, hora_inicio, hora_fin }),
}
