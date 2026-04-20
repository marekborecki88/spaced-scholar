import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Lock, Play } from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FlashcardRow } from "@/components/FlashcardRow";
import { FlashcardEditor } from "@/components/FlashcardEditor";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import type { Flashcard } from "@/types";
import { toast } from "sonner";

export default function CourseView() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState<Flashcard | null>(null);

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ["course", id],
    queryFn: () => api.getCourse(id),
  });

  const { data: cards = [], isLoading: loadingCards } = useQuery({
    queryKey: ["flashcards", id],
    queryFn: () => api.listFlashcards(id),
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", user?.id, id],
    queryFn: () => (user ? api.getEnrollment(user.id, id) : Promise.resolve(null)),
    enabled: !!user,
  });

  useEffect(() => {
    if (course) document.title = `${course.title} // VECTOR_NOIR`;
  }, [course]);

  const progress = useMemo(() => {
    if (!course || !enrollment) return 0;
    return Math.min(100, Math.round((enrollment.completedCards / course.totalCards) * 100));
  }, [course, enrollment]);

  const enrolled = !!enrollment;
  const canEdit = !!user && enrolled;

  const handleStart = async () => {
    if (!user) {
      navigate(`/login?redirect=/courses/${id}`);
      return;
    }
    if (!enrolled) {
      await api.enroll(user.id, id);
      qc.invalidateQueries({ queryKey: ["enrollment", user.id, id] });
      qc.invalidateQueries({ queryKey: ["my-courses", user.id] });
      toast.success("Enrolled — neural link engaged");
    } else {
      toast.message("Session_continued", { description: "Spaced repetition queue resumed." });
    }
  };

  const onCardSaved = (updated: Flashcard) => {
    qc.setQueryData<Flashcard[]>(["flashcards", id], (prev) =>
      prev?.map((c) => (c.id === updated.id ? updated : c)) ?? prev,
    );
  };

  if (loadingCourse) return <LoadingGrid count={3} />;
  if (!course) {
    return (
      <EmptyState
        title="DECK_NOT_FOUND"
        description="This course ID is not in the registry."
        action={<Button variant="cyber" onClick={() => navigate("/")}>Back_To_All</Button>}
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="cyber-panel corner-cuts p-6 md:p-8 space-y-5">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          DECK_ID // {course.id}
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-3">
            <h1 className="font-display text-3xl md:text-5xl neon-text-cyan glitch">
              {course.title}
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">{course.description}</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2 py-0.5 border border-neon-cyan/40 text-neon-cyan">{course.sourceLang}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="px-2 py-0.5 border border-neon-magenta/60 text-neon-magenta">{course.targetLang}</span>
              <span className="text-muted-foreground">// {course.totalCards} cards</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 min-w-[260px]">
            {user && enrolled && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>course_progress</span>
                  <span className="text-neon-magenta">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
            <Button variant="cyber" size="lg" onClick={handleStart}>
              {!user ? (
                <><Lock className="mr-2 h-4 w-4" /> Login_To_Start</>
              ) : enrolled ? (
                <><Play className="mr-2 h-4 w-4" /> Continue_Learning</>
              ) : (
                <><Play className="mr-2 h-4 w-4" /> Start_Learning</>
              )}
            </Button>
            {!user && (
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center">
                read_only_mode // login_required_for_session
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl md:text-2xl neon-text-cyan">
            CARDS_FOR_REVIEW
          </h2>
          {editMode && canEdit && (
            <span className="text-[10px] uppercase tracking-widest text-neon-magenta border border-neon-magenta/60 px-2 py-0.5">
              EDIT_MODE
            </span>
          )}
        </div>

        {loadingCards ? (
          <LoadingGrid count={4} />
        ) : cards.length === 0 ? (
          <EmptyState title="NO_CARDS" description="This deck is empty." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card) => (
              <FlashcardRow
                key={card.id}
                card={card}
                canEdit={canEdit}
                onEdit={() => setEditing(card)}
              />
            ))}
          </div>
        )}
      </section>

      <FlashcardEditor
        card={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={onCardSaved}
      />
    </div>
  );
}
