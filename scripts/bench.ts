// Runs the sample through every sorter, one call at a time, and writes the results.
// Usage: npx tsx scripts/bench.ts [--n 100] [--sorters jev,anthropic/claude-haiku-5.5]
import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import sample from "../data/sample.json";
import { sort, type SortResult } from "../lib/sorters";

const DEFAULT_SORTERS = ["jev", "anthropic/claude-haiku-5.5", "anthropic/claude-fable-5.1"];
const WARMUP_MESSAGE = "I want to check my card balance."; // first call per sorter, not counted

const { values } = parseArgs({
  options: { n: { type: "string" }, sorters: { type: "string" } },
});
const messages = sample.slice(0, Number(values.n ?? sample.length));
const sorters = values.sorters?.split(",") ?? DEFAULT_SORTERS;

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

for (const sorter of sorters) await sort(WARMUP_MESSAGE, sorter);

const rows: (SortResult & { message: string; expected: string; correct: boolean })[] = [];
for (const [i, m] of messages.entries()) {
  for (const sorter of sorters) {
    const r = await sort(m.text, sorter);
    rows.push({ ...r, message: m.text, expected: m.label, correct: r.label === m.label });
  }
  process.stdout.write(`\r${i + 1}/${messages.length}`);
}
process.stdout.write("\n");

const summary = sorters.map((sorter) => {
  const mine = rows.filter((r) => r.sorter === sorter);
  const ms = mine.map((r) => r.ms).sort((a, b) => a - b);
  return {
    sorter,
    model: mine.find((r) => !r.error)?.model ?? sorter,
    messages: mine.length,
    correct: mine.filter((r) => r.correct).length,
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
  "off-list": s.offList,
  errors: s.errors,
  "median ms": s.medianMs,
  "p90 ms": s.p90Ms,
  "cost $": s.totalCostUsd.toFixed(6) + (s.costSource === "computed" ? " (computed)" : ""),
})));

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
mkdirSync("results", { recursive: true });
writeFileSync(`results/run-${stamp}.json`, JSON.stringify({
  ranAt: new Date().toISOString(),
  where: "Istanbul, Turkey; LLMs through OpenRouter, Jev through the TypeSafe API",
  summary,
  rows,
}, null, 2) + "\n");
console.log(`wrote results/run-${stamp}.json`);
