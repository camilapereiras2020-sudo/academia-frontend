import { api } from "@/lib/axios"
import type { Pago } from "@/types"

export const pagosApi = {
  list: (params?: { estado?: string; periodo?: string }) => {
    const qs = new URLSearchParams()
    if (params?.estado) qs.append("estado", params.estado)
    if (params?.periodo) qs.append("periodo", params.periodo)
    return api.get<Pago[]>(`/pagos/?${qs}`)
  },
  get: (id: number) => api.get<Pago>(`/pagos/${id}/`),
  create: (data: Partial<Pago>) => api.post<Pago>("/pagos/", data),
  update: (id: number, data: Partial<Pago>) => api.patch<Pago>(`/pagos/${id}/`, data),
  delete: (id: number) => api.delete(`/pagos/${id}/`),
  marcarPagado: (id: number) => api.post(`/pagos/${id}/marcar-pagado/`),
}

export const documentosApi = {
  list: (params?: { pago?: number; tipo?: string }) => {
    const qs = new URLSearchParams()
    if (params?.pago) qs.append("pago", String(params.pago))
    if (params?.tipo) qs.append("tipo", params.tipo)
    return api.get(`/documentos/?${qs}`)
  },
  generar: (pago_id: number, tipo: "factura" | "recibo") =>
    api.post("/documentos/generar/", { pago_id, tipo }),
  delete: (id: number) => api.delete(`/documentos/${id}/`),
}
