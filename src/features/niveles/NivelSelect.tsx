import { useQuery } from "@tanstack/react-query"
import { nivelesApi } from "./api"
import type { CategoriaNivel } from "@/types"

const CATEGORIA_LABELS: Record<CategoriaNivel, string> = { kids: "Kids", teens: "Teens", adults: "Adults" }
const CATEGORIA_ORDEN: CategoriaNivel[] = ["kids", "teens", "adults"]

export function NivelSelect({ value, onChange, className, disabled }: {
  value: string
  onChange: (v: string) => void
  className?: string
  disabled?: boolean
}) {
  const { data } = useQuery({
    queryKey: ["niveles", "activos"],
    queryFn: () => nivelesApi.list({ activo: true }),
  })
  const niveles = data?.data ?? []
  // A previously-set value whose Nivel was renamed/deactivated since — keep it
  // selectable so the field doesn't silently blank out under the user.
  const currentUnknown = value && !niveles.some(n => n.nombre === value)

  return (
    <select className={className} value={value} disabled={disabled}
      onChange={e => onChange(e.target.value)}>
      <option value="">— Sin nivel —</option>
      {currentUnknown && <option value={value}>{value}</option>}
      {CATEGORIA_ORDEN.map(cat => {
        const items = niveles.filter(n => n.categoria === cat)
        if (!items.length) return null
        return (
          <optgroup key={cat} label={CATEGORIA_LABELS[cat]}>
            {items.map(n => <option key={n.id} value={n.nombre}>{n.nombre}</option>)}
          </optgroup>
        )
      })}
    </select>
  )
}
