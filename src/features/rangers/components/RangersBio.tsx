export default function RangersBio() {
  return (
    <section className="bg-forest-800 py-20 sm:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 grid md:grid-cols-[0.8fr_1.2fr] gap-10 items-center">
        {/* Photo placeholder — styled frame, not a broken img tag */}
        <div className="aspect-[4/5] w-full max-w-xs mx-auto md:mx-0 rounded-xl border-2 border-brass/50 bg-forest-900 flex flex-col items-center justify-center gap-3 text-khaki/60">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
          </svg>
          <span className="text-[0.65rem] tracking-widest uppercase">Photo coming soon</span>
        </div>

        <div>
          <span className="text-brass-light text-[0.68rem] tracking-widest uppercase font-semibold">
            Head Ranger
          </span>
          <h2 className="font-poster text-cream text-3xl sm:text-4xl mt-2 mb-4">Founded by Cande.</h2>
          <p className="text-khaki/90 text-base leading-relaxed mb-3">
            Cande started Rangers Academy after years of watching students survive English class
            instead of actually using it. She built the academy around the same principle every good
            trail guide follows: know the terrain, mark it clearly, and never leave anyone behind.
          </p>
          <p className="text-khaki/90 text-base leading-relaxed mb-6">
            Today she leads a small crew of rangers across Cambridge, IB and adult programs — all
            trained to turn exam anxiety into steady, well-marked progress.
          </p>
          <a href="#" className="text-brass-light hover:text-brass font-medium tracking-wide">
            Meet the Team →
          </a>
        </div>
      </div>
    </section>
  )
}
