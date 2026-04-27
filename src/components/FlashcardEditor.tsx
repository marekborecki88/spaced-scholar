import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AudioPicker } from "@/components/AudioPicker";
import type { Flashcard } from "@/types";
import { api } from "@/api/client";
import { toast } from "sonner";

interface Props {
  card: Flashcard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (card: Flashcard) => void;
}

export function FlashcardEditor({ card, open, onOpenChange, onSaved }: Props) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [note, setNote] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setFront(card.front);
      setBack(card.back);
      setNote(card.note ?? "");
      setAudioUrl(card.audioUrl);
    }
  }, [card]);

  const save = async () => {
    if (!card) return;
    setSaving(true);
    try {
      const updated = await api.updateFlashcard(card.id, { front, back, note, audioUrl });
      onSaved(updated);
      toast.success("Card updated");
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to update card");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-neon-cyan/40">
        <SheetHeader>
          <SheetTitle className="font-display neon-text-cyan">EDIT_CARD</SheetTitle>
          <SheetDescription className="text-xs uppercase tracking-widest">
            ID // {card?.id}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-neon-cyan">Front</Label>
            <Input value={front} onChange={(e) => setFront(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-neon-magenta">Back</Label>
            <Input value={back} onChange={(e) => setBack(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
          </div>
          <AudioPicker value={audioUrl} onChange={setAudioUrl} label="back_audio (auto-plays)" />
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="cyber" onClick={save} disabled={saving || !front || !back}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
