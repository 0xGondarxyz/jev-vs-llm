# Jev vs. LLM

Is TypeSafe's Jev really up to 200x faster than an LLM? This repo puts it to a fair test.

Real bank customer messages from the BANKING77 dataset go to four sorters. Each one must pick which of 77 support categories the message belongs to:

- **Jev** (TypeSafe), asked a `choice` question with the 77 categories as options
- **DeepSeek V4.1 Flash**, a cheap general-purpose model
- **Claude Haiku 5.5**, a small, fast LLM
- **Claude Fable 5.1**, a frontier LLM and one of the two models TypeSafe compared against

Every sorter gets the same question, the same 77 category names (no descriptions) and the same message. Each answer is checked against the dataset's label. Every model runs with its default settings; DeepSeek V4.1 Flash reasons before it answers by default, and that is left on.

## Results (19 October 2026)

25 messages, each sent twice to every sorter:

| | Jev | DeepSeek V4.1 Flash | Claude Haiku 5.5 | Claude Fable 5.1 |
| --- | --- | --- | --- | --- |
| Right answers | 42/50 | 43/50 | 41/50 | 44/50 |
| Answers that changed between runs | 0 | 1 | 1 | 0 |
| Answers not on the list | 0 | 0 | 1 | 0 |
| Median time, each sorter back to back | 305 ms | 1,343 ms | 1,079 ms | 3,060 ms* |
| Cost per 1,000 messages | $0.043 (computed) | $0.18 | $0.10 | $8.69 |

\* Fable's time is from the mixed run; it was not run back to back.

10 hard messages (5 pairs of categories that mean almost the same thing), each sent twice: Jev 14/20, DeepSeek 15/20 (one call timed out after 120 s), Haiku 17/20, Fable 16/20.

Jev slows down after a quiet moment. With a pause of 3 seconds or less between calls, the median was about 300 ms. With a pause of 4 seconds or more, it was about 1,050 ms (`scripts/gaps.ts`).

The raw results are in `results/`.

## What gets measured

| Measure | How |
| --- | --- |
| Accuracy | Answers that match the dataset label |
| Off-list answers | LLM answers that are not one of the 77 categories, after trimming spaces, quotes and a final period (counted as wrong) |
| Reliability | With `--runs 2`, how many messages got a different answer the second time, plus errors and timeouts |
| Speed | Wall-clock time per call, one call at a time; median and p90. The first call per sorter is a warm-up and is not counted |
| Cost | LLMs: the cost OpenRouter bills. Jev: input tokens × TypeSafe's list price of $0.042 per million (output is free), so it is computed, not billed |

Runs are made from Istanbul, Turkey. The LLMs go through OpenRouter, which adds a network hop that a direct API call would not have, and OpenRouter picks the provider for each call (the provider is saved with every row). Jev goes straight to the TypeSafe API.

## Run it

Needs Node.js 22 or newer, a TypeSafe API key and an OpenRouter API key.

```sh
npm install
cp .env.example .env    # then fill in both keys
```

Run the benchmark (writes `results/<set>-<time>.json`):

```sh
npx tsx --env-file=.env scripts/bench.ts --n 25 --runs 2                 # 25 messages, twice, all 4 sorters
npx tsx --env-file=.env scripts/bench.ts --set hard --runs 2             # the 10 hard messages
npx tsx --env-file=.env scripts/bench.ts --n 25 --grouped --sorters jev  # one sorter, calls back to back
npx tsx --env-file=.env scripts/bench.ts --max-usd 0.5                   # stop once the bill passes $0.50
npx tsx --env-file=.env scripts/gaps.ts                                  # Jev speed after pauses
```

See one message sorted side by side in the browser:

```sh
npm run build && npm start   # then open http://localhost:3000
```

## Files

- `data/banking77-test.csv`: the BANKING77 test set (3,080 messages)
- `data/sample.json`: 100 messages picked by a seeded shuffle; the runs above use the first 25 (`npm run sample` rebuilds it identically)
- `data/hard.json`: 10 hard messages, one from each category of 5 look-alike pairs (`npx tsx scripts/hard.ts` rebuilds it)
- `data/labels.json`: the 77 categories
- `lib/sorters.ts`: the Jev call and the LLM call
- `scripts/bench.ts`: the benchmark
- `scripts/gaps.ts`: Jev's speed after pauses of 0.5 to 15 seconds
- `app/`: the side-by-side page

## Data

BANKING77 by PolyAI ([paper](https://arxiv.org/abs/2003.04807), [repo](https://github.com/PolyAI-LDN/task-specific-datasets)), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The test set is included here unchanged.

## License

Code: MIT. Data: CC BY 4.0, as above.
