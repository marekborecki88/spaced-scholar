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
import { toast } from "sonner";

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

  const [phase, setPhase] = useState<Phase>("preview");
  const [previewIdx, setPreviewIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [progress, setProgress] = useState<Record<string, CardProgress>>({});
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<null | { ok: boolean; expected: string }>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (course) document.title = `Study // ${course.title}`;
  }, [course]);

  useEffect(() => {
    if (phase === "asking" && !feedback) inputRef.current?.focus();
  }, [phase, qIdx, feedback]);

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

  const totalQ = questions.length;
  const overallPct = phase === "done"
    ? 100
    : phase === "preview"
      ? Math.round(((previewIdx) / Math.max(1, studyCards.length)) * 15) // preview = first 15%
      : 15 + Math.round((qIdx / Math.max(1, totalQ)) * 85);

  const learnedCount = Object.values(progress).filter((p) => p.learned).length;

  // ── PREVIEW PHASE ──
  if (phase === "preview") {
    const card = studyCards[previewIdx];
    return (
      <SessionShell course={course.title} pct={overallPct} learned={learnedCount} total={studyCards.length}>
        <div className="cyber-panel corner-cuts p-6 md:p-10 space-y-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground text-center">
            preview // {previewIdx + 1} / {studyCards.length} — get familiar before the test
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
            <Button
              variant="cyber"
              onClick={() => {
                if (previewIdx + 1 < studyCards.length) setPreviewIdx(previewIdx + 1);
                else setPhase("asking");
              }}
            >
              {previewIdx + 1 < studyCards.length ? "Next_Card" : "Begin_Test"}
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
  const submit = (raw: string) => {
    if (feedback) return;
    const ok = checkAnswer(q, raw);
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
    if (qIdx + 1 < totalQ) setQIdx(qIdx + 1);
    else setPhase("done");
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {q.choices?.map((c) => {
              const picked = feedback && c === input;
              const isCorrect = feedback && checkAnswer(q, c);
              const cls = !feedback
                ? "border-border hover:border-neon-cyan/80"
                : isCorrect
                  ? "border-neon-green text-neon-green shadow-[0_0_12px_hsl(var(--neon-green)/0.4)]"
                  : picked
                    ? "border-neon-red text-neon-red"
                    : "border-border opacity-60";
              return (
                <button
                  key={c}
                  disabled={!!feedback}
                  onClick={() => { setInput(c); submit(c); }}
                  className={`p-4 border text-left font-display transition-colors ${cls}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
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
  answer, disabled, onComplete,
}: { answer: string; disabled: boolean; onComplete: (guess: string) => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const normTarget = answer.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Per-character correctness based on normalized comparison
  const chars = value.split("");
  const normChars = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split("");
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
