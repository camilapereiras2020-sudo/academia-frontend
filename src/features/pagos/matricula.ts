// Matrícula dentro de los extras de un pago (Nuevo pago y "Generar pago" de
// la ficha). El importe es libre — lo pone quien cobra, no sale de la
// tarifa. Un detalle opcional ("3er hermano", "50 %"...) va dentro del
// propio concepto ("Matrícula — 3er hermano") para que se lea en la factura.

export interface ExtraLine { concepto: string; importe: number }

export const MATRICULA_CONCEPTO = "Matrícula"

export const nuevaMatricula = (): ExtraLine => ({ concepto: MATRICULA_CONCEPTO, importe: 0 })

export function esMatricula(ex: ExtraLine) {
  return ex.concepto === MATRICULA_CONCEPTO || ex.concepto.startsWith(`${MATRICULA_CONCEPTO} — `)
}

/** Hay una matrícula añadida sin importe: no se deja guardar el pago así. */
export function matriculaSinImporte(extras: ExtraLine[]) {
  return extras.some(ex => esMatricula(ex) && !(Number(ex.importe) > 0))
}

export function matriculaDetalle(concepto: string) {
  const marker = `${MATRICULA_CONCEPTO} — `
  return concepto.startsWith(marker) ? concepto.slice(marker.length) : ""
}

export function matriculaConcepto(detalle: string) {
  return detalle.trim() ? `${MATRICULA_CONCEPTO} — ${detalle.trim()}` : MATRICULA_CONCEPTO
}
