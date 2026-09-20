export default function StatItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 flex items-center gap-2.5 px-4 py-3.5 border-r border-b border-khaki-300 last:border-r-0">
      <div className="w-1 self-stretch bg-brass-500 rounded-sm flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[10.5px] font-extrabold uppercase tracking-[0.03em] text-pine-700 leading-tight">{label}</div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <div className="font-head text-[18px] text-pine-800 whitespace-nowrap">{value}</div>
          {sub && <div className="text-[10.5px] text-pine-700 font-semibold whitespace-nowrap">{sub}</div>}
        </div>
      </div>
    </div>
  )
}
