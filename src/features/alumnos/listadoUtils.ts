import { DIAS } from "@/features/grupos/palette"
import type { Alumno } from "@/types"

const hora = (t: string) => t.slice(0, 5)

// "Lun 16:00-17:30 · Mié 16:00-17:30" — vacío si no tiene grupos con horario.
export function horarioDe(a: Alumno) {
  return a.grupos_detalle
    .flatMap(g => g.horarios.map(h => ({ dia: h.dia, txt: `${(DIAS[h.dia] ?? "").slice(0, 3)} ${hora(h.ini)}-${hora(h.fin)}` })))
    .sort((x, y) => x.dia - y.dia || x.txt.localeCompare(y.txt))
    .map(h => h.txt)
    .join(" · ")
}
