export type LangCode = "EN" | "PL" | "DE" | "ES" | "FR" | "JP";

export type CardStatus = "new" | "learning" | "reviewing" | "mastered";

export interface Course {
  id: string;
  title: string;
  description: string;
  sourceLang: LangCode;
  targetLang: LangCode;
  totalCards: number;
  tag?: string;
}

export interface Flashcard {
  id: string;
  courseId: string;
  front: string;
  back: string;
  note?: string;
  status: CardStatus;
  correct: number;
  total: number;
}

export interface Enrollment {
  courseId: string;
  startedAt: string;
  completedCards: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}
