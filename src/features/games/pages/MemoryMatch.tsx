import { useState, useEffect, useCallback } from "react"
import { WORDS, shuffle, Word } from "../words"

// ── Types ─────────────────────────────────────────────────────────────────────

type CardSide = "word" | "def"

interface Card {
  id: string
  wordIndex: number
  side: CardSide
  label: string
  emoji: string
  flipped: boolean
  matched: boolean
}

type Screen = "menu" | "playing" | "result"
type Difficulty = "easy" | "medium" | "hard"

const PAIR_COUNTS: Record<Difficulty, number> = { easy: 4, medium: 6, hard: 8 }

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCards(words: Word[], pairCount: number): Card[] {
  const selected = shuffle(words).slice(0, pairCount)
  const cards: Card[] = []
  selected.forEach((w, i) => {
    cards.push({ id: `${i}-word`, wordIndex: i, side: "word", label: w.word, emoji: w.emoji, flipped: false, matched: false })
    cards.push({ id: `${i}-def`,  wordIndex: i, side: "def",  label: w.definition, emoji: w.emoji, flipped: false, matched: false })
  })
  return shuffle(cards)
}

function useTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])
  return seconds
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${ss.toString().padStart(2, "0")}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MemCard({ card, onClick }: { card: Card; onClick: () => void }) {
  const canFlip = !card.flipped && !card.matched

  const bg = card.matched
    ? "linear-gradient(135deg, #B08D57, #C9A96E)"
    : card.flipped
    ? "white"
    : "var(--dark-3, #F3F0EB)"

  const border = card.matched
    ? "2px solid #B08D57"
    : card.flipped
    ? "2px solid #B08D57"
    : "1px solid rgba(0,0,0,0.09)"

  return (
    <div
      onClick={canFlip ? onClick : undefined}
      style={{
        cursor: canFlip ? "pointer" : "default",
        perspective: "600px",
        aspectRatio: "3/4",
      }}
    >
      <div style={{
        position: "relative", width: "100%", height: "100%",
        transformStyle: "preserve-3d",
        transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1)",
        transform: card.flipped || card.matched ? "rotateY(180deg)" : "rotateY(0deg)",
      }}>

        {/* Back face (hidden, shown before flip) */}
        <div style={{
          position: "absolute", inset: 0,
          backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          borderRadius: "12px",
          background: "var(--dark-3, #F3F0EB)",
          border: "1px solid rgba(0,0,0,0.09)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "1.5rem", opacity: 0.25 }}>?</span>
        </div>

        {/* Front face */}
        <div style={{
          position: "absolute", inset: 0,
          backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          borderRadius: "12px",
          background: bg, border,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0.5rem",
          textAlign: "center",
          boxShadow: card.matched ? "0 4px 16px rgba(176,141,87,0.25)" : "0 4px 16px rgba(0,0,0,0.06)",
        }}>
          {card.side === "word" && (
            <>
              <span style={{ fontSize: "1.2rem", marginBottom: "0.3rem" }}>{card.emoji}</span>
              <span style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "1rem", fontWeight: 500,
                color: card.matched ? "white" : "var(--text, #1A1714)",
                lineHeight: 1.2,
              }}>{card.label}</span>
            </>
          )}
          {card.side === "def" && (
            <span style={{
              fontSize: "0.68rem", fontWeight: 300, lineHeight: 1.45,
              color: card.matched ? "rgba(255,255,255,0.9)" : "var(--text-muted)",
            }}>{card.label}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MemoryMatch() {
  const [screen, setScreen]         = useState<Screen>("menu")
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [cards, setCards]           = useState<Card[]>([])
  const [firstId, setFirstId]       = useState<string | null>(null)
  const [locked, setLocked]         = useState(false)
  const [moves, setMoves]           = useState(0)
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const seconds = useTimer(timerRunning)

  const totalPairs = PAIR_COUNTS[difficulty]
  const done = matchedPairs === totalPairs

  useEffect(() => {
    if (done && screen === "playing") {
      setTimerRunning(false)
      setScreen("result")
    }
  }, [done, screen])

  const startGame = useCallback(() => {
    const newCards = buildCards(WORDS, PAIR_COUNTS[difficulty])
    setCards(newCards)
    setFirstId(null)
    setLocked(false)
    setMoves(0)
    setMatchedPairs(0)
    setTimerRunning(true)
    setScreen("playing")
  }, [difficulty])

  const handleCardClick = (id: string) => {
    if (locked) return

    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c))

    if (!firstId) {
      setFirstId(id)
      return
    }

    // Second card selected
    setMoves(m => m + 1)
    setLocked(true)

    const first = cards.find(c => c.id === firstId)!
    const second = cards.find(c => c.id === id)!
    const isMatch = first.wordIndex === second.wordIndex && first.side !== second.side

    if (isMatch) {
      setCards(prev => prev.map(c =>
        c.id === firstId || c.id === id ? { ...c, matched: true, flipped: true } : c
      ))
      setMatchedPairs(p => p + 1)
      setFirstId(null)
      setLocked(false)
    } else {
      setTimeout(() => {
        setCards(prev => prev.map(c =>
          c.id === firstId || c.id === id ? { ...c, flipped: false } : c
        ))
        setFirstId(null)
        setLocked(false)
      }, 900)
    }
  }

  const cols = totalPairs <= 4 ? 4 : totalPairs <= 6 ? 4 : 4  // always 4 cols, rows vary

  // ── Menu ────────────────────────────────────────────────────────────────────

  if (screen === "menu") return (
    <div style={{ minHeight: "100vh", background: "var(--dark, #FAF8F5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: "420px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🧠</div>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.5rem", fontWeight: 300, color: "var(--text)", marginBottom: "0.5rem" }}>
          Memory Match
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
          Match each word with its definition.<br />Fewer moves = better score.
        </p>

        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Difficulty</p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
              <button key={d} onClick={() => setDifficulty(d)} style={{
                padding: "0.5rem 1.25rem", borderRadius: "999px", cursor: "pointer", textTransform: "capitalize",
                border: difficulty === d ? "2px solid #B08D57" : "1px solid rgba(0,0,0,0.1)",
                background: difficulty === d ? "#B08D57" : "transparent",
                color: difficulty === d ? "#fff" : "var(--text-muted)",
                fontSize: "0.85rem", fontWeight: 500,
              }}>
                {d} <span style={{ opacity: 0.7, fontSize: "0.75rem" }}>({PAIR_COUNTS[d]} pairs)</span>
              </button>
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

  // ── Result ──────────────────────────────────────────────────────────────────

  if (screen === "result") {
    const rating = moves <= totalPairs + 2 ? "🏆 Flawless!" : moves <= totalPairs * 2 ? "⭐ Impressive!" : "💪 Well done!"
    return (
      <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "DM Sans, sans-serif" }}>
        <div style={{ maxWidth: "380px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>{rating.split(" ")[0]}</div>
          <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", fontWeight: 300, marginBottom: "1.5rem" }}>
            {rating.split(" ").slice(1).join(" ")}
          </h2>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[["Pairs", totalPairs], ["Moves", moves], ["Time", fmtTime(seconds)], ["Efficiency", `${Math.round((totalPairs / moves) * 100)}%`]].map(([label, value]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.8rem", fontWeight: 600, color: "#B08D57" }}>{value}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={startGame} style={{ flex: 1, background: "#B08D57", color: "#fff", border: "none", borderRadius: "10px", padding: "0.875rem", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer" }}>Play again</button>
            <button onClick={() => setScreen("menu")} style={{ flex: 1, background: "transparent", color: "var(--text-muted)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "10px", padding: "0.875rem", fontSize: "0.9rem", cursor: "pointer" }}>Menu</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Playing ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", fontFamily: "DM Sans, sans-serif", padding: "1.5rem 1rem" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "1.25rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>⏱ {fmtTime(seconds)}</span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>↔ {moves} moves</span>
          </div>
          <span style={{ fontSize: "0.85rem", color: "#B08D57", fontWeight: 500 }}>
            {matchedPairs} / {totalPairs} matched
          </span>
        </div>

        {/* Progress */}
        <div style={{ height: "3px", background: "rgba(0,0,0,0.08)", borderRadius: "999px", marginBottom: "1.5rem" }}>
          <div style={{ height: "100%", width: `${(matchedPairs / totalPairs) * 100}%`, background: "#B08D57", borderRadius: "999px", transition: "width 0.4s" }} />
        </div>

        {/* Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "0.6rem",
        }}>
          {cards.map(card => (
            <MemCard key={card.id} card={card} onClick={() => handleCardClick(card.id)} />
          ))}
        </div>

      </div>
    </div>
  )
}
