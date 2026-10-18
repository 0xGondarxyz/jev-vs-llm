# Jev vs. LLM

Is TypeSafe's Jev really up to 200x faster than an LLM? This repo puts it to a fair test.

100 real bank customer messages from the BANKING77 dataset go to three sorters. Each one must pick which of 77 support categories the message belongs to:

- **Jev** (TypeSafe), asked a `choice` question with the 77 categories as options
- **Claude Haiku 5.5**, a small, fast LLM
- **Claude Fable 5.1**, a frontier LLM and one of the two models TypeSafe compared against

Every sorter gets the same question, the same 77 category names (no descriptions) and the same message. Each answer is checked against the dataset's label.

## What gets measured

| Measure | How |
| --- | --- |
| Accuracy | Answers that match the dataset label, out of 100 |
| Off-list answers | LLM answers that are not one of the 77 categories (counted as wrong) |
| Speed | Wall-clock time per call, one call at a time; median and p90. The first call per sorter is a warm-up and is not counted |
| Cost | LLMs: the cost OpenRouter bills. Jev: input tokens × TypeSafe's list price of $0.042 per million (output is free), so it is computed, not billed |

Runs are made from Istanbul, Turkey. The LLMs go through OpenRouter, which adds a network hop that a direct API call would not have. Jev goes straight to the TypeSafe API.

## Run it

Needs Node.js 22 or newer, a TypeSafe API key and an OpenRouter API key.

```sh
npm install
cp .env.example .env    # then fill in both keys
```

Run the benchmark (writes `results/run-<time>.json`):

```sh
npx tsx --env-file=.env scripts/bench.ts            # all 100 messages, all 3 sorters
npx tsx --env-file=.env scripts/bench.ts --n 10     # first 10 messages only
npx tsx --env-file=.env scripts/bench.ts --sorters jev,anthropic/claude-haiku-5.5
```

See one message sorted side by side in the browser:

```sh
npm run build && npm start   # then open http://localhost:3000
```

## Files

- `data/banking77-test.csv`: the BANKING77 test set (3,080 messages)
- `data/sample.json`: the 100 messages used, picked by a seeded shuffle (`npm run sample` rebuilds it identically)
- `data/labels.json`: the 77 categories
- `lib/sorters.ts`: the Jev call and the LLM call
- `scripts/bench.ts`: the benchmark
- `app/`: the side-by-side page

## Data

BANKING77 by PolyAI ([paper](https://arxiv.org/abs/2003.04807), [repo](https://github.com/PolyAI-LDN/task-specific-datasets)), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The test set is included here unchanged.

## License

Code: MIT. Data: CC BY 4.0, as above.
