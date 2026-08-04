import RangersCrest from "@/components/rangers/RangersCrest"

const NAV = [
  { id: "programs", label: "Programs" },
  { id: "trail", label: "The Trail" },
  { id: "field-reports", label: "Field Reports" },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

export default function RangersFooter() {
  return (
    <footer id="station" className="bg-forest-950 text-khaki/80 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-[auto_1fr_auto] gap-10 items-start pb-12 border-b border-cream/10">
          <RangersCrest size={80} />

          <div>
            <h2 className="font-poster text-cream text-2xl sm:text-3xl mb-4">Report to the trailhead.</h2>
            <div className="space-y-1.5 text-sm">
              <p>Rúa dos Ferreiros, 26, bajo, 36002 Pontevedra</p>
              <p>
                <a href="tel:+34613014124" className="hover:text-brass-light transition-colors">
                  613 014 124
                </a>
              </p>
              <p>
                <a href="mailto:info@rangersacademy.es" className="hover:text-brass-light transition-colors">
                  info@rangersacademy.es
                </a>
              </p>
            </div>
          </div>

          <a
            href="mailto:info@rangersacademy.es?subject=Trial%20Class%20Request"
            className="bg-brass hover:bg-brass-light text-forest-950 font-semibold tracking-wide px-6 py-3 rounded-md transition-colors whitespace-nowrap self-start"
          >
            Book a Trial Class
          </a>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} Rangers Academy. All rights reserved.</p>
          <nav className="flex flex-wrap items-center justify-center gap-5">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToId(item.id)}
                className="hover:text-brass-light transition-colors"
              >
                {item.label}
              </button>
            ))}
            <a href="#" className="hover:text-brass-light transition-colors">Privacy</a>
            <a href="#" className="hover:text-brass-light transition-colors">Terms</a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
