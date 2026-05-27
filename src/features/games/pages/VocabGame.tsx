import { useState, useEffect, useCallback } from "react"

const WORDS = [
  { word: "Ephemeral", definition: "Lasting for a very short time", level: "C1", emoji: "🌸" },
  { word: "Resilient", definition: "Able to recover quickly from difficulties", level: "B2", emoji: "💪" },
  { word: "Ambiguous", definition: "Open to more than one interpretation", level: "B2", emoji: "🤔" },
  { word: "Eloquent", definition: "Fluent and persuasive in speaking or writing", level: "B2", emoji: "🗣️" },
  { word: "Meticulous", definition: "Showing great attention to detail", level: "B2", emoji: "🔍" },
  { word: "Pragmatic", definition: "Dealing with things sensibly and practically", level: "B2", emoji: "⚙️" },
  { word: "Innovative", definition: "Introducing new ideas or methods", level: "B1", emoji: "💡" },
  { word: "Collaborate", definition: "Work jointly with others", level: "B1", emoji: "🤝" },
  { word: "Sustainable", definition: "Able to be maintained long-term", level: "B1", emoji: "🌱" },
  { word: "Perspective", definition: "A particular way of thinking about something", level: "B1", emoji: "👁️" },
  { word: "Consequence", definition: "A result or effect of an action", level: "B1", emoji: "🔗" },
  { word: "Fundamental", definition: "Of central importance; basic", level: "B1", emoji: "🏛️" },
  { word: "Extraordinary", definition: "Very unusual or remarkable", level: "A2", emoji: "⭐" },
  { word: "Volunteer", definition: "Freely offer to do something", level: "A2", emoji: "🙋" },
  { word: "Environment", definition: "The natural world around us", level: "A2", emoji: "🌍" },
  { word: "Communicate", definition: "Share or exchange information", level: "A2", emoji: "💬" },
  { word: "Adventure", definition: "An exciting or unusual experience", level: "A2", emoji: "🗺️" },
  { word: "Generous", definition: "Willing to give more than expected", level: "A2", emoji: "💝" },
  { word: "Exacerbate", definition: "Make a problem or situation worse", level: "C1", emoji: "📈" },
  { word: "Scrutinize", definition: "Examine or inspect closely", level: "B2", emoji: "🧐" },
  { word: "Advocate", definition: "Publicly recommend or support", level: "B2", emoji: "📢" },
  { word: "Mitigate", definition: "Make less severe or serious", level: "B2", emoji: "🛡️" },
  { word: "Diligent", definition: "Having a careful and persistent work ethic", level: "B2", emoji: "📚" },
  { word: "Profound", definition: "Very great or intense; having deep insight", level: "B2", emoji: "🌊" },
]

