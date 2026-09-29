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
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && (
        action.href
          ? <Link to={action.href} className="btn-primary inline-flex items-center gap-2"><Plus size={15}/>{action.label}</Link>
          : <button onClick={action.onClick} className="btn-primary inline-flex items-center gap-2"><Plus size={15}/>{action.label}</button>
      )}
    </div>
  )
}
