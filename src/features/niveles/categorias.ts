import type { CategoriaNivel } from "@/types"

// Etiquetas y orden de las categorías de nivel (la "edad"), compartidos por
// NivelSelect y el filtro de edad de Grupos.
export const CATEGORIA_LABELS: Record<CategoriaNivel, string> = { kids: "Kids", teens: "Teens", adults: "Adults" }
export const CATEGORIA_ORDEN: CategoriaNivel[] = ["kids", "teens", "adults"]
