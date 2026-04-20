import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { CourseCard } from "@/components/CourseCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingGrid } from "@/components/LoadingGrid";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/auth/AuthContext";
import type { LangCode } from "@/types";

const LANGS: Array<LangCode | "ALL"> = ["ALL", "EN", "PL", "DE", "ES", "FR", "JP"];

export default function AllCourses() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [src, setSrc] = useState<LangCode | "ALL">("ALL");
  const [tgt, setTgt] = useState<LangCode | "ALL">("ALL");

  useEffect(() => {
    document.title = "All Courses // VECTOR_NOIR";
  }, []);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses", src, tgt, query, user?.id],
    queryFn: () =>
      api.listCourses({
        sourceLang: src === "ALL" ? undefined : src,
        targetLang: tgt === "ALL" ? undefined : tgt,
        query,
      }, user?.id),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["my-courses", user?.id],
    queryFn: () => (user ? api.myCourses(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const enrollMap = useMemo(() => new Map(enrollments.map((e) => [e.id, e])), [enrollments]);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          STATUS // BROWSING_GRID
        </div>
        <h1 className="font-display text-4xl md:text-6xl neon-text-cyan glitch">ALL_COURSES</h1>
        <div className="h-px bg-gradient-to-r from-neon-cyan via-neon-magenta to-transparent" />
        <p className="text-sm text-muted-foreground max-w-2xl">
          Browse the full deck library. Filter by source and target language. Enroll to begin a spaced-repetition session.
        </p>
      </header>

      <div className="cyber-panel corner-cuts p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neon-cyan" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search_courses..."
            className="pl-9 bg-input/50 border-neon-cyan/40 focus-visible:ring-neon-cyan font-mono"
          />
        </div>
        <div className="md:col-span-3">
          <Select value={src} onValueChange={(v) => setSrc(v as LangCode | "ALL")}>
            <SelectTrigger className="bg-input/50 border-neon-cyan/40 uppercase text-xs tracking-widest">
              <SelectValue placeholder="source_lang" />
            </SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => (
                <SelectItem key={l} value={l}>SOURCE: {l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <Select value={tgt} onValueChange={(v) => setTgt(v as LangCode | "ALL")}>
            <SelectTrigger className="bg-input/50 border-neon-magenta/60 uppercase text-xs tracking-widest text-neon-magenta">
              <SelectValue placeholder="target_lang" />
            </SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => (
                <SelectItem key={l} value={l}>TARGET: {l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingGrid />
      ) : courses.length === 0 ? (
        <EmptyState
          title="NO_RESULTS"
          description="No decks match the current filters. Try widening your search."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c) => {
            const enrolled = enrollMap.get(c.id);
            return (
              <CourseCard
                key={c.id}
                course={c}
                enrolled={!!enrolled}
                progress={enrolled?.progress}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
