import { useQuery } from "@tanstack/react-query"
import { profesoresApi } from "./api"

export function ProfesorSelect({ value, onChange, className, disabled }: {
  value: number | null
  onChange: (v: number | null) => void
  className?: string
  disabled?: boolean
}) {
  const { data } = useQuery({
    queryKey: ["profesores", "activos"],
    queryFn: () => profesoresApi.list({ activo: true }),
  })
  const profesores = data?.data ?? []
  // A previously-assigned profesor who's since been deactivated — keep it
  // selectable so the field doesn't silently blank out under the user.
  const currentUnknown = value != null && !profesores.some(p => p.id === value)

  return (
    <select className={className} value={value ?? ""} disabled={disabled}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">— Sin profesor/a —</option>
      {currentUnknown && <option value={value!}>(inactivo)</option>}
      {profesores.map(p => (
        <option key={p.id} value={p.id}>
          {p.codigo ? `${p.codigo} · ` : ""}{p.nombre}{p.es_suplente ? " (suplente)" : ""}
        </option>
      ))}
    </select>
  )
}
