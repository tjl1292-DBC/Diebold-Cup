"use client";

import { useState } from "react";
import Link from "next/link";

interface Table {
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
  href?: string;
}
interface Evidence {
  tool: string;
  input: unknown;
  result: { summary: string; tables: Table[]; notes?: string[] };
}
interface Exchange {
  question: string;
  answer: string;
  evidence: Evidence[];
  error?: string;
}

const EXAMPLES = [
  "Who has won the most titles?",
  "What is Malcolm Spatz's career record?",
  "Who won in 2019 and by how much?",
  "Best singles average with at least 20 matches",
  "Lowest gross ever recorded",
  "Which partnership has the best record for Longue Vue?",
];

export function AskClient({ enabled }: { enabled: boolean }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Exchange[]>([]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setQ("");
    const history = log.slice(-3).flatMap((x) => (x.answer ? [{ role: "user", content: x.question }, { role: "assistant", content: x.answer }] : []));
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, history }) });
      const data = (await res.json()) as { answer: string; evidence: Evidence[]; error?: string };
      setLog((l) => [...l, { question, answer: data.answer, evidence: data.evidence ?? [], error: data.error }]);
    } catch {
      setLog((l) => [...l, { question, answer: "", evidence: [], error: "Could not reach the server." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      {!enabled && (
        <p className="mb-4 rounded border border-brass bg-brass-soft px-4 py-3 text-sm text-ink">
          The question box is not switched on yet. It needs an Anthropic API key on the server (the <code>ANTHROPIC_API_KEY</code> setting). Everything else on the site works without it.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex"
      >
        <label htmlFor="ask-q" className="sr-only">
          Your question
        </label>
        <input
          id="ask-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. How did Oakmont do in 2015?"
          disabled={!enabled || busy}
          className="w-full rounded-l border border-line bg-paper px-4 py-3 text-lg text-ink placeholder:text-ink-3 disabled:opacity-60"
        />
        <button type="submit" disabled={!enabled || busy} className="rounded-r bg-accent px-5 font-semibold text-white disabled:opacity-60">
          {busy ? "Looking…" : "Ask"}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" disabled={!enabled || busy} onClick={() => ask(ex)} className="rounded-full border border-line bg-paper px-3 py-1 text-sm hover:border-accent disabled:opacity-60">
            {ex}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-8">
        {[...log].reverse().map((x, i) => (
          <article key={log.length - i} className="rounded border border-line bg-paper p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent">You asked</div>
            <div className="display mt-1 text-xl font-semibold">{x.question}</div>
            {x.error ? (
              <p className="mt-3 text-danger">{x.error}</p>
            ) : (
              <div className="mt-3 whitespace-pre-wrap leading-relaxed">{x.answer}</div>
            )}
            {x.evidence.length > 0 && (
              <details className="mt-4" open={i === 0}>
                <summary className="cursor-pointer text-sm font-semibold text-ink-2">
                  Supporting rows ({x.evidence.reduce((n, e) => n + e.result.tables.length, 0)} tables from {x.evidence.length} lookup{x.evidence.length === 1 ? "" : "s"})
                </summary>
                <div className="mt-3 space-y-5">
                  {x.evidence.map((e, j) => (
                    <div key={j}>
                      <div className="text-xs text-ink-3">
                        <code>{e.tool}</code> {JSON.stringify(e.input)}
                      </div>
                      <div className="mt-1 text-sm text-ink-2">{e.result.summary}</div>
                      {e.result.tables.map((t) => (
                        <div key={t.title} className="mt-2">
                          <div className="flex items-baseline justify-between">
                            <div className="text-sm font-semibold">{t.title}</div>
                            {t.href && (
                              <Link href={t.href} className="text-xs text-accent">
                                Open on the site →
                              </Link>
                            )}
                          </div>
                          {t.rows.length === 0 ? (
                            <div className="text-xs text-ink-3">No rows.</div>
                          ) : (
                            <div className="tablewrap mt-1 max-h-72 overflow-y-auto rounded border border-line">
                              <table className="data text-xs">
                                <thead>
                                  <tr>
                                    {t.columns.map((c) => (
                                      <th key={c}>{c}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {t.rows.map((r, k) => (
                                    <tr key={k}>
                                      {r.map((cell, m) => (
                                        <td key={m} className={typeof cell === "number" ? "r" : ""}>
                                          {cell === null ? "" : String(cell)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                      {e.result.notes && e.result.notes.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-xs text-ink-2">
                          {e.result.notes.map((n, k) => (
                            <li key={k}>{n}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
