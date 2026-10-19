// Runs the sample through every sorter, one call at a time, and writes the results.
// Usage: npx tsx scripts/bench.ts [--set sample|hard] [--n 100] [--runs 2] [--max-usd 1]
//        [--sorters jev,anthropic/claude-haiku-5.5] [--grouped]
// By default each message goes to every sorter in turn. --grouped runs all messages through one
// sorter before the next, so each sorter gets calls back to back, like an app under steady traffic.
// With --runs 2 or more, every message goes through every sorter again, and "changed" counts
// the messages whose answer was not the same in every run.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { sort, type SortResult } from "../lib/sorters";

const DEFAULT_SORTERS = [
  "jev",
  "deepseek/deepseek-v4.1-flash",
  "anthropic/claude-haiku-5.5",
  "anthropic/claude-fable-5.1",
];
const WARMUP_MESSAGE = "I want to check my card balance."; // first call per sorter, not counted

const { values } = parseArgs({
  options: {
    set: { type: "string" }, n: { type: "string" }, runs: { type: "string" },
    "max-usd": { type: "string" }, sorters: { type: "string" }, grouped: { type: "boolean" },
  },
});
const set = values.set ?? "sample";
const all: { text: string; label: string }[] = JSON.parse(readFileSync(`data/${set}.json`, "utf8"));
const messages = all.slice(0, Number(values.n ?? all.length));
const runs = Number(values.runs ?? 1);
const maxUsd = Number(values["max-usd"] ?? Infinity); // stops the run once billed cost passes this
const sorters = values.sorters?.split(",") ?? DEFAULT_SORTERS;

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

for (const sorter of sorters) await sort(WARMUP_MESSAGE, sorter);

const rows: (SortResult & { run: number; message: string; expected: string; correct: boolean })[] = [];
let billed = 0;
// The order of calls: [message index, sorter] pairs, message-major by default.
const order: [number, string][] = values.grouped
  ? sorters.flatMap((sorter) => messages.map((_, i) => [i, sorter] as [number, string]))
  : messages.flatMap((_, i) => sorters.map((sorter) => [i, sorter] as [number, string]));
run: for (let run = 1; run <= runs; run++) {
  for (const [k, [i, sorter]] of order.entries()) {
    const m = messages[i];
    const r = await sort(m.text, sorter);
    if (r.costSource === "billed") billed += r.costUsd;
    rows.push({ ...r, run, message: m.text, expected: m.label, correct: r.label === m.label });
    if (billed > maxUsd) { console.log(`\nstopped: billed $${billed.toFixed(4)} > $${maxUsd}`); break run; }
    process.stdout.write(`\rrun ${run}/${runs}, call ${k + 1}/${order.length}`);
  }
}
process.stdout.write("\n");

// Messages whose answer differed between runs, per sorter.
function changed(sorter: string): number {
  const byMessage = new Map<string, Set<string>>();
  for (const r of rows.filter((r) => r.sorter === sorter)) {
    byMessage.set(r.message, (byMessage.get(r.message) ?? new Set()).add(r.label));
  }
  return [...byMessage.values()].filter((answers) => answers.size > 1).length;
}

const summary = sorters.map((sorter) => {
  const mine = rows.filter((r) => r.sorter === sorter);
  const ms = mine.map((r) => r.ms).sort((a, b) => a - b);
  return {
    sorter,
    model: mine.find((r) => !r.error)?.model ?? sorter,
    messages: mine.length,
    correct: mine.filter((r) => r.correct).length,
    changed: runs > 1 ? changed(sorter) : null,
    offList: mine.filter((r) => !r.error && !r.onList).length,
    errors: mine.filter((r) => r.error).length,
    medianMs: Math.round(percentile(ms, 50)),
    p90Ms: Math.round(percentile(ms, 90)),
    totalCostUsd: mine.reduce((s, r) => s + r.costUsd, 0),
    costSource: mine[0]?.costSource,
    reasoningTokens: mine.reduce((s, r) => s + (r.reasoningTokens ?? 0), 0),
  };
});

console.table(summary.map((s) => ({
  sorter: s.sorter,
  correct: `${s.correct}/${s.messages}`,
  ...(runs > 1 ? { changed: s.changed } : {}),
  "off-list": s.offList,
  errors: s.errors,
  "median ms": s.medianMs,
  "p90 ms": s.p90Ms,
  "cost $": s.totalCostUsd.toFixed(6) + (s.costSource === "computed" ? " (computed)" : ""),
})));

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
mkdirSync("results", { recursive: true });
writeFileSync(`results/${set}-${stamp}.json`, JSON.stringify({
  ranAt: new Date().toISOString(),
  set,
  runs,
  order: values.grouped ? "grouped: each sorter back to back" : "each message through every sorter in turn",
  where: "Istanbul, Turkey; LLMs through OpenRouter, Jev through the TypeSafe API",
  summary,
  rows,
}, null, 2) + "\n");
console.log(`wrote results/${set}-${stamp}.json`);
