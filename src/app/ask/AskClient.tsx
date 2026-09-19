"use client";

import { useEffect, useRef, useState } from "react";
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
  id: number;
  question: string;
  answer: string;
  status: string | null;
  evidence: Evidence[];
  error?: string;
  done: boolean;
}

const EXAMPLES = [
  "Who has won the most titles?",
  "How good was Malcolm Spatz, really?",
  "Who won in 2019 and by how much?",
  "Best singles player with at least 20 matches",
  "Lowest round ever recorded",
  "Best partnership in Longue Vue history",
  "Has Fox Chapel ever won?",
  "What happened in 1953?",
];

const WAITING = [
  "Dusting off the scoresheets…",
  "Counting the half-points…",
  "Checking the arithmetic against the other club's sheet…",
  "Asking the secretary, who is not in a hurry…",
  "Consulting the Nassau tables…",
  "Looking for the Friday sheet 2022 never had…",
  "Squinting at a faint 2007 scan…",
  "Ranking everyone fairly across three scoring eras…",
];

export function AskClient({ enabled, compact = false, examples = EXAMPLES }: { enabled: boolean; compact?: boolean; examples?: string[] }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Exchange[]>([]);
  const [tick, setTick] = useState(0);
  const idRef = useRef(0);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setTick((x) => x + 1), 2200);
    return () => clearInterval(t);
  }, [busy]);

  const patch = (id: number, fn: (x: Exchange) => Exchange) => setLog((l) => l.map((x) => (x.id === id ? fn(x) : x)));

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setQ("");
    const id = ++idRef.current;
    const history = log
      .filter((x) => x.done && x.answer && !x.error)
      .slice(-2)
      .flatMap((x) => [
        { role: "user", content: x.question },
        { role: "assistant", content: x.answer },
      ]);
    setLog((l) => [...l, { id, question: text, answer: "", status: null, evidence: [], done: false }]);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: text, history }) });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev: { type: string; delta?: string; text?: string; message?: string; tool?: string; input?: unknown; result?: Evidence["result"] };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "text") patch(id, (x) => ({ ...x, answer: x.answer + (ev.delta ?? ""), status: null }));
          else if (ev.type === "reset") patch(id, (x) => ({ ...x, answer: "" }));
          else if (ev.type === "status") patch(id, (x) => ({ ...x, status: ev.text ?? null }));
          else if (ev.type === "evidence") patch(id, (x) => ({ ...x, evidence: [...x.evidence, { tool: ev.tool!, input: ev.input, result: ev.result! }] }));
          else if (ev.type === "error") patch(id, (x) => ({ ...x, error: ev.message, status: null }));
        }
      }
      patch(id, (x) => ({ ...x, done: true, status: null }));
    } catch {
      patch(id, (x) => ({ ...x, error: "Could not reach the server.", done: true, status: null }));
    } finally {
      setBusy(false);
    }
  }

  const waiting = WAITING[tick % WAITING.length];

  return (
    <div className={compact ? "" : "max-w-3xl"}>
      {!enabled && (
        <p className="mb-4 rounded border border-brass bg-brass-soft px-4 py-3 text-sm text-ink">The question box is not switched on yet. Everything else on the site works without it.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex"
      >
        <label htmlFor={compact ? "ask-home" : "ask-q"} className="sr-only">
          Your question
        </label>
        <input
          id={compact ? "ask-home" : "ask-q"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={compact ? "Ask anything about the cup…" : "e.g. How did Oakmont do in 2015?"}
          disabled={!enabled || busy}
          autoComplete="off"
          className="w-full rounded-l border border-line bg-paper px-4 py-3 text-lg text-ink placeholder:text-ink-3 disabled:opacity-60"
        />
        <button type="submit" disabled={!enabled || busy} className="rounded-r bg-accent px-5 font-semibold text-white disabled:opacity-60">
          {busy ? "…" : "Ask"}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {(compact ? examples.slice(0, 4) : examples).map((ex) => (
          <button key={ex} type="button" disabled={!enabled || busy} onClick={() => ask(ex)} className="rounded-full border border-line bg-paper px-3 py-1 text-sm hover:border-accent disabled:opacity-60">
            {ex}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {[...log].reverse().map((x, i) => (
          <article key={x.id} className="rounded border border-line bg-paper p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent">You asked</div>
            <div className="display mt-1 text-xl font-semibold">{x.question}</div>
            {x.error ? (
              <p className="mt-3 text-danger">{x.error}</p>
            ) : x.answer ? (
              <div className="mt-3 whitespace-pre-wrap leading-relaxed">{x.answer}{!x.done && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-accent align-middle" aria-hidden="true" />}</div>
            ) : (
              <p className="mt-3 text-ink-2 italic" aria-live="polite">
                {x.status ?? waiting}
              </p>
            )}
            {x.evidence.length > 0 && (
              <details className="mt-4" open={i === 0 && !compact}>
                <summary className="cursor-pointer text-sm font-semibold text-ink-2">
                  Check the rows ({x.evidence.reduce((n, e) => n + e.result.tables.length, 0)} tables from {x.evidence.length} lookup{x.evidence.length === 1 ? "" : "s"})
                </summary>
                <div className="mt-3 space-y-5">
                  {x.evidence.map((e, j) => (
                    <div key={j}>
                      <div className="text-sm text-ink-2">{e.result.summary}</div>
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