const LEVEL_COLORS: Record<string, string> = {
  A2: "#4CAF50", B1: "#2196F3", B2: "#9C27B0", C1: "#FF6B35",
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function getOptions(correct: typeof WORDS[0], all: typeof WORDS) {
  const others = shuffle(all.filter(w => w.word !== correct.word)).slice(0, 3)
  return shuffle([correct, ...others])
}

type Screen = "menu" | "playing" | "result"

export default function VocabGame() {
  const [screen, setScreen] = useState<Screen>("menu")
  const [deck, setDeck] = useState<typeof WORDS>([])
  const [current, setCurrent] = useState(0)
  const [options, setOptions] = useState<typeof WORDS>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(15)
  const [showFeedback, setShowFeedback] = useState(false)
  const [filterLevel, setFilterLevel] = useState("ALL")

  const startGame = useCallback(() => {
    const filtered = filterLevel === "ALL" ? WORDS : WORDS.filter(w => w.level === filterLevel)
    const d = shuffle(filtered).slice(0, Math.min(10, filtered.length))
    setDeck(d)
    setCurrent(0)
    setScore(0)
    setStreak(0)
    setMaxStreak(0)
    setSelected(null)
    setShowFeedback(false)
    setTimeLeft(15)
    setOptions(getOptions(d[0], filtered))
    setScreen("playing")
  }, [filterLevel])

  useEffect(() => {
    if (screen !== "playing" || showFeedback) return
    if (timeLeft <= 0) {
      setShowFeedback(true)
      setStreak(0)
      setTimeout(() => nextQuestion(), 1500)
      return
    }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, screen, showFeedback])

  const nextQuestion = useCallback(() => {
    const next = current + 1
    if (next >= deck.length) { setScreen("result"); return }
    setCurrent(next)
    setSelected(null)
    setShowFeedback(false)
    setTimeLeft(15)
    const filtered = filterLevel === "ALL" ? WORDS : WORDS.filter(w => w.level === filterLevel)
    setOptions(getOptions(deck[next], filtered))
  }, [current, deck, filterLevel])

  const handleAnswer = (idx: number) => {
    if (selected !== null || showFeedback) return
    setSelected(idx)
    setShowFeedback(true)
    const correct = options[idx].word === deck[current].word
    if (correct) {
      const bonus = timeLeft > 10 ? 2 : 1
      setScore(s => s + bonus)
      setStreak(s => { const ns = s + 1; setMaxStreak(m => Math.max(m, ns)); return ns })
    } else {
      setStreak(0)
    }
    setTimeout(() => nextQuestion(), 1500)
  }

  const word = deck[current]
  const pct = deck.length > 0 ? (current / deck.length) * 100 : 0

  const containerStyle = {
    minHeight: "100vh", background: "var(--dark, #FAF8F5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "DM Sans, sans-serif", padding: "2rem",
  }

  if (screen === "menu") return (
    <div style={containerStyle}>
      <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📖</div>
        <h1 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "2.5rem", fontWeight: 300, color: "var(--text, #1A1714)", marginBottom: "0.5rem" }}>
          Vocab Challenge
        </h1>
        <p style={{ color: "var(--text-muted, #888)", fontSize: "0.9rem", marginBottom: "2rem" }}>
          Match the word to its definition. Race against the clock!
        </p>
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-dim, #aaa)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Select level</p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            {["ALL", "A2", "B1", "B2", "C1"].map(lvl => (
              <button key={lvl} onClick={() => setFilterLevel(lvl)} style={{
                padding: "0.4rem 1rem", borderRadius: "999px",
                border: filterLevel === lvl ? "2px solid #B08D57" : "1px solid rgba(0,0,0,0.1)",
                background: filterLevel === lvl ? "#B08D57" : "transparent",
                color: filterLevel === lvl ? "#fff" : "var(--text-muted, #888)",
                fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
              }}>{lvl}</button>
            ))}
          </div>
        </div>
        <button onClick={startGame} style={{
          background: "#B08D57", color: "#fff", border: "none", borderRadius: "12px",
          padding: "1rem 3rem", fontSize: "1rem", fontWeight: 500, cursor: "pointer", width: "100%",
        }}>Start Game →</button>
      </div>
    </div>
  )

  if (screen === "result") {
    const acc = Math.round((score / (deck.length * 2)) * 100)
    const msg = acc >= 80 ? "Outstanding! 🌟" : acc >= 60 ? "Well done! 👏" : acc >= 40 ? "Good effort! 💪" : "Keep practising! 📚"
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "5rem", marginBottom: "1rem" }}>{acc >= 80 ? "🏆" : acc >= 60 ? "⭐" : acc >= 40 ? "💪" : "📚"}</div>
          <h2 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "2rem", fontWeight: 300, color: "var(--text, #1A1714)", marginBottom: "0.5rem" }}>{msg}</h2>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", margin: "1.5rem 0", border: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[["Score", score], ["Questions", deck.length], ["Best streak", maxStreak], ["Accuracy", `${acc}%`]].map(([label, value]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.8rem", fontWeight: 600, color: "#B08D57" }}>{value}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim, #aaa)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={startGame} style={{ flex: 1, background: "#B08D57", color: "#fff", border: "none", borderRadius: "10px", padding: "0.875rem", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer" }}>Play again</button>
            <button onClick={() => setScreen("menu")} style={{ flex: 1, background: "transparent", color: "var(--text-muted, #888)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "10px", padding: "0.875rem", fontSize: "0.9rem", cursor: "pointer" }}>Menu</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark, #FAF8F5)", fontFamily: "DM Sans, sans-serif", padding: "1.5rem" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted, #888)" }}>{current + 1} / {deck.length}</span>
            {streak > 1 && <span style={{ background: "#FF6B35", color: "white", fontSize: "0.7rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "999px" }}>🔥 {streak}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#B08D57" }}>★ {score}</span>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: `3px solid ${timeLeft <= 5 ? "#e53935" : "#B08D57"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 600, color: timeLeft <= 5 ? "#e53935" : "var(--text, #1A1714)" }}>{timeLeft}</div>
          </div>
        </div>
        <div style={{ height: "3px", background: "rgba(0,0,0,0.08)", borderRadius: "999px", marginBottom: "1.5rem" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "#B08D57", borderRadius: "999px", transition: "width 0.3s" }} />
        </div>
        <div style={{ background: "white", borderRadius: "20px", padding: "2rem", marginBottom: "1.25rem", border: "1px solid rgba(0,0,0,0.08)", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>{word.emoji}</div>
          <div style={{ display: "inline-block", background: LEVEL_COLORS[word.level] + "20", color: LEVEL_COLORS[word.level], fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.2rem 0.6rem", borderRadius: "999px", marginBottom: "1rem" }}>{word.level}</div>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted, #888)", lineHeight: 1.6 }}>{word.definition}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {options.map((opt, idx) => {
            const isCorrect = opt.word === word.word
            const isSelected = selected === idx
            let bg = "white", border = "1px solid rgba(0,0,0,0.1)", color = "var(--text, #1A1714)"
            if (showFeedback) {
              if (isCorrect) { bg = "#E8F5E9"; border = "2px solid #4CAF50"; color = "#2E7D32" }
              else if (isSelected) { bg = "#FFEBEE"; border = "2px solid #e53935"; color = "#c62828" }
              else { color = "rgba(0,0,0,0.3)" }
            }
            return (
              <button key={idx} onClick={() => handleAnswer(idx)} style={{ background: bg, border, borderRadius: "12px", padding: "1rem", fontSize: "0.95rem", fontWeight: 500, color, cursor: showFeedback ? "default" : "pointer", transition: "all 0.2s", textAlign: "center", fontFamily: "DM Sans, sans-serif" }}>
                {opt.word}{showFeedback && isCorrect && " ✓"}{showFeedback && isSelected && !isCorrect && " ✗"}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
