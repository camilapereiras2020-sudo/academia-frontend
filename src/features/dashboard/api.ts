import { api } from "@/lib/axios"

export interface ReceptionCumpleanos {
  id: number
  nombre: string
  fecha_nacimiento: string
  dias_para_cumpleanos: number
}

export interface ReceptionAlumnoIncompleto {
  id: number
  nombre: string
  telefono: string
  email: string
}

export interface ReceptionSummary {
  cumpleanos: ReceptionCumpleanos[]
  whatsapp_pendientes_count: number
  alumnos_incompletos: ReceptionAlumnoIncompleto[]
}

export const dashboardApi = {
  receptionSummary: () => api.get<ReceptionSummary>("/dashboard/reception-summary/"),
}
