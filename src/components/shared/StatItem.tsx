export default function StatItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card min-w-0 !px-4 !py-4">
      <div className="font-label text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-soft leading-tight">{label}</div>
      <div className="font-head text-[24px] leading-tight text-pine-900 mt-1.5 whitespace-nowrap">{value}</div>
      {sub && <div className="text-[13px] text-ink-soft mt-0.5 whitespace-nowrap">{sub}</div>}
    </div>
  )
}
