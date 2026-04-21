// Local persistence of session results, used by the /stats view.

export interface SessionRecord {
  id: string;
  userId?: string;
  courseId: string;
  courseTitle: string;
  finishedAt: string;        // ISO date
  totalCards: number;
  learnedCards: number;
  correct: number;
  attempts: number;
  durationSec: number;
}

const KEY = "vn_session_history";

export function loadSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionRecord[];
  } catch {
    return [];
  }
}

export function saveSession(s: SessionRecord) {
  const list = loadSessions();
  list.push(s);
  // Cap history to last 500 records.
  const trimmed = list.slice(-500);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent("vn:stats-changed"));
}

export function clearSessions() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("vn:stats-changed"));
}

export interface StatsSummary {
  totalSessions: number;
  totalAnswers: number;
  totalCorrect: number;
  accuracy: number;          // 0..100
  totalLearned: number;
  totalMinutes: number;
  byDay: { date: string; sessions: number; correct: number; attempts: number }[];
  byCourse: {
    courseId: string;
    courseTitle: string;
    sessions: number;
    correct: number;
    attempts: number;
    learned: number;
  }[];
}

export function summarize(records: SessionRecord[]): StatsSummary {
  const totalAnswers = records.reduce((a, r) => a + r.attempts, 0);
  const totalCorrect = records.reduce((a, r) => a + r.correct, 0);
  const totalLearned = records.reduce((a, r) => a + r.learnedCards, 0);
  const totalSeconds = records.reduce((a, r) => a + r.durationSec, 0);

  const dayMap = new Map<string, { sessions: number; correct: number; attempts: number }>();
  for (const r of records) {
    const day = r.finishedAt.slice(0, 10);
    const cur = dayMap.get(day) ?? { sessions: 0, correct: 0, attempts: 0 };
    cur.sessions += 1;
    cur.correct += r.correct;
    cur.attempts += r.attempts;
    dayMap.set(day, cur);
  }
  const byDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, ...v }));

  const courseMap = new Map<string, StatsSummary["byCourse"][number]>();
  for (const r of records) {
    const cur =
      courseMap.get(r.courseId) ??
      { courseId: r.courseId, courseTitle: r.courseTitle, sessions: 0, correct: 0, attempts: 0, learned: 0 };
    cur.sessions += 1;
    cur.correct += r.correct;
    cur.attempts += r.attempts;
    cur.learned += r.learnedCards;
    cur.courseTitle = r.courseTitle;
    courseMap.set(r.courseId, cur);
  }
  const byCourse = Array.from(courseMap.values()).sort((a, b) => b.sessions - a.sessions);

  return {
    totalSessions: records.length,
    totalAnswers,
    totalCorrect,
    accuracy: totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0,
    totalLearned,
    totalMinutes: Math.round(totalSeconds / 60),
    byDay,
    byCourse,
  };
}
