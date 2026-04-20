import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Flashcard } from "@/types";

const STATUS_STYLE: Record<Flashcard["status"], string> = {
  new: "border-muted-foreground/40 text-muted-foreground",
  learning: "border-neon-magenta/60 text-neon-magenta",
  reviewing: "border-neon-cyan/60 text-neon-cyan",
  mastered: "border-neon-green/60 text-neon-green",
};

interface Props {
  card: Flashcard;
  canEdit: boolean;
  onEdit: () => void;
}

export function FlashcardRow({ card, canEdit, onEdit }: Props) {
  const pct = card.total ? Math.round((card.correct / card.total) * 100) : 0;
  return (
    <div className="cyber-panel corner-cuts p-4 flex flex-col gap-3 group">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          ID // {card.id}
        </div>
        <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 border ${STATUS_STYLE[card.status]}`}>
          {card.status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neon-cyan/70 mb-1">Front</div>
          <div className="font-display text-base">{card.front}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neon-magenta/80 mb-1">Back</div>
          <div className="font-display text-base">{card.back}</div>
        </div>
      </div>

      {card.note && (
        <div className="text-xs text-muted-foreground border-l-2 border-neon-cyan/40 pl-3 italic">
          {card.note}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex-1">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>recall_rate</span>
            <span>{card.correct}/{card.total || 0} · {pct}%</span>
          </div>
          <div className="h-1 bg-muted mt-1 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-magenta"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        )}
      </div>
    </div>
  );
}
