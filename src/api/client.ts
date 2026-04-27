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
const STORE_KEY_CUSTOM_COURSES = "vn_custom_courses";

interface CustomCourseRecord extends Course {
  ownerId: string;
}

function loadCustomCourses(): CustomCourseRecord[] {
  const raw = localStorage.getItem(STORE_KEY_CUSTOM_COURSES);
  if (!raw) return [];
  try { return JSON.parse(raw) as CustomCourseRecord[]; } catch { return []; }
}
function saveCustomCourses(list: CustomCourseRecord[]) {
  localStorage.setItem(STORE_KEY_CUSTOM_COURSES, JSON.stringify(list));
}
function customCoursesFor(userId?: string): Course[] {
  if (!userId) return [];
  return loadCustomCourses()
    .filter((c) => c.ownerId === userId)
    .map(({ ownerId: _o, ...rest }) => rest);
}
function findCustomCourse(courseId: string): CustomCourseRecord | undefined {
  return loadCustomCourses().find((c) => c.id === courseId);
}

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
  async listCourses(filter: CourseFilter = {}, userId?: string): Promise<Course[]> {
    await wait();
    const q = filter.query?.trim().toLowerCase();
    const pool = [...MOCK_COURSES, ...customCoursesFor(userId)];
    return pool.filter((c) => {
      if (filter.sourceLang && c.sourceLang !== filter.sourceLang) return false;
      if (filter.targetLang && c.targetLang !== filter.targetLang) return false;
      if (q && !`${c.title} ${c.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  },

  async getCourse(id: string): Promise<Course | null> {
    await wait(180);
    const mock = MOCK_COURSES.find((c) => c.id === id);
    if (mock) return mock;
    const custom = findCustomCourse(id);
    if (!custom) return null;
    const { ownerId: _o, ...rest } = custom;
    return rest;
  },

  async listFlashcards(courseId: string): Promise<Flashcard[]> {
    await wait(220);
    return loadFlashcards().filter((c) => c.courseId === courseId);
  },

  async updateFlashcard(id: string, patch: Partial<Pick<Flashcard, "front" | "back" | "note" | "audioUrl">>): Promise<Flashcard> {
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
    const customs = customCoursesFor(userId);
    const pool = [...MOCK_COURSES, ...customs];
    return enrollments
      .map((e) => {
        const course = pool.find((c) => c.id === e.courseId);
        if (!course) return null;
        const progress = course.totalCards > 0
          ? Math.min(100, Math.round((e.completedCards / course.totalCards) * 100))
          : 0;
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

  async createCourse(
    userId: string,
    input: { title: string; description: string; sourceLang: LangCode; targetLang: LangCode; tag?: string },
    cards: Array<{ front: string; back: string; note?: string }>,
  ): Promise<Course> {
    await wait(220);
    const slug = input.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "deck";
    const id = `usr_${slug}_${Date.now().toString(36)}`;
    const filteredCards = cards
      .map((c) => ({ front: c.front.trim(), back: c.back.trim(), note: c.note?.trim() || undefined }))
      .filter((c) => c.front && c.back);

    const course: CustomCourseRecord = {
      id,
      ownerId: userId,
      title: input.title.trim(),
      description: input.description.trim(),
      sourceLang: input.sourceLang,
      targetLang: input.targetLang,
      totalCards: filteredCards.length,
      tag: input.tag?.trim() || "CUSTOM",
    };
    saveCustomCourses([...loadCustomCourses(), course]);

    const allCards = loadFlashcards();
    const newCards: Flashcard[] = filteredCards.map((c, i) => ({
      id: `${id}_c${i}_${Math.random().toString(36).slice(2, 7)}`,
      courseId: id,
      front: c.front,
      back: c.back,
      note: c.note,
      status: "new",
      correct: 0,
      total: 0,
    }));
    saveFlashcards([...allCards, ...newCards]);

    // Auto-enroll creator so it appears in My_Courses and is editable.
    const enrollments = loadEnrollments(userId);
    saveEnrollments(userId, [
      ...enrollments,
      { courseId: id, startedAt: new Date().toISOString(), completedCards: 0 },
    ]);

    const { ownerId: _o, ...rest } = course;
    return rest;
  },

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    return loadEnrollments(userId).some((e) => e.courseId === courseId);
  },

  async getEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
    return loadEnrollments(userId).find((e) => e.courseId === courseId) ?? null;
  },
};
