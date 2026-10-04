# spotlog documentation

Start with **[AGENTS.md](../AGENTS.md)**. It has what spotlog is, the ground rules, the commands and the code map.

| Doc | Read it when you… |
|---|---|
| [architecture.md](architecture.md) | need to find your way in the code: modules, `plugin.svelte` anatomy, state, data flow, Windy APIs, the map |
| [data-model.md](data-model.md) | touch anything stored: the diary's shape, validation, merging, sync, legacy fields |
| [learning.md](learning.md) | touch the recommendation: examples, similar sessions, evidence gates, boosted trees, windows, ranges (`predict.ts`, `learn/`) |
| [forecast.md](forecast.md) | touch forecasts, models, snapshots, predictability, the model a spot uses, tides |
| [ui-and-copy.md](ui-and-copy.md) | change wording, the look, or apply a Style Lab design; the layout rules |
| [testing.md](testing.md) | run or add tests; the fake Windy; what only real Windy can show |
| [operations.md](operations.md) | build, version, publish (owner's OK only), browser storage / future sync, security and privacy |
| [decisions.md](decisions.md) | are about to change something the owner already decided |
| [review-checklist.md](review-checklist.md) | review a change before it ships |

Work in progress is organized separately:
- [Reviews](reviews/README.md) — findings from code and product reviews.
- [Specifications](specifications/README.md) — proposed changes and implementation plans.

Also in the repo:
- `README.md`: what spotlog does, for users and testers.
- `docs/rating-logic.xlsx`: the 0.13 learning as a spreadsheet. It's outdated, and `learning.md` is the current source.
