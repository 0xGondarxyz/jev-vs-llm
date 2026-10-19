// The two ways to sort a message. Both get the same question and the same 77 labels.
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import labels from "../data/labels.json";

export type SortResult = {
  sorter: string;
  model: string;
  label: string;
  onList: boolean; // false when the answer is not one of the 77 labels
  ms: number;
  costUsd: number;
  costSource: "billed" | "computed";
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  confidence: number | null;
  provider?: string; // which OpenRouter provider served the call
  raw: string;
  error?: string;
};

export const QUESTION = "Which banking support category does this customer message belong to?";

// TypeSafe's published price: $0.042 per million input tokens, output free.
// Jev's cost is computed from this price; the LLM cost is what OpenRouter bills.
const JEV_USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;

const criteria = Object.fromEntries(labels.map((label) => [label, null]));
let typesafe: TypeSafeClient | undefined;

export async function sortWithJev(message: string): Promise<SortResult> {
  typesafe ??= new TypeSafeClient();
  const start = performance.now();
  try {
    const result = await typesafe.systemOne({
      state: message,
      questions: { category: choice(QUESTION, criteria) },
    });
    const ms = performance.now() - start;
    const answer = result.answers.category;
    return {
      sorter: "jev",
      model: result.model,
      label: answer.choice,
      onList: labels.includes(answer.choice),
      ms,
      costUsd: (result.usage.input_tokens ?? 0) * JEV_USD_PER_INPUT_TOKEN,
      costSource: "computed",
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
      reasoningTokens: null,
      confidence: answer.confidence,
      raw: answer.choice,
    };
  } catch (err) {
    return failed("jev", "jev", start, err, "computed");
  }
}

const SYSTEM_PROMPT = `${QUESTION}
Reply with exactly one category name from this list and nothing else:
${labels.join("\n")}`;

// Trims what any developer would trim: whitespace, quotes, backticks and a final period.
function clean(text: string): string {
  return text.trim().replace(/^[`"']+|[`"'.]+$/g, "").trim();
}

export async function sortWithLLM(message: string, model: string): Promise<SortResult> {
  const start = performance.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        usage: { include: true },
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const body = await res.json();
    const ms = performance.now() - start;
    if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body.error ?? body)}`);
    const raw: string = body.choices?.[0]?.message?.content ?? "";
    const label = clean(raw);
    return {
      sorter: model,
      model: body.model ?? model,
      label,
      onList: labels.includes(label),
      ms,
      costUsd: body.usage?.cost ?? 0,
      costSource: "billed",
      inputTokens: body.usage?.prompt_tokens ?? null,
      outputTokens: body.usage?.completion_tokens ?? null,
      reasoningTokens: body.usage?.completion_tokens_details?.reasoning_tokens ?? null,
      confidence: null,
      provider: body.provider,
      raw,
    };
  } catch (err) {
    return failed(model, model, start, err, "billed");
  }
}

function failed(sorter: string, model: string, start: number, err: unknown, costSource: SortResult["costSource"]): SortResult {
  return {
    sorter, model, label: "", onList: false, ms: performance.now() - start,
    costUsd: 0, costSource, inputTokens: null, outputTokens: null, reasoningTokens: null,
    confidence: null, raw: "", error: err instanceof Error ? err.message : String(err),
  };
}

export function sort(message: string, sorter: string): Promise<SortResult> {
  return sorter === "jev" ? sortWithJev(message) : sortWithLLM(message, sorter);
}
