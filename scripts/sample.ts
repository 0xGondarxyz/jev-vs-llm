// Builds data/labels.json and data/sample.json from the BANKING77 test set.
// The sample is a seeded shuffle, so anyone who reruns this gets the same 100 messages.
import { readFileSync, writeFileSync } from "node:fs";

const SAMPLE_SIZE = 100;
const SEED = 77;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// mulberry32: small seeded random number generator
function random(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rows = parseCsv(readFileSync("data/banking77-test.csv", "utf8")).slice(1);
const all = rows.map(([text, label]) => ({ text, label }));
const labels = [...new Set(all.map((m) => m.label))].sort();
if (labels.length !== 77) throw new Error(`expected 77 labels, found ${labels.length}`);

const next = random(SEED);
for (let i = all.length - 1; i > 0; i--) {
  const j = Math.floor(next() * (i + 1));
  [all[i], all[j]] = [all[j], all[i]];
}

writeFileSync("data/labels.json", JSON.stringify(labels, null, 2) + "\n");
writeFileSync("data/sample.json", JSON.stringify(all.slice(0, SAMPLE_SIZE), null, 2) + "\n");
console.log(`${all.length} messages, ${labels.length} labels, wrote ${SAMPLE_SIZE} to data/sample.json`);
