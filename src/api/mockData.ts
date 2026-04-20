import type { Course, Flashcard } from "@/types";

export const MOCK_COURSES: Course[] = [
  {
    id: "neuro_core_01",
    title: "NEURO_CORE_01",
    description: "Foundational Polish vocabulary for English speakers — daily life, food, travel.",
    sourceLang: "EN",
    targetLang: "PL",
    totalCards: 184,
    tag: "CORE",
  },
  {
    id: "vector_de_02",
    title: "VECTOR_DEUTSCH",
    description: "German essentials: greetings, numbers, common verbs and key phrases.",
    sourceLang: "EN",
    targetLang: "DE",
    totalCards: 142,
    tag: "BETA",
  },
  {
    id: "kanji_drift_03",
    title: "KANJI_DRIFT",
    description: "First 100 jōyō kanji with mnemonic recall paths and stroke order.",
    sourceLang: "EN",
    targetLang: "JP",
    totalCards: 100,
    tag: "ELITE",
  },
  {
    id: "noir_es_04",
    title: "NOIR_ESPAÑOL",
    description: "Conversational Spanish for the modern operator — bars, taxis, dates.",
    sourceLang: "EN",
    targetLang: "ES",
    totalCards: 220,
  },
  {
    id: "ghost_fr_05",
    title: "GHOST_FRANÇAIS",
    description: "Romance protocol: pronunciation drills and idiomatic French phrases.",
    sourceLang: "EN",
    targetLang: "FR",
    totalCards: 167,
  },
  {
    id: "pl_advanced_06",
    title: "PL_ADVANCED_GRID",
    description: "Polish grammar deep-dive: cases, aspects, and verbs of motion.",
    sourceLang: "EN",
    targetLang: "PL",
    totalCards: 312,
    tag: "HARD",
  },
  {
    id: "reverse_pl_07",
    title: "REVERSE_PROTOCOL",
    description: "Polish → English. Practice translating from your native into English.",
    sourceLang: "PL",
    targetLang: "EN",
    totalCards: 95,
  },
  {
    id: "de_business_08",
    title: "DE_BUSINESS_LINK",
    description: "German for business meetings, emails, and formal negotiations.",
    sourceLang: "EN",
    targetLang: "DE",
    totalCards: 128,
  },
];

const cardSeed: Record<string, Array<{ f: string; b: string; s?: Flashcard["status"]; n?: string }>> = {
  neuro_core_01: [
    { f: "Hello", b: "Cześć", s: "mastered" },
    { f: "Thank you", b: "Dziękuję", s: "mastered" },
    { f: "Good morning", b: "Dzień dobry", s: "reviewing" },
    { f: "Water", b: "Woda", s: "reviewing" },
    { f: "Bread", b: "Chleb", s: "learning" },
    { f: "Train station", b: "Dworzec kolejowy", s: "learning", n: "Masculine noun" },
    { f: "How much does it cost?", b: "Ile to kosztuje?", s: "new" },
    { f: "I don't understand", b: "Nie rozumiem", s: "new" },
  ],
  vector_de_02: [
    { f: "Hello", b: "Hallo", s: "mastered" },
    { f: "Goodbye", b: "Auf Wiedersehen", s: "reviewing" },
    { f: "Please", b: "Bitte", s: "learning" },
    { f: "Where is the bathroom?", b: "Wo ist die Toilette?", s: "new" },
  ],
  kanji_drift_03: [
    { f: "Person", b: "人 (ひと / hito)", s: "reviewing", n: "2 strokes" },
    { f: "Sun / Day", b: "日 (ひ / hi)", s: "learning" },
    { f: "Moon / Month", b: "月 (つき / tsuki)", s: "new" },
  ],
  noir_es_04: [
    { f: "Cheers!", b: "¡Salud!", s: "mastered" },
    { f: "Where is the metro?", b: "¿Dónde está el metro?", s: "learning" },
    { f: "I would like a coffee", b: "Quisiera un café", s: "new" },
  ],
  ghost_fr_05: [
    { f: "Good evening", b: "Bonsoir", s: "reviewing" },
    { f: "I love you", b: "Je t'aime", s: "mastered" },
    { f: "The check, please", b: "L'addition, s'il vous plaît", s: "new" },
  ],
  pl_advanced_06: [
    { f: "I am going (on foot)", b: "Idę", s: "learning", n: "Imperfective, present" },
    { f: "I am driving", b: "Jadę", s: "new", n: "Verb of motion — vehicle" },
  ],
  reverse_pl_07: [
    { f: "Książka", b: "Book", s: "mastered" },
    { f: "Samolot", b: "Airplane", s: "reviewing" },
  ],
  de_business_08: [
    { f: "Meeting", b: "Die Besprechung", s: "new" },
    { f: "Invoice", b: "Die Rechnung", s: "learning" },
  ],
};

export const MOCK_FLASHCARDS: Flashcard[] = Object.entries(cardSeed).flatMap(([courseId, list]) =>
  list.map((c, i) => ({
    id: `${courseId}_${String(i + 1).padStart(4, "0")}`,
    courseId,
    front: c.f,
    back: c.b,
    note: c.n,
    status: c.s ?? "new",
    correct: c.s === "mastered" ? 12 : c.s === "reviewing" ? 6 : c.s === "learning" ? 2 : 0,
    total: c.s === "mastered" ? 12 : c.s === "reviewing" ? 8 : c.s === "learning" ? 4 : 0,
  })),
);
