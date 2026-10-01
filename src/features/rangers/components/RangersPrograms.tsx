const PROGRAMS = [
  {
    number: "01",
    title: "Cambridge Exam Prep",
    body:
      "Structured trail markers from KET to Advanced. Past-paper mileage, exam technique, and speaking practice with rangers who've walked every candidate through to a pass.",
  },
  {
    number: "02",
    title: "IB Support",
    body:
      "English A & B, Language & Literature, extended essay guidance and internal assessment coaching — base-camp support for the toughest stretch of the diploma.",
  },
  {
    number: "03",
    title: "Adult English",
    body:
      "Conversation, business English and confidence-building for grown-up explorers, at a pace that fits real life — evenings, weekends, whatever your terrain looks like.",
  },
]

export default function RangersPrograms() {
  return (
    <section id="programs" className="bg-cream py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="font-poster text-forest-900 text-3xl sm:text-4xl mb-3">Three trailheads, one academy.</h2>
        <p className="text-forest-700/80 max-w-xl mb-12">
          Pick your route. Every trailhead leads to the same summit: real, confident English.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROGRAMS.map((p) => (
            <div
              key={p.number}
              className="bg-white border border-khaki-light rounded-xl p-6 sm:p-7 hover:border-brass/60 hover:shadow-md transition-all"
            >
              <span className="font-poster text-brass text-3xl block mb-4">{p.number}</span>
              <h3 className="font-poster text-forest-900 text-lg mb-2 tracking-wide">{p.title}</h3>
              <p className="text-forest-700/80 text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
