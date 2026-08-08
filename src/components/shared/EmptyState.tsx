import type { LucideIcon } from "lucide-react"

interface Props { icon: LucideIcon; message: string }

export default function EmptyState({ icon: Icon, message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-khaki-400">
      <Icon size={36} className="mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
