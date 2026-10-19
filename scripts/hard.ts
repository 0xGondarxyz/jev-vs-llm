// Builds data/hard.json: 10 messages from 5 pairs of categories that mean almost the same thing.
// One message per category, picked by a seeded shuffle and never one already in data/sample.json.
import { readFileSync, writeFileSync } from "node:fs";
import sample from "../data/sample.json";

const PAIRS = [
  ["card_arrival", "card_delivery_estimate"],
  ["pending_transfer", "transfer_not_received_by_recipient"],
  ["top_up_failed", "top_up_reverted"],
  ["get_physical_card", "order_physical_card"],
  ["declined_card_payment", "card_not_working"],
];
const SEED = 2026;

function random(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The test CSV has simple "text,category" rows; texts with commas are quoted.
const rows = readFileSync("data/banking77-test.csv", "utf8").trim().split("\n").slice(1).map((line) => {
  const i = line.lastIndexOf(",");
  return { text: line.slice(0, i).replace(/^"|"$/g, "").replace(/""/g, '"'), label: line.slice(i + 1).trim() };
});
const used = new Set(sample.map((m) => m.text));
const next = random(SEED);

const hard = PAIRS.flat().map((label) => {
  const pool = rows.filter((r) => r.label === label && !used.has(r.text));
  return pool[Math.floor(next() * pool.length)];
});
writeFileSync("data/hard.json", JSON.stringify(hard, null, 2) + "\n");
console.log(`wrote ${hard.length} messages to data/hard.json`);
