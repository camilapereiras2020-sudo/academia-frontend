export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

// Same-level parallel sections (ej. "Mountain Rangers" dado por Cande los
// martes Y los jueves, con alumnos distintos en cada uno) end up with the
// exact same Grupo.nombre — nothing enforces uniqueness, and Cami/Cande have
// no way to tell them apart when picking one to edit/asignar. If the name
// being typed already matches an existing grupo (case/whitespace-insensitive,
// excluding the one being edited), append its day+start-time so the name
// itself disambiguates it — same idea as a school doing "4ºA" vs "4ºB", but
// automatic instead of asking Cami to remember to do it by hand.
export function suggestUniqueGrupoName(
  nombre: string,
  existing: { id?: number; nombre: string }[],
  dia?: number | null,
  horaIni?: string,
  excludeId?: number
): string {
  const trimmed = nombre.trim()
  if (!trimmed) return trimmed
  const clash = existing.some(
    g => g.id !== excludeId && g.nombre.trim().toLowerCase() === trimmed.toLowerCase()
  )
  if (!clash) return trimmed
  if (dia == null || !horaIni) return trimmed // no day/time yet to disambiguate with
  return `${trimmed} (${DIAS[dia]?.slice(0, 3)} ${horaIni})`
}

export const PALETTE = [
  { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd", accent: "#3b82f6" },
  { bg: "#dcfce7", text: "#15803d", border: "#86efac", accent: "#22c55e" },
  { bg: "#fef9c3", text: "#a16207", border: "#fde047", accent: "#eab308" },
  { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4", accent: "#ec4899" },
  { bg: "#ede9fe", text: "#6d28d9", border: "#c4b5fd", accent: "#8b5cf6" },
  { bg: "#ffedd5", text: "#c2410c", border: "#fdba74", accent: "#f97316" },
  { bg: "#cffafe", text: "#0e7490", border: "#67e8f9", accent: "#06b6d4" },
  { bg: "#f0fdf4", text: "#166534", border: "#4ade80", accent: "#16a34a" },
]
