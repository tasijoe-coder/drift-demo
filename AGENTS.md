# Project: 紅線千年 (Red Thread of a Thousand Years)

You are 月老 (the matchmaker god). The Jade Emperor punished 金童玉女 to seven lifetimes of
"配為夫妻，卻不許成婚" (the 七世夫妻 folk legend). Each lifetime is a chapter set in a different
dynasty (秦 孟姜女, 東晉 梁祝, 唐, 宋, 明, 明, 七世), later extended to modern 八點檔 melodrama.
The player rewrites the tragedy by dragging "天意" cards onto one of four characters.

Business model: one game. 第一世 free; all other lifetimes unlocked by one single purchase.

Rules:
- Engine is generic and data-driven: `src/engine/fate.ts` (pure TS, no React).
- Each lifetime is one JSON file in `src/data/lives/<id>.json`, registered in `src/data/lives/index.ts`.
  Adding a lifetime must not require engine changes.
- UI: `src/hx/App.tsx`. Sound effects are synthesized in `src/hx/sfx.ts` (no audio files).
- Meters per lifetime: 紅線 (too low = 緣盡, too high = 殉情), 天規 (too high = 天譴), 劫數 (too high = legend's original tragedy).
- After changing content or numbers, run `npm run sim` and check: endings reachable, random players mostly fail,
  text-reading first-timers ~20-30% best ending, veterans with memory ~40-60%.
- Tone: folklore with melodrama (狗血) and warmth; 土地公 is the recurring comic ally.
- Keep text in Traditional Chinese. Keep the project buildable after each step.
