import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { formatEur } from "@/lib/utils"
import { Link } from "react-router-dom"

export default function DashboardPage() {
  const { data: raw } = useQuery({
    queryKey: ["pagos"],
    queryFn: () => api.get("/pagos/").then(r => r.data),
  })

  const mesAct = new Date().toISOString().slice(0, 7)
  const todos = Array.isArray(raw) ? raw : (raw as any)?.results || []
  const estesMes = todos.filter((p: any) => p.periodo === mesAct)
  const cobrado = estesMes.filter((p: any) => p.estado === "pagado").reduce((s: number, p: any) => s + Number(p.total), 0)
  const pendiente = todos.filter((p: any) => p.estado === "pendiente" || p.estado === "parcial")

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-slate-800">Panel principal</h1>
        <div className="flex gap-2">
          <Link to="/asistencia" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Pasar lista</Link>
          <Link to="/pagos/nuevo" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">+ Nuevo pago</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Cobrado este mes", value: formatEur(cobrado), color: "border-green-500" },
          { label: "Pendiente", value: formatEur(pendiente.reduce((s: number, p: any) => s + Number(p.total), 0)), color: "border-red-500" },
          { label: "Pagos este mes", value: String(estesMes.length), color: "border-blue-500" },
          { label: "Sin cobrar", value: String(pendiente.length), color: "border-amber-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-white rounded-xl p-5 shadow-sm border-t-4 ${color}`}>
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-slate-800">Ultimos pagos</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {["Pagador","Alumno","Grupo","Total","Estado","Fecha"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {todos.slice(0, 8).map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{p.pagador_nombre}</td>
                <td className="px-4 py-3">{p.alumno_nombre}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.grupo_nombre}</td>
                <td className="px-4 py-3 font-semibold">{formatEur(Number(p.total))}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    p.estado === "pagado" ? "bg-green-100 text-green-800" :
                    p.estado === "pendiente" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                  }`}>{p.estado}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{p.fecha || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
