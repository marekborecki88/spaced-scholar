import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings, DEFAULT_SETTINGS, type TestKind, type Direction } from "@/lib/settings";
import { toast } from "sonner";

const TEST_LABELS: Record<TestKind, string> = {
  type: "Type_Answer",
  choice: "Multiple_Choice",
  wheel: "Wheel_Of_Fortune",
};

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "f2b", label: "Front → Back only" },
  { value: "b2f", label: "Back → Front only" },
  { value: "both", label: "Both directions" },
];

export default function Settings() {
  const [settings, setSettings] = useSettings();

  useEffect(() => {
    document.title = "Settings // VECTOR_NOIR";
  }, []);

  const update = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings({ ...settings, [key]: value });
  };

  const toggleKind = (k: TestKind) => {
    const has = settings.testKinds.includes(k);
    const next = has ? settings.testKinds.filter((x) => x !== k) : [...settings.testKinds, k];
    if (next.length === 0) {
      toast.error("At least one test type must be enabled");
      return;
    }
    update("testKinds", next);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">CONFIG_PANEL</div>
        <h1 className="font-display text-3xl md:text-4xl neon-text-cyan glitch">SESSION_SETTINGS</h1>
        <p className="text-sm text-muted-foreground">
          Tune your spaced-repetition engine. Changes apply to the next learning session.
        </p>
      </div>

      <section className="cyber-panel corner-cuts p-6 space-y-5">
        <h2 className="font-display text-lg neon-text-cyan">SESSION</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberField
            label="session_size"
            hint="Max questions per session"
            min={5}
            max={100}
            value={settings.sessionSize}
            onChange={(v) => update("sessionSize", v)}
          />
          <NumberField
            label="batch_size"
            hint="Cards introduced per round"
            min={2}
            max={10}
            value={settings.batchSize}
            onChange={(v) => update("batchSize", v)}
          />
          <NumberField
            label="correct_to_learn"
            hint="Correct answers to mark learned"
            min={1}
            max={10}
            value={settings.correctToLearn}
            onChange={(v) => update("correctToLearn", v)}
          />
        </div>
      </section>

      <section className="cyber-panel corner-cuts p-6 space-y-4">
        <h2 className="font-display text-lg neon-text-cyan">DIRECTION</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DIRECTIONS.map((d) => {
            const active = settings.direction === d.value;
            return (
              <button
                key={d.value}
                onClick={() => update("direction", d.value)}
                className={`p-3 border text-left text-xs uppercase tracking-widest transition-colors ${
                  active
                    ? "border-neon-cyan text-neon-cyan shadow-[0_0_12px_hsl(var(--neon-cyan)/0.4)]"
                    : "border-border text-muted-foreground hover:border-neon-cyan/60"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="cyber-panel corner-cuts p-6 space-y-4">
        <h2 className="font-display text-lg neon-text-cyan">TEST_TYPES</h2>
        <p className="text-xs text-muted-foreground">Pick which question formats appear during sessions.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(TEST_LABELS) as TestKind[]).map((k) => {
            const active = settings.testKinds.includes(k);
            return (
              <button
                key={k}
                onClick={() => toggleKind(k)}
                className={`p-3 border text-left text-xs uppercase tracking-widest transition-colors ${
                  active
                    ? "border-neon-magenta text-neon-magenta shadow-[0_0_12px_hsl(var(--neon-magenta)/0.4)]"
                    : "border-border text-muted-foreground hover:border-neon-magenta/60"
                }`}
              >
                {TEST_LABELS[k]}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setSettings(DEFAULT_SETTINGS)}>
          Reset_Defaults
        </Button>
      </div>
    </div>
  );
}

function NumberField({
  label, hint, min, max, value, onChange,
}: { label: string; hint: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        className="bg-input border-neon-cyan/40 font-display"
      />
      <p className="text-[10px] text-muted-foreground/70">{hint}</p>
    </div>
  );
}
