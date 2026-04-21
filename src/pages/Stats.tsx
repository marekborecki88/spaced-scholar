import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Trash2, Trophy, Target, Flame, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { clearSessions, loadSessions, summarize, type SessionRecord } from "@/lib/stats";

export default function Stats() {
  const [records, setRecords] = useState<SessionRecord[]>(() => loadSessions());

  useEffect(() => {
    document.title = "Stats // VECTOR_NOIR";
    const refresh = () => setRecords(loadSessions());
    window.addEventListener("vn:stats-changed", refresh);
    return () => window.removeEventListener("vn:stats-changed", refresh);
  }, []);

  const summary = summarize(records);

  if (records.length === 0) {
    return (
      <EmptyState
        title="NO_DATA_YET"
        description="Finish a study session to populate your stats."
        action={
          <Button variant="cyber" asChild>
            <Link to="/my-courses">Go_To_My_Courses</Link>
          </Button>
        }
      />
    );
  }

  // Recent sessions, newest first.
  const recent = [...records].reverse().slice(0, 10);

  // Day chart — last 14 days.
  const last14 = summary.byDay.slice(-14);
  const maxAttempts = Math.max(1, ...last14.map((d) => d.attempts));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl neon-text-cyan glitch flex items-center gap-2">
            <BarChart3 className="h-7 w-7" /> STATS_PANEL
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mt-1">
            telemetry from your study sessions
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm("Clear all stats history?")) clearSessions();
          }}
          className="text-neon-red hover:text-neon-red"
        >
          <Trash2 className="mr-1 h-4 w-4" /> Clear_History
        </Button>
      </header>

      {/* Summary grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={<Flame className="h-4 w-4" />} label="sessions" value={summary.totalSessions} />
        <StatTile icon={<Target className="h-4 w-4" />} label="accuracy" value={`${summary.accuracy}%`} />
        <StatTile icon={<Trophy className="h-4 w-4" />} label="learned" value={summary.totalLearned} />
        <StatTile icon={<Clock className="h-4 w-4" />} label="minutes" value={summary.totalMinutes} />
      </section>

      {/* Activity chart */}
      <section className="cyber-panel corner-cuts p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm uppercase tracking-[0.3em] text-neon-cyan">
            activity // last_14_days
          </h2>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            answers per day
          </span>
        </div>
        <div className="flex items-end gap-1.5 h-40">
          {last14.length === 0 && (
            <div className="text-xs text-muted-foreground">No activity yet.</div>
          )}
          {last14.map((d) => {
            const h = Math.max(4, Math.round((d.attempts / maxAttempts) * 100));
            const acc = d.attempts ? Math.round((d.correct / d.attempts) * 100) : 0;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full bg-neon-cyan/20 border border-neon-cyan/60 hover:bg-neon-cyan/40 transition-colors relative"
                  style={{ height: `${h}%` }}
                  title={`${d.date} — ${d.correct}/${d.attempts} (${acc}%)`}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-neon-magenta/40"
                    style={{ height: `${acc}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                  {d.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 text-[10px] uppercase tracking-widest text-muted-foreground pt-2">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-neon-cyan/40 border border-neon-cyan/60" /> attempts
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-neon-magenta/40" /> accuracy
          </span>
        </div>
      </section>

      {/* By course */}
      <section className="cyber-panel corner-cuts p-5 md:p-6 space-y-3">
        <h2 className="font-display text-sm uppercase tracking-[0.3em] text-neon-cyan">
          by_deck
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-neon-cyan/20">
                <th className="text-left py-2">deck</th>
                <th className="text-right py-2">sessions</th>
                <th className="text-right py-2">accuracy</th>
                <th className="text-right py-2">learned</th>
              </tr>
            </thead>
            <tbody>
              {summary.byCourse.map((c) => {
                const acc = c.attempts ? Math.round((c.correct / c.attempts) * 100) : 0;
                return (
                  <tr key={c.courseId} className="border-b border-border/40">
                    <td className="py-2">
                      <Link
                        to={`/courses/${c.courseId}`}
                        className="text-neon-cyan hover:underline"
                      >
                        {c.courseTitle}
                      </Link>
                    </td>
                    <td className="text-right py-2">{c.sessions}</td>
                    <td className="text-right py-2 text-neon-magenta">{acc}%</td>
                    <td className="text-right py-2">{c.learned}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent sessions */}
      <section className="cyber-panel corner-cuts p-5 md:p-6 space-y-3">
        <h2 className="font-display text-sm uppercase tracking-[0.3em] text-neon-cyan">
          recent_sessions
        </h2>
        <ul className="divide-y divide-border/40">
          {recent.map((r) => {
            const acc = r.attempts ? Math.round((r.correct / r.attempts) * 100) : 0;
            return (
              <li key={r.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <Link
                    to={`/courses/${r.courseId}`}
                    className="text-neon-cyan hover:underline block truncate"
                  >
                    {r.courseTitle}
                  </Link>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {new Date(r.finishedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                  <span>{r.correct}/{r.attempts}</span>
                  <span className="text-neon-magenta">{acc}%</span>
                  <span>{r.learnedCards}/{r.totalCards} learned</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="cyber-panel corner-cuts p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <span className="text-neon-cyan">{icon}</span>
        {label}
      </div>
      <div className="font-display text-2xl neon-text-magenta">{value}</div>
    </div>
  );
}
