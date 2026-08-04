const REPORTS = [
  {
    name: "Familia Vázquez",
    quote:
      "Our daughter went from dreading English homework to asking for extra past papers. The rangers actually make the Cambridge grind feel manageable.",
  },
  {
    name: "Familia Rial",
    quote:
      "IB Language & Literature is brutal and the team here treated it like a real expedition — checkpoints, feedback, no vague pep talks. Huge difference.",
  },
  {
    name: "M. Fernández",
    quote:
      "Started adult evening classes after a decade of avoiding English at work meetings. First academy that didn't make me feel like I was starting from zero.",
  },
]

function Stars() {
  return (
    <div className="flex gap-0.5 text-brass mb-3" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
  )
}

export default function RangersFieldReports() {
  return (
    <section id="field-reports" className="bg-cream py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="font-poster text-forest-900 text-3xl sm:text-4xl mb-3">
          Families who reached the summit.
        </h2>
        <p className="text-forest-700/80 max-w-xl mb-12">Field reports from the trail.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {REPORTS.map((r) => (
            <div key={r.name} className="bg-white border border-khaki-light rounded-xl p-6 relative">
              <span className="absolute top-4 right-4 text-[0.6rem] uppercase tracking-widest text-forest-700/50 bg-khaki-light rounded-full px-2 py-1">
                Pending real Google review
              </span>
              <Stars />
              <p className="text-forest-800 text-sm leading-relaxed mb-4 italic">&ldquo;{r.quote}&rdquo;</p>
              <p className="text-forest-900 text-sm font-semibold">{r.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
