import { Link } from "react-router-dom"
import { Plus } from "lucide-react"

interface Props {
  title: string
  subtitle?: string
  action?: { label: string; onClick?: () => void; href?: string }
}

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action && (
        action.href
          ? <Link to={action.href} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={15}/>{action.label}</Link>
          : <button onClick={action.onClick} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"><Plus size={15}/>{action.label}</button>
      )}
    </div>
  )
}
