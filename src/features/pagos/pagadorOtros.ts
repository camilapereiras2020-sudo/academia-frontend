// Pagador "Otros": alumnos sin datos del pagador que pagan en mano. El pago
// se guarda sin pagador y el motivo (opcional) va en una línea marcada de
// las notas del pago, para no necesitar un campo nuevo en la base de datos.

export const OTROS = "otros" as const
const MARCA = "Pagador: Otros (sin datos)"

/** Lee de las notas si el pago se marcó como "Otros" y con qué motivo. */
export function leerOtros(notas: string | null | undefined) {
  const linea = (notas ?? "").split("\n").find(l => l.startsWith(MARCA))
  if (!linea) return { activo: false, motivo: "" }
  return { activo: true, motivo: linea.slice(MARCA.length).replace(/^\s*—\s*/, "").trim() }
}

/** Notas sin la línea de "Otros" (lo que se muestra para editar). */
export function notasSinOtros(notas: string | null | undefined) {
  return (notas ?? "").split("\n").filter(l => !l.startsWith(MARCA)).join("\n").trim()
}

/** Notas a guardar: las del usuario + la línea de "Otros" si aplica. */
export function notasConOtros(notas: string, activo: boolean, motivo: string) {
  const base = notasSinOtros(notas)
  if (!activo) return base
  const linea = motivo.trim() ? `${MARCA} — ${motivo.trim()}` : MARCA
  return base ? `${linea}\n${base}` : linea
}
