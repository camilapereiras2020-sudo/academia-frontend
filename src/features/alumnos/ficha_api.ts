import { api } from "@/lib/axios"
import type {
  AlumnoResumen, FechaImportante, TipoFechaImportante,
  NotaAlumno, TipoNotaAlumno, DatoSalud, ConsentimientoAlumno, TipoConsentimiento,
} from "@/types"

export const resumenApi = {
  get: (alumnoId: number) => api.get<AlumnoResumen>(`/alumnos/${alumnoId}/resumen/`),
}

export const fechasImportantesApi = {
  list: (alumnoId: number) =>
    api.get<FechaImportante[]>(`/alumnos/fechas-importantes/?alumno=${alumnoId}`),
  create: (data: { alumno: number; fecha: string; tipo: TipoFechaImportante; descripcion?: string }) =>
    api.post<FechaImportante>("/alumnos/fechas-importantes/", data),
}

export const notasAlumnoApi = {
  list: (alumnoId: number) =>
    api.get<NotaAlumno[]>(`/alumnos/notas/?alumno=${alumnoId}`),
  create: (data: { alumno: number; contenido: string; tipo: TipoNotaAlumno }) =>
    api.post<NotaAlumno>("/alumnos/notas/", data),
}

export const datoSaludApi = {
  get: (alumnoId: number) => api.get<DatoSalud>(`/alumnos/${alumnoId}/salud/`),
  update: (alumnoId: number, data: Partial<Pick<DatoSalud, "alergias" | "condiciones_medicas" | "medicacion">>) =>
    api.put<DatoSalud>(`/alumnos/${alumnoId}/salud/`, data),
}

export const consentimientosApi = {
  list: (alumnoId: number) =>
    api.get<ConsentimientoAlumno[]>(`/alumnos/consentimientos/?alumno=${alumnoId}`),
  create: (data: { alumno: number; tipo: TipoConsentimiento; firmado?: boolean; fecha_firma?: string | null; documento_url?: string }) =>
    api.post<ConsentimientoAlumno>("/alumnos/consentimientos/", data),
  update: (id: number, data: Partial<Pick<ConsentimientoAlumno, "firmado" | "fecha_firma" | "documento_url">>) =>
    api.patch<ConsentimientoAlumno>(`/alumnos/consentimientos/${id}/`, data),
}
