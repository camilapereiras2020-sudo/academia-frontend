import { DIAS } from "@/features/grupos/palette"
import type { Alumno } from "@/types"

// Grupo.horarios es un JSON libre en el backend: un tramo puede venir sin `fin`,
// con `ini` nulo o con `dia` como texto. Nunca debe romper la pantalla.
const hora = (t: unknown) => (typeof t === "string" ? t.slice(0, 5) : "")

// "Lun 16:00-17:30 · Mié 16:00-17:30" — vacío si no tiene grupos con horario.
export function horarioDe(a: Alumno) {
  return (a.grupos_detalle ?? [])
    .flatMap(g => (Array.isArray(g.horarios) ? g.horarios : []))
    .filter(h => h && typeof h === "object")
    .map(h => {
      const dia = typeof h.dia === "number" ? h.dia : Number.NaN
      const ini = hora(h.ini), fin = hora(h.fin)
      const tramo = ini && fin ? `${ini}-${fin}` : ini || fin
      return { orden: Number.isNaN(dia) ? 99 : dia, txt: [(DIAS[dia] ?? "").slice(0, 3), tramo].filter(Boolean).join(" ") }
    })
    .filter(h => h.txt !== "")
    .sort((x, y) => x.orden - y.orden || x.txt.localeCompare(y.txt))
    .map(h => h.txt)
    .join(" · ")
}
