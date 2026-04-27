import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LangCode } from "@/types";
import { AudioPicker } from "@/components/AudioPicker";

const LANGS: LangCode[] = ["EN", "PL", "DE", "ES", "FR", "JP"];

interface CardDraft {
  key: string;
  front: string;
  back: string;
  note: string;
  audioUrl?: string;
}

const newCard = (): CardDraft => ({
  key: Math.random().toString(36).slice(2, 9),
  front: "",
  back: "",
  note: "",
  audioUrl: undefined,
});

export default function NewCourse() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceLang, setSourceLang] = useState<LangCode>("EN");
  const [targetLang, setTargetLang] = useState<LangCode>("PL");
  const [tag, setTag] = useState("");
  const [cards, setCards] = useState<CardDraft[]>([newCard(), newCard(), newCard()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Create Deck // VECTOR_NOIR";
    if (!user) navigate("/login?redirect=/courses/new", { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const updateCard = (key: string, patch: Partial<CardDraft>) =>
    setCards((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const removeCard = (key: string) =>
    setCards((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev));
  const addCard = () => setCards((prev) => [...prev, newCard()]);

  const validCards = cards.filter((c) => c.front.trim() && c.back.trim());
  const validationIssues: string[] = [];
  if (title.trim().length < 2) validationIssues.push("title must be ≥ 2 chars");
  if (description.trim().length < 4) validationIssues.push("description must be ≥ 4 chars");
  if (validCards.length < 1) validationIssues.push("add at least 1 card with front + back");
  const canSubmit = validationIssues.length === 0;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const course = await api.createCourse(
        user.id,
        { title, description, sourceLang, targetLang, tag },
        validCards.map((c) => ({ front: c.front, back: c.back, note: c.note, audioUrl: c.audioUrl })),
      );
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["my-courses", user.id] });
      toast.success("Deck deployed", { description: `${course.totalCards} cards committed to memory.` });
      navigate(`/courses/${course.id}`);
    } catch {
      toast.error("Deploy failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <button
          onClick={() => navigate(-1)}
          className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-neon-cyan inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> back
        </button>
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          OPERATOR // {user.name} // NEW_DECK
        </div>
        <h1 className="font-display text-4xl md:text-6xl neon-text-magenta glitch">CREATE_DECK</h1>
        <div className="h-px bg-gradient-to-r from-neon-magenta via-neon-cyan to-transparent" />
      </header>

      <section className="cyber-panel corner-cuts p-6 space-y-5">
        <div className="text-[10px] uppercase tracking-[0.3em] text-neon-cyan">// metadata</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title" className="text-[10px] uppercase tracking-widest text-muted-foreground">
              deck_title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. STREET_SLANG_42"
              className="bg-input/50 border-neon-cyan/40 focus-visible:ring-neon-cyan font-mono"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="desc" className="text-[10px] uppercase tracking-widest text-muted-foreground">
              description
            </Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this deck cover?"
              className="bg-input/50 border-neon-cyan/40 focus-visible:ring-neon-cyan font-mono min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">source_lang</Label>
            <Select value={sourceLang} onValueChange={(v) => setSourceLang(v as LangCode)}>
              <SelectTrigger className="bg-input/50 border-neon-cyan/40 uppercase text-xs tracking-widest">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGS.map((l) => (
                  <SelectItem key={l} value={l}>SOURCE: {l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">target_lang</Label>
            <Select value={targetLang} onValueChange={(v) => setTargetLang(v as LangCode)}>
              <SelectTrigger className="bg-input/50 border-neon-magenta/60 uppercase text-xs tracking-widest text-neon-magenta">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGS.map((l) => (
                  <SelectItem key={l} value={l}>TARGET: {l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tag" className="text-[10px] uppercase tracking-widest text-muted-foreground">
              tag (optional)
            </Label>
            <Input
              id="tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="CORE / BETA / CUSTOM..."
              className="bg-input/50 border-neon-cyan/40 focus-visible:ring-neon-cyan font-mono"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl md:text-2xl neon-text-cyan">FLASHCARDS</h2>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {validCards.length} / {cards.length} valid
          </span>
        </div>

        <div className="space-y-3">
          {cards.map((card, idx) => (
            <div key={card.key} className="cyber-panel corner-cuts p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.3em] text-neon-cyan">
                  card_{String(idx + 1).padStart(3, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => removeCard(card.key)}
                  disabled={cards.length === 1}
                  className="text-muted-foreground hover:text-neon-red disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Remove card"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    front ({sourceLang})
                  </Label>
                  <Input
                    value={card.front}
                    onChange={(e) => updateCard(card.key, { front: e.target.value })}
                    className="bg-input/50 border-neon-cyan/40 focus-visible:ring-neon-cyan font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    back ({targetLang})
                  </Label>
                  <Input
                    value={card.back}
                    onChange={(e) => updateCard(card.key, { back: e.target.value })}
                    className="bg-input/50 border-neon-magenta/60 focus-visible:ring-neon-magenta font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">note</Label>
                <Input
                  value={card.note}
                  onChange={(e) => updateCard(card.key, { note: e.target.value })}
                  placeholder="optional mnemonic..."
                  className="bg-input/30 border-border focus-visible:ring-neon-cyan font-mono"
                />
              </div>
              <AudioPicker
                value={card.audioUrl}
                onChange={(url) => updateCard(card.key, { audioUrl: url })}
                label="back_audio (auto-plays)"
              />
            </div>
          ))}
        </div>

        <Button variant="ghost" onClick={addCard} className="w-full border border-dashed border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/5">
          <Plus className="mr-2 h-4 w-4" /> Add_Card
        </Button>
      </section>

      <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3">
        <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
        <HoverCard openDelay={100} closeDelay={50}>
          <HoverCardTrigger asChild>
            {/* span wrapper so hover works while button is disabled */}
            <span className="inline-block">
              <Button
                variant="cyber"
                size="lg"
                disabled={!canSubmit || saving}
                onClick={handleSubmit}
                className={!canSubmit ? "pointer-events-none" : ""}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Deploying..." : "Deploy_Deck"}
              </Button>
            </span>
          </HoverCardTrigger>
          {!canSubmit && (
            <HoverCardContent
              side="top"
              align="end"
              className="w-72 border-neon-magenta/50 bg-background/95 font-mono"
            >
              <div className="text-[10px] uppercase tracking-[0.3em] text-neon-magenta mb-2">
                // missing_requirements
              </div>
              <ul className="space-y-1 text-xs text-foreground/90">
                {validationIssues.map((msg) => (
                  <li key={msg} className="flex gap-2">
                    <span className="text-neon-cyan">›</span>
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
            </HoverCardContent>
          )}
        </HoverCard>
      </div>
    </div>
  );
}
