import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { LoadingGrid } from "@/components/LoadingGrid";
import { EmptyState } from "@/components/EmptyState";
import { useSettings } from "@/lib/settings";
import { buildSession, checkAnswer, type CardProgress, type Question } from "@/lib/session";
import { saveSession } from "@/lib/stats";
import { toast } from "sonner";
import { useAutoPlay } from "@/hooks/useAutoPlay";

type Phase = "preview" | "asking" | "done";

export default function StudySession() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings] = useSettings();

  useEffect(() => {
    if (!user) navigate(`/login?redirect=/courses/${id}/study`);
  }, [user, id, navigate]);

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ["course", id],
    queryFn: () => api.getCourse(id),
  });
  const { data: cards = [], isLoading: loadingCards } = useQuery({
    queryKey: ["flashcards", id],
    queryFn: () => api.listFlashcards(id),
  });

  const built = useMemo(() => {
    if (!cards.length) return null;
    return buildSession(cards, settings);
    // Build once per mount for stable session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length === 0]);

  const studyCards = built?.studyCards ?? [];
  const questions: Question[] = built?.questions ?? [];

  // Group questions into mini-batches of up to 2 distinct cards.
  // Within a mini-batch, all questions for those cards are asked before moving on.
  const miniBatches = useMemo(() => {
    const batches: { cardIds: string[]; questionIdxs: number[] }[] = [];
    const BATCH_CARDS = 2;
    let cur: { cardIds: string[]; questionIdxs: number[] } | null = null;
    questions.forEach((q, i) => {
      if (!cur) cur = { cardIds: [], questionIdxs: [] };
      if (!cur.cardIds.includes(q.cardId)) {
        if (cur.cardIds.length >= BATCH_CARDS) {
          batches.push(cur);
          cur = { cardIds: [q.cardId], questionIdxs: [i] };
          return;
        }
        cur.cardIds.push(q.cardId);
      }
      cur.questionIdxs.push(i);
    });
    if (cur && cur.questionIdxs.length) batches.push(cur);
    return batches;
  }, [questions]);

  const [phase, setPhase] = useState<Phase>("preview");
  const [batchIdx, setBatchIdx] = useState(0);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [progress, setProgress] = useState<Record<string, CardProgress>>({});
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<null | { ok: boolean; expected: string }>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAtRef = useRef<number>(Date.now());
  const savedRef = useRef(false);

  useEffect(() => {
    if (course) document.title = `Study // ${course.title}`;
  }, [course]);

  useEffect(() => {
    if (phase === "asking" && !feedback) inputRef.current?.focus();
  }, [phase, qIdx, feedback]);

  const totalQ = questions.length;
  const totalBatches = miniBatches.length;
  const curBatch = miniBatches[batchIdx];

  // Global Enter handler — advance to next window where it makes sense.
  // Skipped when focus is in a text input/textarea so typing answers still works.
  const advanceRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;
      const fn = advanceRef.current;
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Cards in current mini-batch that have NOT been answered yet → need preview.
  const previewCards = useMemo(() => {
    if (!curBatch) return [];
    return curBatch.cardIds
      .filter((cid) => !progress[cid]) // only cards never answered yet
      .map((cid) => studyCards.find((c) => c.id === cid))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }, [curBatch, studyCards, progress]);

  if (!user) return null;
  if (loadingCourse || loadingCards) return <LoadingGrid count={2} />;
  if (!course) return <EmptyState title="DECK_NOT_FOUND" description="Unknown deck." />;
  if (cards.length === 0) {
    return (
      <EmptyState
        title="EMPTY_DECK"
        description="Add cards before starting a session."
        action={<Button variant="cyber" onClick={() => navigate(`/courses/${id}`)}>Back_To_Deck</Button>}
      />
    );
  }

  const overallPct = phase === "done"
    ? 100
    : Math.round(((batchIdx) / Math.max(1, totalBatches)) * 100
        + (phase === "asking" && curBatch
            ? (curBatch.questionIdxs.indexOf(qIdx) + 1) / curBatch.questionIdxs.length / Math.max(1, totalBatches) * 100
            : 0));

  const learnedCount = Object.values(progress).filter((p) => p.learned).length;

  // ── PREVIEW PHASE ──
  if (phase === "preview") {
    // If no new cards to preview in this batch, jump straight to asking.
    if (previewCards.length === 0) {
      // Schedule a phase flip on next tick via effect-less guard:
      // setting state during render is unsafe, so use a microtask.
      queueMicrotask(() => {
        setPreviewIdx(0);
        if (curBatch) setQIdx(curBatch.questionIdxs[0]);
        setPhase("asking");
      });
      return <LoadingGrid count={1} />;
    }
    const card = previewCards[Math.min(previewIdx, previewCards.length - 1)];
    const advancePreview = () => {
      if (previewIdx + 1 < previewCards.length) setPreviewIdx(previewIdx + 1);
      else {
        setPreviewIdx(0);
        if (curBatch) setQIdx(curBatch.questionIdxs[0]);
        setPhase("asking");
      }
    };
    advanceRef.current = advancePreview;
    return (
      <SessionShell course={course.title} pct={overallPct} learned={learnedCount} total={studyCards.length}>
        <div className="cyber-panel corner-cuts p-6 md:p-10 space-y-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground text-center">
            preview // batch {batchIdx + 1}/{totalBatches} — card {previewIdx + 1}/{previewCards.length} — get familiar before the test
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PreviewSide label="FRONT" value={card.front} color="cyan" />
            <PreviewSide label="BACK" value={card.back} color="magenta" />
          </div>
          {card.note && (
            <div className="text-xs text-muted-foreground border-l-2 border-neon-cyan/40 pl-3 italic">
              {card.note}
            </div>
          )}
          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${id}`)}>
              Cancel
            </Button>
            <Button variant="cyber" onClick={advancePreview}>
              {previewIdx + 1 < previewCards.length ? "Next_Card" : "Begin_Test"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </SessionShell>
    );
  }

  // ── DONE PHASE ──
  if (phase === "done") {
    const correctTotal = Object.values(progress).reduce((a, p) => a + p.correct, 0);
    const attempts = Object.values(progress).reduce((a, p) => a + p.attempts, 0);
    const acc = attempts ? Math.round((correctTotal / attempts) * 100) : 0;
    advanceRef.current = () => navigate(`/courses/${id}`);
    return (
      <SessionShell course={course.title} pct={100} learned={learnedCount} total={studyCards.length}>
        <div className="cyber-panel corner-cuts p-8 space-y-6 text-center">
          <Sparkles className="h-10 w-10 text-neon-magenta mx-auto" />
          <h2 className="font-display text-3xl neon-text-cyan glitch">SESSION_COMPLETE</h2>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <Stat label="learned" value={`${learnedCount}/${studyCards.length}`} />
            <Stat label="accuracy" value={`${acc}%`} />
            <Stat label="answers" value={`${correctTotal}/${attempts}`} />
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate(`/courses/${id}`)}>Back_To_Deck</Button>
            <Button variant="cyber" onClick={() => window.location.reload()}>New_Session</Button>
          </div>
        </div>
      </SessionShell>
    );
  }

  // ── ASKING PHASE ──
  const q = questions[qIdx];
  // While feedback is shown, Enter advances to next question. Otherwise no-op
  // (per-question components handle their own submit, e.g. Enter in the type input).
  advanceRef.current = feedback ? () => next() : null;
  const submit = (raw: string) => {
    if (feedback) return;
    const ok = checkAnswer(q, raw, settings.caseSensitive);
    setFeedback({ ok, expected: q.answer });
    setProgress((prev) => {
      const cur = prev[q.cardId] ?? { cardId: q.cardId, correct: 0, attempts: 0, learned: false };
      const correct = cur.correct + (ok ? 1 : 0);
      const attempts = cur.attempts + 1;
      const learned = cur.learned || correct >= settings.correctToLearn;
      if (learned && !cur.learned && ok) toast.success(`Learned: ${q.answer}`);
      return { ...prev, [q.cardId]: { cardId: q.cardId, correct, attempts, learned } };
    });
  };

  const next = () => {
    setFeedback(null);
    setInput("");
    // Are we at the last question of the current mini-batch?
    const isLastInBatch = curBatch && qIdx === curBatch.questionIdxs[curBatch.questionIdxs.length - 1];
    if (!isLastInBatch) {
      setQIdx(qIdx + 1);
      return;
    }
    // Move to next mini-batch (preview phase) if any remain.
    if (batchIdx + 1 < totalBatches) {
      setBatchIdx(batchIdx + 1);
      setPreviewIdx(0);
      setPhase("preview");
      return;
    }
    // Otherwise — session done.
    if (!savedRef.current && course) {
      savedRef.current = true;
      const correctTotal = Object.values(progress).reduce((a, p) => a + p.correct, 0);
      const attempts = Object.values(progress).reduce((a, p) => a + p.attempts, 0);
      const learned = Object.values(progress).filter((p) => p.learned).length;
      saveSession({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: user?.id,
        courseId: course.id,
        courseTitle: course.title,
        finishedAt: new Date().toISOString(),
        totalCards: studyCards.length,
        learnedCards: learned,
        correct: correctTotal,
        attempts,
        durationSec: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
      });
    }
    setPhase("done");
  };

  return (
    <SessionShell course={course.title} pct={overallPct} learned={learnedCount} total={studyCards.length}>
      <div className="cyber-panel corner-cuts p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span>question {qIdx + 1} / {totalQ}</span>
          <span className="px-2 py-0.5 border border-neon-magenta/60 text-neon-magenta">
            {q.kind === "type" ? "type_answer" : q.kind === "choice" ? "multiple_choice" : q.kind === "wheel" ? "wheel_of_fortune" : "live_type"}
          </span>
          <span>{q.dir === "f2b" ? "front → back" : "back → front"}</span>
        </div>

        <div className="space-y-2 text-center">
          <div className="text-[10px] uppercase tracking-widest text-neon-cyan/70">{q.promptLabel}</div>
          <div className="font-display text-3xl md:text-4xl neon-text-cyan">{q.prompt}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground pt-1">
            translate to {q.answerLabel}
          </div>
        </div>

        {/* Question body */}
        {q.kind === "type" && (
          <form
            onSubmit={(e) => { e.preventDefault(); submit(input); }}
            className="space-y-3 max-w-md mx-auto w-full"
          >
            <Input
              ref={inputRef}
              autoFocus
              disabled={!!feedback}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="type your answer..."
              className="bg-input border-neon-cyan/40 font-display text-center text-lg h-12"
            />
            {!feedback && <Button type="submit" variant="cyber" className="w-full">Submit</Button>}
          </form>
        )}

        {q.kind === "choice" && (
          <ChoiceGrid
            key={q.id}
            choices={q.choices ?? []}
            disabled={!!feedback}
            picked={input}
            isCorrect={(c) => checkAnswer(q, c, settings.caseSensitive)}
            showFeedback={!!feedback}
            onPick={(c) => { setInput(c); submit(c); }}
          />
        )}

        {q.kind === "wheel" && (
          <WheelGame
            key={q.id}
            answer={q.answer}
            disabled={!!feedback}
            onSolve={(guess) => submit(guess)}
          />
        )}

        {q.kind === "live" && (
          <LiveTyper
            key={q.id}
            answer={q.answer}
            disabled={!!feedback}
            caseSensitive={settings.caseSensitive}
            onComplete={(guess) => submit(guess)}
          />
        )}

        {/* Feedback */}
        {feedback && (
          <div className="space-y-3">
            <div
              className={`flex items-center justify-center gap-2 font-display text-lg ${
                feedback.ok ? "text-neon-green" : "text-neon-red"
              }`}
            >
              {feedback.ok ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              {feedback.ok ? "CORRECT" : `WRONG — ${feedback.expected}`}
            </div>
            <div className="flex justify-center">
              <Button variant="cyber" onClick={next} autoFocus>
                {qIdx + 1 < totalQ ? "Next_Question" : "Finish_Session"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </SessionShell>
  );
}

function SessionShell({
  course, pct, learned, total, children,
}: { course: string; pct: number; learned: number; total: number; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">study_session</div>
            <h1 className="font-display text-xl md:text-2xl neon-text-cyan">{course}</h1>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-neon-magenta">
            {learned}/{total} learned
          </div>
        </div>
        <Progress value={pct} />
      </div>
      {children}
    </div>
  );
}

function PreviewSide({ label, value, color }: { label: string; value: string; color: "cyan" | "magenta" }) {
  const text = color === "cyan" ? "text-neon-cyan" : "text-neon-magenta";
  const border = color === "cyan" ? "border-neon-cyan/40" : "border-neon-magenta/60";
  return (
    <div className={`p-6 border ${border} space-y-2 text-center`}>
      <div className={`text-[10px] uppercase tracking-widest ${text}/80`}>{label}</div>
      <div className="font-display text-2xl md:text-3xl">{value}</div>
    </div>
  );
}

function ChoiceGrid({
  choices, disabled, picked, isCorrect, showFeedback, onPick,
}: {
  choices: string[];
  disabled: boolean;
  picked: string;
  isCorrect: (c: string) => boolean;
  showFeedback: boolean;
  onPick: (c: string) => void;
}) {
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const n = parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= choices.length) {
        e.preventDefault();
        onPick(choices[n - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choices, disabled, onPick]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
      {choices.map((c, i) => {
        const isPicked = showFeedback && c === picked;
        const correct = showFeedback && isCorrect(c);
        const cls = !showFeedback
          ? "border-border hover:border-neon-cyan/80"
          : correct
            ? "border-neon-green text-neon-green shadow-[0_0_12px_hsl(var(--neon-green)/0.4)]"
            : isPicked
              ? "border-neon-red text-neon-red"
              : "border-border opacity-60";
        return (
          <button
            key={c}
            disabled={disabled}
            onClick={() => onPick(c)}
            className={`p-4 border text-left font-display transition-colors flex items-center gap-3 ${cls}`}
          >
            <span
              className={`shrink-0 inline-flex items-center justify-center w-7 h-7 border text-xs font-display ${
                showFeedback
                  ? correct
                    ? "border-neon-green text-neon-green"
                    : isPicked
                      ? "border-neon-red text-neon-red"
                      : "border-border text-muted-foreground"
                  : "border-neon-magenta/70 text-neon-magenta shadow-[0_0_8px_hsl(var(--neon-magenta)/0.4)]"
              }`}
            >
              {i + 1}
            </span>
            <span className="flex-1">{c}</span>
          </button>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neon-cyan/40 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-xl neon-text-cyan">{value}</div>
    </div>
  );
}

/** Wheel of fortune-style: reveal letters one-by-one, user can guess word any time. */
function WheelGame({
  answer, disabled, onSolve,
}: { answer: string; disabled: boolean; onSolve: (guess: string) => void }) {
  const letters = useMemo(() => {
    // Indices of alphanumeric chars to reveal in order.
    const idx: number[] = [];
    answer.split("").forEach((c, i) => { if (/[a-zA-Z0-9]/.test(c)) idx.push(i); });
    // Shuffle so reveal order is random.
    const a = [...idx];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, [answer]);

  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [guess, setGuess] = useState("");

  const display = answer
    .split("")
    .map((c, i) => (revealed.has(i) || !/[a-zA-Z0-9]/.test(c) ? c : "_"))
    .join(" ");

  const reveal = () => {
    const next = letters.find((i) => !revealed.has(i));
    if (next === undefined) return;
    setRevealed(new Set([...revealed, next]));
  };

  const remaining = letters.length - revealed.size;

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="font-display text-2xl md:text-3xl text-center tracking-[0.3em] neon-text-magenta">
        {display}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); onSolve(guess); }}
        className="flex gap-2"
      >
        <Input
          autoFocus
          disabled={disabled}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="solve the word..."
          className="bg-input border-neon-cyan/40 font-display text-center"
        />
        {!disabled && (
          <>
            <Button type="button" variant="outline" onClick={reveal} disabled={remaining === 0}>
              Reveal ({remaining})
            </Button>
            <Button type="submit" variant="cyber">Solve</Button>
          </>
        )}
      </form>
      <p className="text-[10px] text-muted-foreground/70 text-center uppercase tracking-widest">
        each reveal costs nothing here — but solving without reveals is more satisfying
      </p>
    </div>
  );
}

/**
 * Live-typing input: only colored answer text with blinking cursor square at end.
 * No visible input line - just the feedback overlay.
 */
function LiveTyper({
  answer, disabled, onComplete, caseSensitive,
}: { answer: string; disabled: boolean; caseSensitive: boolean; onComplete: (guess: string) => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Normalization: remove diacritics and optionally lowercase
  const normalize = (s: string) => {
    const base = s.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return caseSensitive ? base : base.toLowerCase();
  };

  const normTarget = normalize(answer);

  // Per-character correctness based on normalized comparison
  const chars = value.split("");
  const normChars = normalize(value).split("");
  const allCorrectSoFar = normChars.every((c, i) => c === normTarget[i]);
  const fullyCorrect = allCorrectSoFar && normChars.length === normTarget.length;

  // Determine cursor color: green if empty or all correct so far, red if error
  const lastCharCorrect = value.length === 0 || allCorrectSoFar;

  useEffect(() => {
    if (fullyCorrect && !submittedRef.current && !disabled) {
      submittedRef.current = true;
      const t = setTimeout(() => onComplete(value), 180);
      return () => clearTimeout(t);
    }
  }, [fullyCorrect, disabled, onComplete, value]);

  return (
    <div className="space-y-3 max-w-xl mx-auto">
      <div className="relative">
        {/* Visual display with colored characters and blinking cursor */}
        <div
          className="font-display text-2xl md:text-3xl text-center tracking-[0.15em] min-h-[2.5rem] py-2 select-none cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {chars.length === 0 ? (
            <>
              <span className="text-muted-foreground/40 text-base tracking-widest uppercase">
                start typing...
              </span>
              <span
                className="inline-block w-3 h-3 ml-1 animate-pulse bg-neon-green"
                style={{ boxShadow: "0 0 8px hsl(var(--neon-green) / 0.8)" }}
              />
            </>
          ) : (
            <>
              {chars.map((c, i) => {
                const ok = normChars[i] === normTarget[i];
                return (
                  <span
                    key={i}
                    className={ok ? "text-neon-green" : "text-neon-red"}
                    style={{
                      textShadow: ok
                        ? "0 0 8px hsl(var(--neon-green) / 0.7)"
                        : "0 0 8px hsl(var(--neon-red) / 0.7)",
                    }}
                  >
                    {c === " " ? "\u00A0" : c}
                  </span>
                );
              })}
              {/* Blinking cursor square */}
              {!disabled && (
                <span
                  className={`inline-block w-3 h-3 ml-1 animate-pulse ${
                    lastCharCorrect ? "bg-neon-green" : "bg-neon-red"
                  }`}
                  style={{
                    boxShadow: lastCharCorrect
                      ? "0 0 10px hsl(var(--neon-green) / 0.9)"
                      : "0 0 10px hsl(var(--neon-red) / 0.9)",
                  }}
                />
              )}
            </>
          )}
        </div>
        {/* Hidden input - completely invisible, just captures keystrokes */}
        <input
          ref={inputRef}
          disabled={disabled}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!disabled) onComplete(value);
            }
          }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="absolute inset-0 w-full h-full opacity-0 cursor-text"
          style={{ caretColor: "transparent" }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/70 text-center uppercase tracking-widest">
        type the answer · green = correct · red = error
      </p>
    </div>
  );
}
