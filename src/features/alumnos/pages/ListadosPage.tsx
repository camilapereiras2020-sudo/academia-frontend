import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Download, Printer } from "lucide-react"
import { alumnosApi } from "../alumnos_api"
import { gruposApi } from "@/features/grupos/api"
import type { Alumno } from "@/types"

// Listado de alumnos en orden alfabético con edad y pagador, para toda la
// academia o solo los de una profesora (por los grupos en los que está).
// Se imprime o se descarga como CSV para Excel.

type Fila = { nombre: string; edad: number | null; pagador: string }

function edad(fnac: string | null) {
  if (!fnac) return null
  const [y, m, d] = fnac.split("-").map(Number)
  const hoy = new Date()
  let e = hoy.getFullYear() - y
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) e--
  return e
}

function pagadorDe(a: Alumno) {
  if (a.pagador_nombre) return a.pagador_nombre
  return a.es_adulto ? "Paga el alumno" : "—"
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!))

export default function ListadosPage() {
  const [profesor, setProfesor] = useState<string>("")
  const [conBajas, setConBajas] = useState(false)

  const { data: alumnos, isLoading } = useQuery({
    queryKey: ["alumnos", "listado"],
    queryFn: () => alumnosApi.list().then(r => r.data),
  })
  const { data: grupos } = useQuery({
    queryKey: ["grupos"],
    queryFn: () => gruposApi.list().then(r => r.data),
  })

  const profesores = useMemo(() => {
    const set = new Set((grupos ?? []).map(g => g.profesor_nombre).filter((n): n is string => !!n))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"))
  }, [grupos])

  const filas: Fila[] = useMemo(() => {
    const profDeGrupo = new Map((grupos ?? []).map(g => [g.id, g.profesor_nombre ?? ""]))
    return (alumnos ?? [])
      .filter(a => conBajas || a.activo)
      .filter(a => !profesor || a.grupos_detalle.some(g => profDeGrupo.get(g.grupo) === profesor))
      .map(a => ({ nombre: a.nombre, edad: edad(a.fnac), pagador: pagadorDe(a) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }))
  }, [alumnos, grupos, profesor, conBajas])

  const titulo = profesor ? `Alumnos de ${profesor}` : "Alumnos de la academia"

  function descargarCsv() {
    const lineas = [["Alumno", "Edad", "Pagador"], ...filas.map(f => [f.nombre, f.edad ?? "", f.pagador])]
      .map(cols => cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    // BOM para que Excel lea bien los acentos; ";" es el separador de Excel en español.
    const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${titulo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function imprimir() {
    const w = window.open("", "_blank")
    if (!w) return
    const fecha = new Date().toLocaleDateString("es-ES")
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; color: #1f2a22 }
  h1 { font-size: 20px; margin: 0 0 4px } p { margin: 0 0 16px; color: #555; font-size: 13px }
  table { width: 100%; border-collapse: collapse; font-size: 13px }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd }
  th { background: #f1ece0 } td.n { color: #888; width: 32px } td.e { width: 60px }
</style></head><body>
<h1>${esc(titulo)}</h1><p>${filas.length} alumnos · ${fecha}</p>
<table><thead><tr><th></th><th>Alumno</th><th>Edad</th><th>Pagador</th></tr></thead><tbody>
${filas.map((f, i) => `<tr><td class="n">${i + 1}</td><td>${esc(f.nombre)}</td><td class="e">${f.edad ?? "—"}</td><td>${esc(f.pagador)}</td></tr>`).join("")}
</tbody></table></body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Listados</h1>
          <p className="page-subtitle">{titulo} · {filas.length} alumnos</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={imprimir} disabled={!filas.length} className="btn-ghost inline-flex items-center gap-2">
            <Printer size={16} /> Imprimir
          </button>
          <button type="button" onClick={descargarCsv} disabled={!filas.length} className="btn-primary inline-flex items-center gap-2">
            <Download size={16} /> Excel (CSV)
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div>
          <label htmlFor="listado-profesor" className="block font-label text-[12px] font-semibold uppercase tracking-[0.08em] text-pine-700 mb-1">
            Profesora
          </label>
          <select id="listado-profesor" value={profesor} onChange={e => setProfesor(e.target.value)} className="input min-w-[220px]">
            <option value="">Toda la academia</option>
            {profesores.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-[15px] text-ink pb-2">
          <input type="checkbox" checked={conBajas} onChange={e => setConBajas(e.target.checked)} />
          Incluir bajas
        </label>
      </div>

      <div className="card !bg-white overflow-x-auto">
        <table className="data-table">
          <thead className="bg-khaki-100 border-b">
            <tr>{["", "Alumno", "Edad", "Pagador"].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-khaki-100">
            {isLoading && <tr><td colSpan={4} className="!text-ink-soft">Cargando…</td></tr>}
            {!isLoading && !filas.length && <tr><td colSpan={4} className="!text-ink-soft">No hay alumnos.</td></tr>}
            {filas.map((f, i) => (
              <tr key={`${f.nombre}-${i}`} className="hover:bg-khaki-100">
                <td className="!text-ink-soft w-10">{i + 1}</td>
                <td className="font-semibold">{f.nombre}</td>
                <td className="!text-ink-soft">{f.edad ?? "—"}</td>
                <td className="!text-ink-soft">{f.pagador}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
