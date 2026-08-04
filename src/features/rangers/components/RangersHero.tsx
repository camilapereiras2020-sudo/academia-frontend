import RangersCrest from "@/components/rangers/RangersCrest"

export default function RangersHero() {
  return (
    <section className="relative overflow-hidden bg-forest-900 text-cream">
      {/* Geometric WPA-poster backdrop: sunburst + mountains */}
      <svg
        className="absolute inset-0 w-full h-full opacity-40"
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <circle cx="600" cy="420" r="260" fill="none" stroke="#D4A94A" strokeWidth="2" opacity="0.5" />
        <g stroke="#D4A94A" strokeWidth="1.5" opacity="0.35">
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 360) / 24
            const rad = (angle * Math.PI) / 180
            const x1 = 600 + Math.cos(rad) * 150
            const y1 = 420 + Math.sin(rad) * 150
            const x2 = 600 + Math.cos(rad) * 420
            const y2 = 420 + Math.sin(rad) * 420
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
          })}
        </g>
        <polygon points="0,700 0,520 180,340 320,470 480,290 640,470 800,300 980,480 1120,360 1200,500 1200,700" fill="#1E4536" opacity="0.9" />
        <polygon points="0,700 0,600 220,440 420,560 620,400 840,570 1050,420 1200,560 1200,700" fill="#16302A" />
      </svg>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 grid md:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
        <div>
          <span className="inline-block bg-brass/15 border border-brass/50 text-brass-light text-[0.68rem] tracking-widest uppercase font-semibold px-3 py-1.5 rounded-full mb-6">
            Cambridge &amp; IB Field Station · Pontevedra
          </span>
          <h1 className="font-poster text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mb-6">
            Fluency is a trail.
            <br />
            We're your rangers.
          </h1>
          <p className="text-khaki/90 text-base sm:text-lg max-w-lg mb-8 leading-relaxed">
            No shortcuts, no gimmicks — just a marked path from your first words to Cambridge and IB
            success, guided by rangers who know every switchback of the way.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="mailto:info@rangersacademy.es?subject=Trial%20Class%20Request"
              className="bg-brass hover:bg-brass-light text-forest-950 font-semibold tracking-wide px-6 py-3 rounded-md transition-colors"
            >
              Book a Trial Class
            </a>
            <a
              href="#programs"
              className="border border-cream/40 hover:border-brass hover:text-brass-light text-cream font-medium tracking-wide px-6 py-3 rounded-md transition-colors"
            >
              Explore the Trails
            </a>
          </div>
        </div>

        <div className="hidden md:flex justify-center">
          <RangersCrest size={260} />
        </div>
      </div>
    </section>
  )
}
