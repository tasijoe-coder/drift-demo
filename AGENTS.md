# Project Direction

This project is not a romance game and not a generic survival sandbox.
It is a survival narrative game about two strangers trapped on an island for 14 days.
Each run the other person has a random hidden truth (hoarder / liar / injured / innocent); the player gathers clues, decides how to share supplies, and may confront them once.

Core pillars:
1. Survival pressure
2. Trust and suspicion
3. Long-term consequences
4. Psychological tension
5. Multiple endings based on behavior, not just affection

Rules:
- Keep the project data-driven.
- Do not hardcode event text into React components when avoidable.
- Prefer JSON-driven content (`src/data/content.json`).
- Game rules live in `src/engine/game.ts` (pure, no React). UI lives in `src/game/Game.tsx`.
- After changing numbers, run `npm run sim` and check the ending distribution per play style.
- Every important stat must affect at least one other system.
- Avoid adding redundant stats.
- Favor trust, suspicion, stress, flags, food, water, hp, energy, relationship.
- Do not turn the game into base-building or crafting-heavy survival.
- The other person is unnamed and gender-neutral in UI text.
- Tone should emphasize uncertainty, tension, and human choices under pressure.
- Prefer incremental changes and keep the project buildable after each step.
