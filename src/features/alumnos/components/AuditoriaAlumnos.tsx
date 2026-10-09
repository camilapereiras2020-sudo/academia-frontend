import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Check, X } from "lucide-react"
import { alumnosApi } from "../alumnos_api"
import { gruposApi } from "@/features/grupos/api"
import { pagadoresApi } from "@/features/pagadores/api"
import { horarioDe } from "../listadoUtils"

// Auditoría de datos: qué le falta a cada alumno (salud queda fuera a
// propósito). Para un menor, NIF/dirección/teléfono/email se miran en su
// pagador (es a quien se factura); para un adulto que paga él mismo, en el
// propio alumno. La dirección no existe en el alumno, así que para un adulto
// sin pagador no aplica ("·") y no cuenta como falta.

const CAMPOS = [
  { key: "pagador", label: "Pagador" },
  { key: "telefono", label: "Teléfono" },
  { key: "email", label: "Email" },
  { key: "direccion", label: "Dirección" },
  { key: "dni", label: "DNI/NIF" },
  { key: "fnac", label: "Nacimiento" },
  { key: "horario", label: "Horario" },
  { key: "cuota", label: "Cuota" },
  { key: "profe", label: "Profe" },
] as const
type Campo = typeof CAMPOS[number]["key"]
type Estado = boolean | null // true = ok, false = falta, null = no aplica

const lleno = (s?: string | null) => !!s && s.trim() !== ""

export default function AuditoriaAlumnos() {
  const navigate = useNavigate()
  const [conBajas, setConBajas] = useState(false)
  const [falta, setFalta] = useState<"" | "ok" | Campo>("")

  const { data: alumnos, isLoading } = useQuery({
    queryKey: ["alumnos", "listado"],
    queryFn: () => alumnosApi.list().then(r => r.data),
  })
  const { data: grupos } = useQuery({ queryKey: ["grupos"], queryFn: () => gruposApi.list().then(r => r.data) })
  const { data: pagadores } = useQuery({ queryKey: ["pagadores"], queryFn: () => pagadoresApi.list().then(r => r.data) })
  const { data: calculo } = useQuery({
    queryKey: ["pagadores", "calculadora"],
    queryFn: () => pagadoresApi.calculadora().then(r => r.data),
  })

  const filas = useMemo(() => {
    const profDeGrupo = new Map((grupos ?? []).map(g => [g.id, g.profesor_nombre ?? ""]))
    const pagDe = new Map((pagadores ?? []).map(p => [p.id, p]))
    const calcDe = new Map((Array.isArray(calculo) ? calculo : []).map(c => [c.pagador_id, c]))
    return (alumnos ?? [])
      .filter(a => conBajas || a.activo)
      .map(a => {
        const p = a.pagador ? pagDe.get(a.pagador) : undefined
        const sinPagadorAdulto = !a.pagador && a.es_adulto
        const item = a.pagador ? calcDe.get(a.pagador)?.items?.find(i => i.alumno === a.nombre) : undefined
        const e: Record<Campo, Estado> = {
          pagador: !!a.pagador || a.es_adulto,
          telefono: lleno(a.telefono) || lleno(p?.telefono),
          email: lleno(a.email) || lleno(p?.email),
          direccion: p ? lleno(p.direccion) : sinPagadorAdulto ? null : false,
          dni: p ? lleno(p.nif) : sinPagadorAdulto ? lleno(a.dni) : false,
          fnac: lleno(a.fnac),
          horario: horarioDe(a) !== "",
          cuota: item?.cuota != null || a.cuota_manual != null,
          profe: a.grupos_detalle.some(g => lleno(profDeGrupo.get(g.grupo))),
        }
        const faltan = CAMPOS.filter(c => e[c.key] === false).map(c => c.key)
        return { id: a.id, nombre: a.nombre, e, faltan }
      })
      .sort((x, y) => x.nombre.localeCompare(y.nombre, "es", { sensitivity: "base" }))
  }, [alumnos, grupos, pagadores, calculo, conBajas])

  const completos = filas.filter(f => !f.faltan.length).length
  const visibles = filas.filter(f => !falta ? true : falta === "ok" ? !f.faltan.length : f.faltan.includes(falta))
  const cargando = isLoading || !grupos || !pagadores || !calculo

  return (
    <div>
      <p className="text-[15px] text-ink mb-3">
        <strong>{completos}</strong> de {filas.length} alumnos con todo completo
        {" · "}<strong>{filas.length - completos}</strong> con datos por completar
      </p>

      <div className="flex gap-2 flex-wrap items-center mb-4">
        {([["", `Todos (${filas.length})`], ["ok", `Todo OK (${completos})`],
          ...CAMPOS.map(c => [c.key, `Falta ${c.label} (${filas.filter(f => f.faltan.includes(c.key)).length})`] as const),
        ] as const).map(([v, label]) => (
          <button key={v} onClick={() => setFalta(v as typeof falta)}
            className={`min-h-[40px] px-4 rounded-full font-label text-[14px] font-semibold border transition-colors ${
              falta === v
                ? v === "ok" ? "bg-pine-700 text-white border-pine-700" : "bg-pine-900 text-khaki-100 border-pine-900"
                : "bg-white text-pine-700 border-pine-900/20 hover:bg-khaki-100"
            }`}>
            {label}
          </button>
        ))}
        <label className="inline-flex items-center gap-2 text-[15px] text-ink ml-2">
          <input type="checkbox" checked={conBajas} onChange={e => setConBajas(e.target.checked)} />
          Incluir bajas
        </label>
      </div>

      <div className="card !bg-white overflow-x-auto">
        <table className="data-table">
          <thead className="bg-khaki-100 border-b">
            <tr>
              <th>Alumno</th>
              {CAMPOS.map(c => <th key={c.key} className="text-center">{c.label}</th>)}
              <th className="text-center">Todo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-khaki-100">
            {cargando && <tr><td colSpan={CAMPOS.length + 2} className="!text-ink-soft">Cargando…</td></tr>}
            {!cargando && !visibles.length && <tr><td colSpan={CAMPOS.length + 2} className="!text-ink-soft">Ningún alumno en este grupo.</td></tr>}
            {!cargando && visibles.map(f => (
              <tr key={f.id} className="hover:bg-khaki-100 cursor-pointer" onClick={() => navigate(`/alumnos/${f.id}`)}>
                <td className="font-semibold">{f.nombre}</td>
                {CAMPOS.map(c => (
                  <td key={c.key} className="text-center">
                    {f.e[c.key] === null
                      ? <span className="text-ink-soft" title="No aplica">·</span>
                      : f.e[c.key]
                        ? <Check size={18} strokeWidth={2.5} className="inline text-pine-700" aria-label={`${c.label}: ok`} />
                        : <X size={18} strokeWidth={2.5} className="inline text-red-700" aria-label={`Falta ${c.label}`} />}
                  </td>
                ))}
                <td className="text-center">
                  {!f.faltan.length
                    ? <Check size={20} strokeWidth={3} className="inline text-pine-700" aria-label="Todo completo" />
                    : <span className="text-[13px] text-red-700 font-semibold">{f.faltan.length}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-ink-soft mt-3">
        No incluye datos de salud. Menores: NIF, dirección, teléfono y email se miran en el pagador. «·» = no aplica.
      </p>
    </div>
  )
}
