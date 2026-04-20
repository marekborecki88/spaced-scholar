/**
 * API client layer.
 * Currently backed by in-memory mock data. Replace internals with `fetch` calls
 * to a real Spring Boot backend without changing call sites.
 *
 *   GET    /api/courses?sourceLang=&targetLang=
 *   GET    /api/courses/:id
 *   GET    /api/courses/:id/flashcards
 *   GET    /api/users/me/courses
 *   POST   /api/users/me/courses/:id  (enroll)
 *   PATCH  /api/flashcards/:id
 */
import type { Course, Enrollment, Flashcard, LangCode } from "@/types";
import { MOCK_COURSES, MOCK_FLASHCARDS } from "./mockData";

const STORE_KEY_FLASHCARDS = "vn_flashcards";
const STORE_KEY_ENROLLMENTS = "vn_enrollments";

const wait = (ms = 280) => new Promise((r) => setTimeout(r, ms));

function loadFlashcards(): Flashcard[] {
  const raw = localStorage.getItem(STORE_KEY_FLASHCARDS);
  if (raw) {
    try { return JSON.parse(raw) as Flashcard[]; } catch { /* ignore */ }
  }
  return [...MOCK_FLASHCARDS];
}
function saveFlashcards(cards: Flashcard[]) {
  localStorage.setItem(STORE_KEY_FLASHCARDS, JSON.stringify(cards));
}

function enrollKey(userId: string) {
  return `${STORE_KEY_ENROLLMENTS}:${userId}`;
}
function loadEnrollments(userId: string): Enrollment[] {
  const raw = localStorage.getItem(enrollKey(userId));
  if (!raw) return [];
  try { return JSON.parse(raw) as Enrollment[]; } catch { return []; }
}
function saveEnrollments(userId: string, list: Enrollment[]) {
  localStorage.setItem(enrollKey(userId), JSON.stringify(list));
}

export interface CourseFilter {
  sourceLang?: LangCode;
  targetLang?: LangCode;
  query?: string;
}

export const api = {
  async listCourses(filter: CourseFilter = {}): Promise<Course[]> {
    await wait();
    const q = filter.query?.trim().toLowerCase();
    return MOCK_COURSES.filter((c) => {
      if (filter.sourceLang && c.sourceLang !== filter.sourceLang) return false;
      if (filter.targetLang && c.targetLang !== filter.targetLang) return false;
      if (q && !`${c.title} ${c.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  },

  async getCourse(id: string): Promise<Course | null> {
    await wait(180);
    return MOCK_COURSES.find((c) => c.id === id) ?? null;
  },

  async listFlashcards(courseId: string): Promise<Flashcard[]> {
    await wait(220);
    return loadFlashcards().filter((c) => c.courseId === courseId);
  },

  async updateFlashcard(id: string, patch: Partial<Pick<Flashcard, "front" | "back" | "note">>): Promise<Flashcard> {
    await wait(180);
    const all = loadFlashcards();
    const idx = all.findIndex((c) => c.id === id);
    if (idx < 0) throw new Error("Flashcard not found");
    all[idx] = { ...all[idx], ...patch };
    saveFlashcards(all);
    return all[idx];
  },

  async myCourses(userId: string): Promise<Array<Course & { progress: number; enrollment: Enrollment }>> {
    await wait();
    const enrollments = loadEnrollments(userId);
    return enrollments
      .map((e) => {
        const course = MOCK_COURSES.find((c) => c.id === e.courseId);
        if (!course) return null;
        const progress = Math.min(100, Math.round((e.completedCards / course.totalCards) * 100));
        return { ...course, progress, enrollment: e };
      })
      .filter(Boolean) as Array<Course & { progress: number; enrollment: Enrollment }>;
  },

  async enroll(userId: string, courseId: string): Promise<Enrollment> {
    await wait(160);
    const list = loadEnrollments(userId);
    const existing = list.find((e) => e.courseId === courseId);
    if (existing) return existing;
    // Seed some progress so it feels alive.
    const course = MOCK_COURSES.find((c) => c.id === courseId);
    const seed = course ? Math.floor(course.totalCards * 0.08) : 0;
    const next: Enrollment = { courseId, startedAt: new Date().toISOString(), completedCards: seed };
    saveEnrollments(userId, [...list, next]);
    return next;
  },

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    return loadEnrollments(userId).some((e) => e.courseId === courseId);
  },

  async getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
    return loadEnrollments(userId).find((e) => e.courseId === courseId) ?? null;
  },
};
