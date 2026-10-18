"use client";
import { useState } from "react";
import sample from "../data/sample.json";
import type { SortResult } from "../lib/sorters";

const NAMES: Record<string, string> = {
  jev: "Jev",
  "anthropic/claude-haiku-5.5": "Claude Haiku 5.5",
  "anthropic/claude-fable-5.1": "Claude Fable 5.1",
};

export default function Page() {
  const [pick, setPick] = useState(sample[0]);
  const [message, setMessage] = useState(sample[0].text);
  const [results, setResults] = useState<SortResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const expected = message === pick.text ? pick.label : null;

  function randomMessage() {
    const next = sample[Math.floor(Math.random() * sample.length)];
    setPick(next);
    setMessage(next.text);
    setResults([]);
  }

  async function sortIt() {
    setBusy(true);
    setError("");
    setResults([]);
    try {
      const res = await fetch("/api/sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setResults(body.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sorting failed. Check the server log.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 16px", display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>Jev vs. LLM</h1>
      <p style={{ margin: 0, color: "#5b6673" }}>
        A bank customer writes in. Which of 77 support categories is it? Same message, same list, three sorters.
      </p>
      <label htmlFor="message" style={{ fontWeight: 600 }}>Customer message</label>
      <textarea
        id="message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        style={{ font: "inherit", padding: 12, borderRadius: 8, border: "1px solid #c9d1da" }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={sortIt} disabled={busy || !message.trim()} style={button("#2357a6", "#fff")}>
          {busy ? "Sorting…" : "Sort"}
        </button>
        <button onClick={randomMessage} disabled={busy} style={button("#fff", "#2357a6")}>
          Random real message
        </button>
        {expected && <span style={{ color: "#5b6673" }}>Right answer: <code>{expected}</code></span>}
      </div>
      {error && <p role="alert" style={{ color: "#c2362b", margin: 0 }}>{error}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {results.map((r) => (
          <section key={r.sorter} style={{ background: "#fff", borderRadius: 10, padding: 14, border: `2px solid ${border(r, expected)}` }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{NAMES[r.sorter] ?? r.sorter}</h2>
            <code style={{ fontWeight: 700, wordBreak: "break-word" }}>{r.error ? "error" : r.label || "(empty)"}</code>
            {!r.error && !r.onList && <p style={{ color: "#c2362b", margin: "6px 0 0" }}>Not one of the 77 categories</p>}
            {r.error && <p style={{ color: "#c2362b", margin: "6px 0 0", fontSize: 13 }}>{r.error}</p>}
            <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 700 }}>{Math.round(r.ms)} ms</p>
            <p style={{ margin: 0, color: "#5b6673", fontSize: 13 }}>
              ${r.costUsd.toFixed(6)} {r.costSource === "computed" ? "(computed from list price)" : "(billed)"}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}

function border(r: SortResult, expected: string | null) {
  if (r.error || !r.onList) return "#c2362b";
  if (!expected) return "#d3dae2";
  return r.label === expected ? "#2f7d4f" : "#c2362b";
}

function button(bg: string, fg: string) {
  return { font: "inherit", fontWeight: 600, padding: "10px 18px", borderRadius: 8, border: "1px solid #2357a6", background: bg, color: fg, cursor: "pointer" };
}
