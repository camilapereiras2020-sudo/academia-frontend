export const WORDS = [
  { word: "Ephemeral",     definition: "Lasting for a very short time",                         level: "C1", emoji: "🌸" },
  { word: "Resilient",     definition: "Able to recover quickly from difficulties",              level: "B2", emoji: "💪" },
  { word: "Ambiguous",     definition: "Open to more than one interpretation",                  level: "B2", emoji: "🤔" },
  { word: "Eloquent",      definition: "Fluent and persuasive in speaking or writing",          level: "B2", emoji: "🗣️" },
  { word: "Meticulous",    definition: "Showing great attention to detail",                     level: "B2", emoji: "🔍" },
  { word: "Pragmatic",     definition: "Dealing with things sensibly and practically",          level: "B2", emoji: "⚙️" },
  { word: "Innovative",    definition: "Introducing new ideas or methods",                      level: "B1", emoji: "💡" },
  { word: "Collaborate",   definition: "Work jointly with others",                              level: "B1", emoji: "🤝" },
  { word: "Sustainable",   definition: "Able to be maintained long-term",                       level: "B1", emoji: "🌱" },
  { word: "Perspective",   definition: "A particular way of thinking about something",          level: "B1", emoji: "👁️" },
  { word: "Consequence",   definition: "A result or effect of an action",                       level: "B1", emoji: "🔗" },
  { word: "Fundamental",   definition: "Of central importance; basic",                          level: "B1", emoji: "🏛️" },
  { word: "Extraordinary", definition: "Very unusual or remarkable",                            level: "A2", emoji: "⭐" },
  { word: "Volunteer",     definition: "Freely offer to do something",                          level: "A2", emoji: "🙋" },
  { word: "Environment",   definition: "The natural world around us",                           level: "A2", emoji: "🌍" },
  { word: "Communicate",   definition: "Share or exchange information",                         level: "A2", emoji: "💬" },
  { word: "Adventure",     definition: "An exciting or unusual experience",                     level: "A2", emoji: "🗺️" },
  { word: "Generous",      definition: "Willing to give more than expected",                    level: "A2", emoji: "💝" },
  { word: "Exacerbate",    definition: "Make a problem or situation worse",                     level: "C1", emoji: "📈" },
  { word: "Scrutinize",    definition: "Examine or inspect closely",                            level: "B2", emoji: "🧐" },
  { word: "Advocate",      definition: "Publicly recommend or support",                         level: "B2", emoji: "📢" },
  { word: "Mitigate",      definition: "Make less severe or serious",                           level: "B2", emoji: "🛡️" },
  { word: "Diligent",      definition: "Having a careful and persistent work ethic",            level: "B2", emoji: "📚" },
  { word: "Profound",      definition: "Very great or intense; having deep insight",            level: "B2", emoji: "🌊" },
]

export type Word = typeof WORDS[0]

export const LEVEL_COLORS: Record<string, string> = {
  A2: "#4CAF50", B1: "#2196F3", B2: "#9C27B0", C1: "#FF6B35",
}

export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}
