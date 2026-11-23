import assert from 'node:assert/strict'
import { NOVELS } from '../src/data/lives'
import { novelKeys } from '../src/hx/novel_save'
import { advanceAfterword, afterwordFinished, afterwordKey, afterwordStory, isAfterwordOrigin, previousAfterword, restoreAfterword, startAfterword } from '../src/hx/afterword_story'
import { storyNode, storyTranscript } from '../src/hx/theatre_story'

const seventh = NOVELS[6]
const origins = seventh.nodes.filter(n => n.ending).map(n => n.id)
let checkpoints = 0
const keys: string[] = []
for (const origin of origins) {
  assert.ok(isAfterwordOrigin(origin))
  const story = afterwordStory(origin)
  keys.push(afterwordKey(origin))
  assert.equal(story.nodes.length, 5)
  assert.equal(new Set(story.nodes.map(n => n.id)).size, story.nodes.length)
  assert.ok(story.nodes.every(n => !n.choice && n.beats.length > 0))
  let position = startAfterword(story)
  let previousCount = 0
  const total = story.nodes.reduce((sum, n) => sum + n.beats.length, 0)
  for (let guard = 0; guard <= total; guard++) {
    checkpoints++
    assert.deepEqual(restoreAfterword(story, JSON.parse(JSON.stringify(position))), position)
    const transcript = storyTranscript(story, position)
    assert.ok(transcript.every(b => b.text.trim() && b.speaker.trim()))
    assert.ok(transcript.length >= previousCount)
    previousCount = transcript.length
    if (afterwordFinished(story, position)) {
      assert.equal(transcript.length, total)
      assert.deepEqual(advanceAfterword(story, position), position)
      assert.deepEqual(advanceAfterword(story, previousAfterword(story, position)), position)
      break
    }
    const next = advanceAfterword(story, position)
    assert.notDeepEqual(next, position)
    assert.deepEqual(previousAfterword(story, next), position)
    position = next
    assert.ok(guard < total)
  }
  assert.equal(afterwordFinished(story, position), true)
  assert.deepEqual(previousAfterword(story, startAfterword(story)), startAfterword(story))
  for (const bad of [null, {}, { node: 'coda-leave', beat: 9999, choices: [] }, { node: 'E5', beat: 0, choices: [] }, { node: story.start, beat: 0, choices: [{ node: story.start, option: 'forged' }] }]) {
    assert.deepEqual(restoreAfterword(story, bad), startAfterword(story))
  }
  const entry = storyNode(story, story.start).beats.map(b => b.text).join('')
  if (origin !== 'E5') assert.match(entry, /壽終|壽數|自然的一生/)
  if (origin === 'E6') assert.match(entry, /客人/)
  if (['E2', 'E4'].includes(origin)) assert.match(entry, /未曾拆卷|未拆/)
}
assert.equal(new Set(keys).size, 6)
assert.ok(keys.every(key => !NOVELS.flatMap(n => Object.values(novelKeys(n))).includes(key)))
assert.equal(isAfterwordOrigin('E7'), false)
assert.equal(isAfterwordOrigin('toString'), false)
assert.equal(isAfterwordOrigin('__proto__'), false)
console.log('PASS: six ending-specific entries, five scenes per entry, '+checkpoints+' sentence/restore checkpoints, every forward/backward transition, independent keys and corrupt save recovery.')
