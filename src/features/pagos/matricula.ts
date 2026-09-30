// Matrícula dentro de los extras de un pago (Nuevo pago y "Generar pago" de
// la ficha). Precio de tarifa: MATRICULA por alumno. Se indica la cantidad
// (p. ej. 2 hermanos → 40 €) y quien cobra puede cambiar el total; si cobra
// menos, el concepto lleva el % de descuento para que se lea en la factura:
//   "Matrícula"                                    1 × 20 €, sin descuento
//   "Matrícula ×2"                                 40 €
//   "Matrícula ×2 (40 €, 25 % dto.)"               cobrado 30 €
//   "Matrícula (20 €, 100 % dto.) — Beca"          gratis, con detalle
// La cantidad y el detalle se guardan dentro del propio concepto (el pago
// solo guarda concepto + importe por extra) y se leen de ahí al editar.
import { MATRICULA } from "@/features/tarifas/tarifa"

export { MATRICULA }

export interface ExtraLine { concepto: string; importe: number }

export const MATRICULA_CONCEPTO = "Matrícula"

export function esMatricula(ex: ExtraLine) {
  return ex.concepto === MATRICULA_CONCEPTO
    || ex.concepto.startsWith(`${MATRICULA_CONCEPTO} ×`)
    || ex.concepto.startsWith(`${MATRICULA_CONCEPTO} (`)
    || ex.concepto.startsWith(`${MATRICULA_CONCEPTO} — `)
}

export function matriculaCantidad(concepto: string) {
  const m = concepto.match(/^Matrícula ×(\d+)/)
  return m ? Math.max(1, Number(m[1])) : 1
}

export function matriculaDetalle(concepto: string) {
  const i = concepto.indexOf(" — ")
  return i >= 0 ? concepto.slice(i + 3) : ""
}

/** % de descuento sobre precio × cantidad (0 si se cobra entero o más). */
export function matriculaDescuentoPct(importe: number, cantidad: number) {
  const precio = MATRICULA * cantidad
  const cobrado = Math.max(Number(importe) || 0, 0)
  if (cobrado >= precio) return 0
  return Math.round((1 - cobrado / precio) * 100)
}

export function matriculaConcepto(importe: number, cantidad: number, detalle: string) {
  const pct = matriculaDescuentoPct(importe, cantidad)
  let base = cantidad > 1 ? `${MATRICULA_CONCEPTO} ×${cantidad}` : MATRICULA_CONCEPTO
  if (pct > 0) base += ` (${MATRICULA * cantidad} €, ${pct} % dto.)`
  return detalle.trim() ? `${base} — ${detalle.trim()}` : base
}

export const nuevaMatricula = (): ExtraLine => ({ concepto: MATRICULA_CONCEPTO, importe: MATRICULA })
