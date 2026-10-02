// "Todo el equipo": un aviso así se guarda como una copia por compañera
// (cada una lo ve en su campanita y lo marca como leído por su cuenta).
// En el calendario esas copias se muestran juntas en una sola fila.
import type { Aviso } from "@/types"

export interface TareaAgrupada extends Aviso {
  /** Ids de todas las copias (1 si es un aviso normal). */
  ids: number[]
  paraTodos: boolean
}

const minuto = (iso: string) => iso.slice(0, 16)

export function agruparAvisos(avisos: Aviso[]): TareaAgrupada[] {
  const grupos = new Map<string, Aviso[]>()
  for (const a of avisos) {
    const clave = a.para == null
      ? `solo-${a.id}`
      : `${a.creado_por}|${a.fecha}|${a.titulo}|${minuto(a.created_at)}`
    grupos.set(clave, [...(grupos.get(clave) ?? []), a])
  }
  return Array.from(grupos.values()).map(copias => ({
    ...copias[0],
    ids: copias.map(c => c.id),
    paraTodos: copias.length > 1,
    hecha: copias.every(c => c.hecha),
  }))
}

/** Copias que este usuario puede cambiar: todas si lo creó, si no solo la suya. */
export function idsEditables(t: TareaAgrupada, avisos: Aviso[], myId: number | undefined) {
  if (t.creado_por === myId) return t.ids
  return avisos.filter(a => t.ids.includes(a.id) && a.para === myId).map(a => a.id)
}
