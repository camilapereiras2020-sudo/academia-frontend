import { useState, useCallback, CSSProperties } from "react"
import { WORDS, LEVEL_COLORS, shuffle, Word } from "../words"

type Screen = "menu" | "playing" | "result"

const LEVELS = ["ALL", "A2", "B1", "B2", "C1"]

// ── Flip card styles ─────────────────────────────────────────────────────────

const cardFace: CSSProperties = {
  position: "absolute", inset: 0,
  borderRadius: "20px",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  padding: "2rem",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LevelPill({ level }: { level: string }) {
  const color = LEVEL_COLORS[level] ?? "#999"
  return (
    <span style={{
      fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em",
      textTransform: "uppercase", padding: "0.2rem 0.7rem",
      borderRadius: "999px",
      background: color + "20", color,
    }}>{level}</span>
  )
}

function LevelButton({ level, active, onClick }: { level: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "0.4rem 1rem", borderRadius: "999px", cursor: "pointer",
      border: active ? "2px solid #B08D57" : "1px solid rgba(0,0,0,0.1)",
      background: active ? "#B08D57" : "transparent",
      color: active ? "#fff" : "var(--text-muted, #888)",
      fontSize: "0.8rem", fontWeight: 500,
    }}>{level}</button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FlashcardGame() {
  const [screen, setScreen]         = useState<Screen>("menu")
  const [filterLevel, setFilterLevel] = useState("ALL")
  const [remaining, setRemaining]   = useState<Word[]>([])
  const [masteredCount, setMasteredCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [flipped, setFlipped]       = useState(false)
  const [leaving, setLeaving]       = useState<"left" | "right" | null>(null)

  const current = remaining[0] ?? null

  const startGame = useCallback(() => {
    const filtered = filterLevel === "ALL" ? WORDS : WORDS.filter(w => w.level === filterLevel)
    const deck = shuffle(filtered)
    setRemaining(deck)
    setTotalCount(deck.length)
    setMasteredCount(0)
    setFlipped(false)
    setLeaving(null)
    setScreen("playing")
  }, [filterLevel])

  const advance = (dir: "left" | "right", callback: () => void) => {
    setLeaving(dir)
    setTimeout(() => {
      setLeaving(null)
      setFlipped(false)
      callback()
    }, 300)
  }

  const handleGotIt = () => {
    advance("right", () => {
      setMasteredCount(m => m + 1)
      setRemaining(r => {
        const next = r.slice(1)
        if (next.length === 0) setScreen("result")
        return next
      })
    })
  }

  const handlePractice = () => {
    advance("left", () => {
      setRemaining(r => {
        const [first, ...rest] = r
        return [...rest, first]
      })
    })
  }

  // ── Menu ──────────────────────────────────────────────────────────────────

  if (screen === "menu") return (
    <div style={{ minHeight: "100vh", background: "var(--dark, #FAF8F5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: "420px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🃏</div>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.5rem", fontWeight: 300, color: "var(--text, #1A1714)", marginBottom: "0.5rem" }}>
          Flashcards
        </h1>
        <p style={{ color: "var(--text-muted, #888)", fontSize: "0.9rem", marginBottom: "2rem" }}>
          Flip each card to reveal the definition.<br />Mark what you know — skip what you don't.
        </p>

        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.7rem", color: "var(--text-dim, #aaa)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Level</p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            {LEVELS.map(lvl => (
              <LevelButton key={lvl} level={lvl} active={filterLevel === lvl} onClick={() => setFilterLevel(lvl)} />
            ))}
          </div>
        </div>

        <button onClick={startGame} style={{
          background: "#B08D57", color: "#fff", border: "none", borderRadius: "12px",
          padding: "1rem 3rem", fontSize: "1rem", fontWeight: 500, cursor: "pointer", width: "100%",
        }}>Start →</button>
      </div>
    </div>
  )

  // ── Result ────────────────────────────────────────────────────────────────

  if (screen === "result") {
    const pct = Math.round((masteredCount / totalCount) * 100)
    return (
      <div style={{ minHeight: "100vh", background: "var(--dark, #FAF8F5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "DM Sans, sans-serif" }}>
        <div style={{ maxWidth: "380px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "5rem", marginBottom: "1rem" }}>{pct === 100 ? "🏆" : pct >= 70 ? "⭐" : "💪"}</div>
          <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", fontWeight: 300, marginBottom: "0.5rem" }}>
            {pct === 100 ? "Perfect!" : pct >= 70 ? "Well done!" : "Keep going!"}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
            You mastered <strong style={{ color: "#B08D57" }}>{masteredCount} of {totalCount}</strong> cards.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={startGame} style={{ flex: 1, background: "#B08D57", color: "#fff", border: "none", borderRadius: "10px", padding: "0.875rem", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer" }}>Play again</button>
            <button onClick={() => setScreen("menu")} style={{ flex: 1, background: "transparent", color: "var(--text-muted)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "10px", padding: "0.875rem", fontSize: "0.9rem", cursor: "pointer" }}>Menu</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Playing ───────────────────────────────────────────────────────────────

  if (!current) return null

  const progress = ((totalCount - remaining.length) / totalCount) * 100

  const cardTransform = leaving === "right"
    ? "translateX(120%) rotate(8deg)"
    : leaving === "left"
    ? "translateX(-120%) rotate(-8deg)"
    : flipped ? "rotateY(180deg)" : "rotateY(0deg)"

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark, #FAF8F5)", fontFamily: "DM Sans, sans-serif", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {totalCount - remaining.length + 1} / {totalCount}
          </span>
          <span style={{ fontSize: "0.85rem", color: "#B08D57", fontWeight: 500 }}>
            ✓ {masteredCount} mastered
          </span>
        </div>

        {/* Progress */}
        <div style={{ height: "3px", background: "rgba(0,0,0,0.08)", borderRadius: "999px", marginBottom: "2rem" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "#B08D57", borderRadius: "999px", transition: "width 0.4s" }} />
        </div>

        {/* Card */}
        <div style={{ perspective: "1200px", marginBottom: "1.5rem" }} onClick={() => !leaving && setFlipped(f => !f)}>
          <div style={{
            position: "relative", height: "280px",
            transformStyle: "preserve-3d",
            transition: leaving ? "transform 0.3s ease-in, opacity 0.3s" : "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
            transform: cardTransform,
            cursor: "pointer",
            opacity: leaving ? 0 : 1,
          }}>

            {/* Front — word */}
            <div style={{ ...cardFace, background: "white", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 8px 40px rgba(0,0,0,0.08)", textAlign: "center" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>{current.emoji}</div>
              <LevelPill level={current.level} />
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.2rem", fontWeight: 400, color: "var(--text)", marginTop: "1rem", lineHeight: 1.1 }}>
                {current.word}
              </h2>
              <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "1.25rem" }}>tap to flip</p>
            </div>

            {/* Back — definition */}
            <div style={{ ...cardFace, background: "#B08D57", transform: "rotateY(180deg)", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem", opacity: 0.7 }}>{current.emoji}</div>
              <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.1rem", fontWeight: 300, color: "rgba(255,255,255,0.7)", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
                {current.word}
              </h3>
              <p style={{ fontSize: "1.05rem", color: "white", lineHeight: 1.55, fontWeight: 300 }}>
                {current.definition}
              </p>
            </div>
          </div>
        </div>

        {/* Action hint when not flipped */}
        {!flipped && (
          <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: "1.25rem" }}>
            Tap the card to see the definition
          </p>
        )}

        {/* Buttons — only shown after flip */}
        {flipped && (
          <div style={{ display: "flex", gap: "0.75rem", animation: "fadeUp 0.25s ease forwards" }}>
            <button onClick={handlePractice} style={{
              flex: 1, border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: "12px",
              background: "white", color: "var(--text)", padding: "0.875rem",
              fontSize: "0.9rem", fontWeight: 400, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}>
              🔄 Practice again
            </button>
            <button onClick={handleGotIt} style={{
              flex: 1, border: "none", borderRadius: "12px",
              background: "#22c55e", color: "white", padding: "0.875rem",
              fontSize: "0.9rem", fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}>
              ✓ Got it!
            </button>
          </div>
        )}

        {/* Remaining stack hint */}
        {remaining.length > 1 && (
          <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "1.5rem" }}>
            {remaining.length - 1} card{remaining.length - 1 !== 1 ? "s" : ""} left
          </p>
        )}
      </div>
    </div>
  )
}
