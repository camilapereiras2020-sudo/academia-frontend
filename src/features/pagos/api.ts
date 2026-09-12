import { api } from "@/lib/axios"
import type { Pago, Marca } from "@/types"

export const pagosApi = {
  list: (params?: { estado?: string; periodo?: string; marca?: Marca; pagador?: number; alumno?: number }) => {
    const qs = new URLSearchParams()
    if (params?.estado) qs.append("estado", params.estado)
    if (params?.periodo) qs.append("periodo", params.periodo)
    if (params?.marca) qs.append("marca", params.marca)
    if (params?.pagador) qs.append("pagador", String(params.pagador))
    if (params?.alumno) qs.append("alumno", String(params.alumno))
    return api.get<Pago[]>(`/pagos/?${qs}`)
  },
  get: (id: number) => api.get<Pago>(`/pagos/${id}/`),
  create: (data: Partial<Pago> & { guardar_como_borrador?: boolean }) => api.post<Pago>("/pagos/", data),
  update: (id: number, data: Partial<Pago>) => api.patch<Pago>(`/pagos/${id}/`, data),
  delete: (id: number) => api.delete(`/pagos/${id}/`),
  marcarPagado: (id: number) => api.post(`/pagos/${id}/marcar-pagado/`),
  sugerencias: () => api.get<SugerenciaRow[]>("/pagos/sugerencias/"),
  // Mid-month bulk generation: one un-invoiced pago per enrolled alumno,
  // priced off their assigned group's tarifa. Safe to re-run for the same
  // periodo — anyone who already has a pago is skipped, not duplicated.
  generarMes: (periodo?: string) =>
    api.post<{ periodo: string; creados: { pago_id: number; alumno: string; total: string }[]; omitidos: { alumno: string; motivo: string }[] }>(
      "/pagos/generar-mes/", periodo ? { periodo } : {}
    ),
  // Unnumbered, watermarked look at what this pago's invoice would print —
  // for reviewing before "Confirmar factura" actually assigns a número.
  // Blob response (needs the auth header, so a plain <a href> won't work —
  // same pattern as DocumentosPage's handleDescargar).
  previewFactura: (id: number) => api.get(`/pagos/${id}/preview-factura/`, { responseType: "blob" }),
}

export interface Sugerencia { id: number; nombre: string; score: number }
export interface SugerenciaRow {
  pago: Pago
  sugerencia_alumno: Sugerencia | null
  sugerencia_pagador: Sugerencia | null
  sugerencia_grupo: { id: number; nombre: string } | null
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
  // One invoice covering several pagos that share a pagador (siblings).
  // emisor_id is required whenever the selected pagos don't already agree
  // on one brand/emisor — see PagadorDetailPage.
  generarCombinado: (pago_ids: number[], emisor_id?: number) =>
    api.post("/documentos/generar-combinado/", { pago_ids, ...(emisor_id ? { emisor_id } : {}) }),
  // Manual send — never automatic. Staff clicks this once a confirmed
  // invoice has been reviewed and is ready to go to the family.
  enviar: (id: number) => api.post<{ ok: boolean }>(`/documentos/${id}/enviar/`),
  delete: (id: number) => api.delete(`/documentos/${id}/`),
}

// One row per brand's issuing/legal entity (Cami&Co, Rangers Academy) — the
// actual source of truth invoice generation reads from, distinct from the
// (unrelated, legacy) single-tenant academia_* fields on the user profile.
export interface Emisor {
  id: number; slug: string
  nombre: string; autonoma: string; nif: string
  direccion: string; ciudad: string; telefono: string; email: string; iban: string
  factura_prefix: string; recibo_prefix: string; activo: boolean
}

export const emisoresApi = {
  list: () => api.get<Emisor[]>("/documentos/emisores/"),
  update: (id: number, data: Partial<Emisor>) => api.patch<Emisor>(`/documentos/emisores/${id}/`, data),
}
