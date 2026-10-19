// Does Jev answer slower after a quiet moment? Sends the same message with a pause between calls.
// Usage: npx tsx scripts/gaps.ts   (Jev only; writes results/gaps-<time>.json)
import { mkdirSync, writeFileSync } from "node:fs";
import { sortWithJev } from "../lib/sorters";

const MESSAGE = "I lost my card, what should I do?";
const GAPS_S = [0.5, 1, 2, 3, 4, 5, 8, 15];
const CALLS_PER_GAP = 5;

await sortWithJev(MESSAGE); // warm-up
const results: { gapS: number; ms: number[]; medianMs: number }[] = [];
for (const gapS of GAPS_S) {
  const ms: number[] = [];
  for (let i = 0; i < CALLS_PER_GAP; i++) {
    await new Promise((r) => setTimeout(r, gapS * 1000));
    ms.push(Math.round((await sortWithJev(MESSAGE)).ms));
  }
  const sorted = [...ms].sort((a, b) => a - b);
  results.push({ gapS, ms, medianMs: sorted[Math.floor(sorted.length / 2)] });
  console.log(`gap ${gapS}s: ${ms.join(", ")} ms (median ${sorted[Math.floor(sorted.length / 2)]})`);
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
mkdirSync("results", { recursive: true });
writeFileSync(`results/gaps-${stamp}.json`, JSON.stringify({ ranAt: new Date().toISOString(), message: MESSAGE, results }, null, 2) + "\n");
