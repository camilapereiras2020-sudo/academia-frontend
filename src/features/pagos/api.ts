import { api } from "@/lib/axios"
import type { Pago, Marca } from "@/types"

export const pagosApi = {
  list: (params?: { estado?: string; periodo?: string; marca?: Marca }) => {
    const qs = new URLSearchParams()
    if (params?.estado) qs.append("estado", params.estado)
    if (params?.periodo) qs.append("periodo", params.periodo)
    if (params?.marca) qs.append("marca", params.marca)
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
  // tipo is decided server-side from pago.metodo (factura/recibo/recibo_efectivo)
  // — the client used to guess it and could get it wrong (e.g. bizum).
  generar: (pago_id: number) =>
    api.post("/documentos/generar/", { pago_id }),
  delete: (id: number) => api.delete(`/documentos/${id}/`),
}
