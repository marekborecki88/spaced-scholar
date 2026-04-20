import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Course } from "@/types";

interface Props {
  course: Course;
  enrolled?: boolean;
  progress?: number;
  onPrimary?: () => void;
  onManage?: () => void;
}

export function CourseCard({ course, enrolled, progress, onPrimary, onManage }: Props) {
  const navigate = useNavigate();
  const go = () => navigate(`/courses/${course.id}`);

  return (
    <div className="cyber-panel corner-cuts p-5 flex flex-col gap-4 group">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          DECK_ID // {course.id}
        </div>
        {course.tag && (
          <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 border border-neon-magenta/60 text-neon-magenta">
            {course.tag}
          </span>
        )}
      </div>

      <button onClick={go} className="text-left">
        <h3 className="font-display text-xl neon-text-cyan group-hover:glitch">
          {course.title}
        </h3>
      </button>

      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
        {course.description}
      </p>

      <div className="flex items-center gap-3 text-xs text-neon-cyan/80">
        <span className="px-2 py-0.5 border border-neon-cyan/40">{course.sourceLang}</span>
        <ArrowRight className="h-3 w-3" />
        <span className="px-2 py-0.5 border border-neon-magenta/60 text-neon-magenta">
          {course.targetLang}
        </span>
        <span className="ml-auto flex items-center gap-1 text-muted-foreground">
          <Layers className="h-3 w-3" /> {course.totalCards}
        </span>
      </div>

      {enrolled && typeof progress === "number" && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>progress</span>
            <span className="text-neon-magenta">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      <div className="mt-auto flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          variant={enrolled ? "magenta" : "cyber"}
          className="flex-1"
          onClick={onPrimary ?? go}
        >
          {enrolled ? "Continue_Learning" : "Start_Learning"}
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
        {enrolled && onManage && (
          <Button variant="outline" size="icon" onClick={onManage} title="Manage flashcards">
            <BookOpen className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
