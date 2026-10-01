import { useState } from "react"
import RangersCrest from "@/components/rangers/RangersCrest"

const NAV = [
  { id: "programs", es: "Programas", en: "Programs" },
  { id: "trail", es: "El Sendero", en: "The Trail" },
  { id: "field-reports", es: "Testimonios", en: "Field Reports" },
  { id: "station", es: "Estación", en: "Station" },
]

const COPY = {
  es: { sub: "Explora el Mundo del Inglés", cta: "Reserva una Clase de Prueba" },
  en: { sub: "Explore the World of English", cta: "Book a Trial Class" },
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

export default function RangersHeader() {
  const [lang, setLang] = useState<"es" | "en">("en")
  const t = COPY[lang]

  return (
    <header className="sticky top-0 z-40 bg-forest-900/95 backdrop-blur border-b border-brass/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <RangersCrest size={44} showRibbon={false} />
          <div className="leading-tight">
            <p className="font-poster text-cream text-sm sm:text-base tracking-widest">Rangers Academy</p>
            <p className="text-khaki/70 text-[0.65rem] sm:text-xs tracking-wide">{t.sub}</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToId(item.id)}
              className="text-cream/80 hover:text-brass-light text-sm font-medium tracking-wide transition-colors"
            >
              {item[lang]}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setLang((l) => (l === "es" ? "en" : "es"))}
            aria-label="Toggle language"
            className="text-[0.65rem] tracking-widest uppercase text-khaki border border-khaki/40 rounded-md px-2 py-1 hover:border-brass hover:text-brass-light transition-colors"
          >
            {lang === "es" ? "ES" : "EN"}
          </button>
          <a
            href="mailto:info@rangersacademy.es?subject=Trial%20Class%20Request"
            className="bg-brass hover:bg-brass-light text-forest-950 text-xs sm:text-sm font-semibold tracking-wide px-3 sm:px-4 py-2 rounded-md transition-colors whitespace-nowrap"
          >
            {t.cta}
          </a>
        </div>
      </div>
    </header>
  )
}
