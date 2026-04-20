import type { Flashcard } from "@/types";
import type { LearnSettings, TestKind, Direction } from "./settings";

export type Dir = "f2b" | "b2f";

export interface Question {
  id: string;
  cardId: string;
  kind: TestKind;
  dir: Dir;
  prompt: string;          // shown to user
  answer: string;          // expected answer (normalized form held separately)
  promptLabel: string;     // "front" | "back"
  answerLabel: string;
  choices?: string[];      // for "choice"
  masked?: string;         // for "wheel": dashes for unrevealed letters
}

export interface CardProgress {
  cardId: string;
  correct: number;
  attempts: number;
  learned: boolean;        // hit correctToLearn threshold
}

export const norm = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function pickDirs(setting: Direction): Dir[] {
  if (setting === "f2b") return ["f2b"];
  if (setting === "b2f") return ["b2f"];
  return ["f2b", "b2f"];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function maskWord(s: string): string {
  return s.replace(/[^\s]/g, (c) => (/[a-zA-Z0-9]/.test(c) ? "_" : c));
}

function buildQuestion(
  card: Flashcard,
  dir: Dir,
  kind: TestKind,
  pool: Flashcard[],
  index: number,
): Question {
  const prompt = dir === "f2b" ? card.front : card.back;
  const answer = dir === "f2b" ? card.back : card.front;
  const promptLabel = dir === "f2b" ? "front" : "back";
  const answerLabel = dir === "f2b" ? "back" : "front";
  const base: Question = {
    id: `${card.id}_${dir}_${kind}_${index}`,
    cardId: card.id,
    kind,
    dir,
    prompt,
    answer,
    promptLabel,
    answerLabel,
  };
  if (kind === "choice") {
    const distractors = shuffle(
      pool.filter((c) => c.id !== card.id).map((c) => (dir === "f2b" ? c.back : c.front)),
    ).slice(0, 3);
    base.choices = shuffle([answer, ...distractors]);
  } else if (kind === "wheel") {
    base.masked = maskWord(answer);
  }
  return base;
}

/**
 * Build a session: split cards into batches, then for each batch generate
 * a few rounds of questions (mix directions × test kinds) until the round size
 * is filled or we cap at sessionSize.
 */
export function buildSession(allCards: Flashcard[], settings: LearnSettings) {
  const dirs = pickDirs(settings.direction);
  const kinds = settings.testKinds.length > 0 ? settings.testKinds : (["type"] as TestKind[]);

  // Take only the cards we'll actually study.
  // Each card can produce dirs.length questions; fill up to sessionSize.
  const cardsNeeded = Math.max(1, Math.ceil(settings.sessionSize / Math.max(1, dirs.length)));
  const studyCards = shuffle(allCards).slice(0, Math.min(allCards.length, cardsNeeded));

  // Split into batches.
  const batches: Flashcard[][] = [];
  for (let i = 0; i < studyCards.length; i += settings.batchSize) {
    batches.push(studyCards.slice(i, i + settings.batchSize));
  }

  const questions: Question[] = [];
  let qIdx = 0;
  outer: for (const batch of batches) {
    // For each batch, ask each card across all enabled directions, cycling kinds.
    for (const dir of dirs) {
      const order = shuffle(batch);
      for (const card of order) {
        const kind = kinds[qIdx % kinds.length];
        questions.push(buildQuestion(card, dir, kind, allCards, qIdx));
        qIdx++;
        if (questions.length >= settings.sessionSize) break outer;
      }
    }
  }

  return { studyCards, questions };
}

export function checkAnswer(q: Question, userInput: string): boolean {
  return norm(userInput) === norm(q.answer);
}
