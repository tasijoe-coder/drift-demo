import assert from 'node:assert/strict'
import { NOVELS, BONUS_NOVELS } from '../src/data/lives'
import { endingCollection } from '../src/hx/ending_collection'
for (const story of [...NOVELS, ...BONUS_NOVELS]) {
  const original = JSON.stringify(story)
  const endings = story.nodes.filter(node => node.ending)
  const unknown = endingCollection(story, [])
  assert.equal(unknown.length, endings.length)
  assert.ok(unknown.every(card => card.title === '未收錄' && !card.known && card.excerpt.length === 0))
  assert.deepEqual(endingCollection(story, ['forged', story.start]), unknown)
  const collected = endingCollection(story, [endings[0].id, endings[0].id])
  assert.equal(collected.filter(card => card.known).length, 1)
  assert.equal(collected[0].title, endings[0].title)
  assert.ok(collected[0].excerpt.length > 0 && collected[0].excerpt.length <= 3)
  assert.ok(collected[0].excerpt.every(beat => !beat.when))
  assert.equal(JSON.stringify(story), original, 'The archive must not modify story data or reading state')
}
console.log('PASS: collected-only titles/excerpts, unread spoiler protection, invalid IDs, duplicate collections and read-only data across nine lifetimes.')
