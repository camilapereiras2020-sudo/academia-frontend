import { useState, useEffect, useRef, useCallback } from "react"
import { WORDS, LEVEL_COLORS, shuffle, Word } from "../words"

const LEVELS = ["ALL", "A2", "B1", "B2", "C1"]
const TIME_PER_WORD = 20

type Screen = "menu" | "playing" | "result"

function scramble(word: string): string {
  const arr = word.split("")
  let out: string[]
  let attempts = 0
  do {
    out = shuffle(arr)
    attempts++
  } while (out.join("") === word && attempts < 20)
  return out.join("")
}

export default function WordScramble() {
  const [screen, setScreen]       = useState<Screen>("menu")
  const [filterLevel, setFilterLevel] = useState("ALL")
  const [deck, setDeck]           = useState<Word[]>([])
  const [index, setIndex]         = useState(0)
  const [scrambled, setScrambled] = useState("")
  const [input, setInput]         = useState("")
  const [timeLeft, setTimeLeft]   = useState(TIME_PER_WORD)
  const [score, setScore]         = useState(0)
  const [streak, setStreak]       = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [feedback, setFeedback]   = useState<"correct" | "wrong" | "timeout" | null>(null)
  const [hint, setHint]           = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = deck[index]

  const advance = useCallback((result: "correct" | "wrong" | "timeout") => {
    setFeedback(result)
    setTimeout(() => {
      setFeedback(null)
      setInput("")
      setHint(false)
      setTimeLeft(TIME_PER_WORD)
      setIndex(i => {
        const next = i + 1
        if (next >= deck.length) { setScreen("result"); return i }
        setScrambled(scramble(deck[next].word))
        return next
      })
      inputRef.current?.focus()
    }, 1200)
  }, [deck])

  // Timer
  useEffect(() => {
    if (screen !== "playing" || feedback) return
    if (timeLeft <= 0) { advance("timeout"); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, screen, feedback, advance])

  function startGame() {
    const filtered = filterLevel === "ALL" ? WORDS : WORDS.filter(w => w.level === filterLevel)
    const d = shuffle(filtered).slice(0, Math.min(10, filtered.length))
    setDeck(d)
    setIndex(0)
    setScrambled(scramble(d[0].word))
    setInput("")
    setScore(0)
    setStreak(0)
    setMaxStreak(0)
    setFeedback(null)
    setHint(false)
    setTimeLeft(TIME_PER_WORD)
    setScreen("playing")
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleInput(val: string) {
    if (feedback) return
    setInput(val)
    if (val.trim().toLowerCase() === current.word.toLowerCase()) {
      const bonus = timeLeft > 15 ? 3 : timeLeft > 10 ? 2 : 1
      setScore(s => s + bonus)
      setStreak(s => { const ns = s + 1; setMaxStreak(m => Math.max(m, ns)); return ns })
      advance("correct")
    }
  }

  function handleSkip() {
    if (feedback) return
    setStreak(0)
    advance("wrong")
  }

  const pct = deck.length > 0 ? (index / deck.length) * 100 : 0
  const timePct = (timeLeft / TIME_PER_WORD) * 100
  const timerColor = timeLeft <= 5 ? "#e53935" : timeLeft <= 10 ? "#FF6B35" : "#B08D57"

  // ── Menu ────────────────────────────────────────────────────────────────────

  if (screen === "menu") return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: "420px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔤</div>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.5rem", fontWeight: 300, color: "var(--text)", marginBottom: "0.5rem" }}>
          Word Scramble
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
          Unscramble the letters to spell the word.<br />Type fast — the clock is ticking!
        </p>
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Level</p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            {LEVELS.map(lvl => (
              <button key={lvl} onClick={() => setFilterLevel(lvl)} style={{
                padding: "0.4rem 1rem", borderRadius: "999px", cursor: "pointer",
                border: filterLevel === lvl ? "2px solid #B08D57" : "1px solid rgba(0,0,0,0.1)",
                background: filterLevel === lvl ? "#B08D57" : "transparent",
                color: filterLevel === lvl ? "#fff" : "var(--text-muted)",
                fontSize: "0.8rem", fontWeight: 500,
              }}>{lvl}</button>
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
    const maxPossible = deck.length * 3
    const acc = Math.round((score / maxPossible) * 100)
    return (
      <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "DM Sans, sans-serif" }}>
        <div style={{ maxWidth: "380px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "5rem", marginBottom: "1rem" }}>{acc >= 80 ? "🏆" : acc >= 50 ? "⭐" : "💪"}</div>
          <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", fontWeight: 300, marginBottom: "1.5rem" }}>
            {acc >= 80 ? "Spectacular!" : acc >= 50 ? "Well done!" : "Keep practising!"}
          </h2>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[["Score", score], ["Words", deck.length], ["Best streak", maxStreak], ["Rating", `${acc}%`]].map(([l, v]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.8rem", fontWeight: 600, color: "#B08D57" }}>{v}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div>
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

  if (!current) return null

  const levelColor = LEVEL_COLORS[current.level] ?? "#999"

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", fontFamily: "DM Sans, sans-serif", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{index + 1} / {deck.length}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {streak > 1 && (
              <span style={{ background: "#FF6B35", color: "white", fontSize: "0.7rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "999px" }}>
                🔥 {streak}
              </span>
            )}
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#B08D57" }}>★ {score}</span>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              border: `3px solid ${timerColor}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.85rem", fontWeight: 600, color: timerColor,
              transition: "border-color 0.3s, color 0.3s",
            }}>{timeLeft}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: "3px", background: "rgba(0,0,0,0.08)", borderRadius: "999px", marginBottom: "0.5rem" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "#B08D57", borderRadius: "999px", transition: "width 0.3s" }} />
        </div>

        {/* Timer bar */}
        <div style={{ height: "2px", background: "rgba(0,0,0,0.06)", borderRadius: "999px", marginBottom: "1.5rem" }}>
          <div style={{ height: "100%", width: `${timePct}%`, background: timerColor, borderRadius: "999px", transition: "width 1s linear, background 0.3s" }} />
        </div>

        {/* Definition card */}
        <div style={{
          background: "white", borderRadius: "20px", padding: "1.75rem", marginBottom: "1.25rem",
          border: "1px solid rgba(0,0,0,0.08)", textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{current.emoji}</div>
          <span style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.2rem 0.7rem", borderRadius: "999px", background: levelColor + "20", color: levelColor }}>
            {current.level}
          </span>
          <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6, marginTop: "0.875rem" }}>
            {current.definition}
          </p>
          {hint && (
            <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.5rem" }}>
              Starts with: <strong style={{ color: "#B08D57" }}>{current.word[0]}</strong> · {current.word.length} letters
            </p>
          )}
        </div>

        {/* Scrambled letters */}
        <div style={{
          background: feedback === "correct" ? "#E8F5E9" : feedback === "wrong" || feedback === "timeout" ? "#FFEBEE" : "var(--dark-3)",
          borderRadius: "16px", padding: "1rem", marginBottom: "1rem",
          border: `2px solid ${feedback === "correct" ? "#4CAF50" : feedback ? "#e53935" : "transparent"}`,
          textAlign: "center",
          transition: "all 0.2s",
        }}>
          <p style={{ fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Unscramble
          </p>
          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
            {scrambled.split("").map((ch, i) => (
              <span key={i} style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: "2rem", height: "2.5rem", borderRadius: "8px",
                background: "white", border: "1px solid rgba(0,0,0,0.1)",
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "1.3rem", fontWeight: 500, color: "var(--text)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
              }}>
                {ch.toUpperCase()}
              </span>
            ))}
          </div>
          {feedback === "correct" && <p style={{ fontSize: "0.85rem", color: "#2E7D32", marginTop: "0.5rem", fontWeight: 500 }}>✓ Correct!</p>}
          {(feedback === "wrong" || feedback === "timeout") && (
            <p style={{ fontSize: "0.85rem", color: "#c62828", marginTop: "0.5rem" }}>
              {feedback === "timeout" ? "Time's up! " : "Not quite! "}Answer: <strong>{current.word}</strong>
            </p>
          )}
        </div>

        {/* Input */}
        {!feedback && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => handleInput(e.target.value)}
              placeholder="Type the word..."
              autoComplete="off" autoCorrect="off" spellCheck={false}
              style={{
                flex: 1, border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: "12px",
                padding: "0.875rem 1rem", fontSize: "1rem", fontFamily: "DM Sans, sans-serif",
                background: "white", outline: "none", color: "var(--text)",
              }}
            />
            <button onClick={handleSkip} style={{
              border: "1.5px solid rgba(0,0,0,0.1)", borderRadius: "12px",
              background: "transparent", padding: "0.875rem 1rem",
              fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer",
            }}>Skip</button>
          </div>
        )}

        {/* Hint */}
        {!feedback && !hint && (
          <div style={{ textAlign: "center" }}>
            <button onClick={() => setHint(true)} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.75rem", color: "var(--text-dim)", textDecoration: "underline",
            }}>
              Show hint (no bonus)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
