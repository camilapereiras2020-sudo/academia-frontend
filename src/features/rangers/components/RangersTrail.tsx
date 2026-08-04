const WAYPOINTS = ["A1", "A2", "B1", "B2", "C1"]

export default function RangersTrail() {
  return (
    <section id="trail" className="bg-sage-600 py-20 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="font-poster text-cream text-3xl sm:text-4xl mb-3">
          From A1 to C1, marked at every post.
        </h2>
        <p className="text-cream/80 max-w-xl mx-auto mb-16">
          Every student's route is waymarked. You always know exactly where you stand on the trail —
          and exactly what's next.
        </p>

        <div className="relative flex items-center justify-between max-w-2xl mx-auto">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-cream/30" />
          {WAYPOINTS.map((wp, i) => (
            <div key={wp} className="relative flex flex-col items-center gap-3 z-10">
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center ${
                  i === WAYPOINTS.length - 1
                    ? "bg-brass border-brass-light"
                    : "bg-forest-900 border-cream"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cream" />
              </div>
              <span className="font-poster text-cream text-sm tracking-widest">{wp}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
