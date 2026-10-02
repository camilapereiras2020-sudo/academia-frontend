import { useEffect, useRef, useState } from "react"

// Mascota del equipo: un ciervito ranger que cruza de vez en cuando la parte
// de abajo de la pantalla. Al hacerle clic se para y dice algo. Solo es para
// el equipo (vive dentro de AppShell, detrás del login). Respeta "reducir
// movimiento" del sistema y se puede mandar a dormir hasta mañana.

const FRASES = [
  "Keep going, Rangers! 🌲",
  "Coffee break? ☕",
  "Invoices don't send themselves… 🧾",
  "You're doing great today!",
  "Stay hydrated, rangers 💧",
  "Full class = happy academy 🎉",
  "Explore the World of English 🧭",
  "Shhh… I'm on patrol 🦌",
  "Have you taken a break yet?",
  "Ranger mode: ON 🎒",
]

const CLAVE_DORMIR = "ciervito-duerme-hasta"
const DURACION_PASEO_MS = 14000

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function estaDormido() {
  try { return localStorage.getItem(CLAVE_DORMIR) === hoy() } catch { return false }
}

export default function Ciervito() {
  const [paseando, setPaseando] = useState(false)
  const [haciaIzquierda, setHaciaIzquierda] = useState(false)
  const [frase, setFrase] = useState<string | null>(null)
  const [dormido, setDormido] = useState(estaDormido)
  const timer = useRef<number | undefined>(undefined)
  const yaPaseo = useRef(false)

  const reducirMovimiento = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

  // Primer paseo a los 20 s; después cada 4–8 min.
  useEffect(() => {
    if (dormido || reducirMovimiento) return
    let cancelado = false
    function programar(ms: number) {
      timer.current = window.setTimeout(() => {
        if (cancelado) return
        yaPaseo.current = true
        setHaciaIzquierda(Math.random() < 0.5)
        setFrase(null)
        setPaseando(true)
      }, ms)
    }
    const primero = window.location.search.includes("ciervito") ? 1000 : 20000
    if (!paseando) programar(!yaPaseo.current ? primero : 240000 + Math.random() * 240000)
    return () => { cancelado = true; window.clearTimeout(timer.current) }
  }, [paseando, dormido, reducirMovimiento])

  if (dormido || reducirMovimiento || !paseando) return null

  function decirAlgo() {
    setFrase(FRASES[Math.floor(Math.random() * FRASES.length)])
  }

  function dormirHastaManana() {
    try { localStorage.setItem(CLAVE_DORMIR, hoy()) } catch { /* sin storage: solo hoy en esta pestaña */ }
    setDormido(true)
    setPaseando(false)
  }

  return (
    <div
      className="fixed bottom-2 z-30 pointer-events-none"
      style={{
        left: 0,
        animation: `ciervito-cruza-${haciaIzquierda ? "izq" : "der"} ${DURACION_PASEO_MS}ms linear forwards`,
        animationPlayState: frase ? "paused" : "running",
      }}
      onAnimationEnd={() => setPaseando(false)}
    >
      <style>{`
        @keyframes ciervito-cruza-der { from { transform: translateX(-110px) } to { transform: translateX(calc(100vw + 10px)) } }
        @keyframes ciervito-cruza-izq { from { transform: translateX(calc(100vw + 10px)) } to { transform: translateX(-110px) } }
        @keyframes ciervito-trote { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        @keyframes ciervito-pata-a { 0%,100% { transform: rotate(14deg) } 50% { transform: rotate(-14deg) } }
        @keyframes ciervito-pata-b { 0%,100% { transform: rotate(-14deg) } 50% { transform: rotate(14deg) } }
        .ciervito-cuerpo { animation: ciervito-trote .45s ease-in-out infinite }
        .ciervito-pata-a { animation: ciervito-pata-a .45s ease-in-out infinite; transform-box: fill-box; transform-origin: top center }
        .ciervito-pata-b { animation: ciervito-pata-b .45s ease-in-out infinite; transform-box: fill-box; transform-origin: top center }
        .ciervito-parado .ciervito-cuerpo, .ciervito-parado .ciervito-pata-a, .ciervito-parado .ciervito-pata-b { animation-play-state: paused }
      `}</style>

      {frase && (
        <div className="pointer-events-auto absolute bottom-[100px] left-0 w-max max-w-[220px] bg-white text-ink text-[14px] font-semibold rounded-[12px] border border-pine-900/15 shadow-lg px-3 py-2">
          {frase}
          <div className="flex gap-3 mt-1.5">
            <button type="button" onClick={() => setFrase(null)} className="font-label text-[12px] text-brass-700 hover:underline">
              Keep walking
            </button>
            <button type="button" onClick={dormirHastaManana} className="font-label text-[12px] text-ink-soft hover:underline">
              Sleep till tomorrow
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={decirAlgo}
        aria-label="Ranger deer"
        title="Hi there!"
        className={`pointer-events-auto block ${frase ? "ciervito-parado" : ""}`}
        style={{ transform: haciaIzquierda ? "scaleX(-1)" : undefined }}
      >
        <svg width="100" height="95" viewBox="0 0 76 72" aria-hidden="true">
          {/* patas */}
          <rect className="ciervito-pata-a" x="22" y="44" width="5" height="20" rx="2.5" fill="#8A6B49" />
          <rect className="ciervito-pata-b" x="29" y="44" width="5" height="20" rx="2.5" fill="#6f5638" />
          <rect className="ciervito-pata-b" x="44" y="44" width="5" height="20" rx="2.5" fill="#8A6B49" />
          <rect className="ciervito-pata-a" x="51" y="44" width="5" height="20" rx="2.5" fill="#6f5638" />
          <g className="ciervito-cuerpo">
            {/* cola */}
            <ellipse cx="14" cy="34" rx="5" ry="4" fill="#F6F1E7" />
            {/* cuerpo */}
            <ellipse cx="38" cy="38" rx="22" ry="11" fill="#a17f56" />
            <ellipse cx="38" cy="42" rx="14" ry="5" fill="#d8c8a8" />
            {/* manchitas */}
            <circle cx="30" cy="33" r="1.8" fill="#F6F1E7" />
            <circle cx="37" cy="31" r="1.6" fill="#F6F1E7" />
            <circle cx="44" cy="34" r="1.8" fill="#F6F1E7" />
            {/* cuello y cabeza */}
            <rect x="54" y="20" width="7" height="16" rx="3.5" fill="#a17f56" />
            <ellipse cx="62" cy="19" rx="8" ry="6.5" fill="#a17f56" />
            <ellipse cx="68" cy="21" rx="3.5" ry="3" fill="#8A6B49" />
            <circle cx="70.5" cy="20.5" r="1.4" fill="#2B3A2F" />
            <circle cx="62" cy="17" r="1.3" fill="#2B3A2F" />
            {/* oreja */}
            <ellipse cx="56" cy="15" rx="4" ry="2.2" fill="#8A6B49" transform="rotate(-25 56 15)" />
            {/* astas */}
            <path d="M58 11 L55 3 M56.5 7 L52 5 M62 11 L64 3 M63 7 L67 5" stroke="#C8A45A" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* sombrero de ranger */}
            <ellipse cx="61" cy="11.5" rx="9" ry="2.2" fill="#3F5242" />
            <path d="M56 11.5 Q56 5 61 5 Q66 5 66 11.5 Z" fill="#3F5242" />
            <rect x="56.5" y="9" width="9" height="1.8" fill="#C8A45A" />
            {/* pañuelo */}
            <path d="M53 27 L61 27 L57 32 Z" fill="#C8A45A" />
          </g>
        </svg>
      </button>
    </div>
  )
}
