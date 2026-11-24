import assert from 'node:assert/strict'
import { NOVELS, BONUS_NOVELS } from '../src/data/lives'
import { bonusChapterUnlocked, isReadingTap, readingDelay, splitReadingText } from '../src/hx/reading_timing'

assert.equal(isReadingTap(9.99, 299), true)
assert.equal(isReadingTap(10, 100), false)
assert.equal(isReadingTap(1, 300), false)
assert.equal(isReadingTap(25, 100), false)
assert.equal(readingDelay('我知道。'), 1680)
assert.equal(readingDelay('月🌙'), 1440, 'Count Unicode characters, not UTF-16 code units')
assert.equal(readingDelay('換幕。', true) - readingDelay('換幕。'), 800)
assert.equal(bonusChapterUnlocked(8, []), false)
assert.equal(bonusChapterUnlocked(8, [7]), true)
assert.equal(bonusChapterUnlocked(9, [7]), false)
assert.equal(bonusChapterUnlocked(9, [7, 8]), true)
assert.equal(bonusChapterUnlocked(10, [7, 8, 9]), true)
assert.equal(bonusChapterUnlocked(11, [10]), false)
let checked = 0
for (const story of [...NOVELS, ...BONUS_NOVELS]) for (const node of story.nodes) for (const beat of node.beats) {
  const lines = splitReadingText(beat.text)
  assert.ok(lines.length > 0)
  assert.equal(lines.join('').replace(/\s/gu, ''), beat.text.replace(/\s/gu, ''), `${story.id}/${node.id}: sentence splitting must preserve all prose and punctuation`)
  checked++
}
console.log(`PASS: tap boundaries, Unicode timing, 800ms scene pause, sequential hidden chapter gates, ${checked} paragraphs preserved through sentence splitting.`)
