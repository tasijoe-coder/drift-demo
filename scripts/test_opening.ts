import assert from 'node:assert/strict'
import { selectResumeChapter, type ResumeChapter } from '../src/hx/chapter_resume'
import { NOVELS } from '../src/data/lives'

assert.deepEqual(NOVELS.map(story => story.id), ['qin-novel', 'jin-novel', 'tang-novel', 'song-novel', 'ming1-novel', 'ming2-novel', 'seventh-novel'])

const fresh: ResumeChapter[] = [
  { id: 'qin', unlocked: false, played: false },
  { id: 'jin', unlocked: false, played: false },
  { id: 'fog', unlocked: false, played: false },
]
assert.equal(selectResumeChapter('', false, fresh), null, 'Initial autosaves do not imply a reading record')
assert.equal(selectResumeChapter('', true, fresh), 'zero')
const opened = fresh.map(chapter => chapter.id === 'qin' ? { ...chapter, unlocked: true } : chapter)
assert.equal(selectResumeChapter('', true, opened), 'zero', 'An unread newly unlocked chapter is not the last read')
assert.equal(selectResumeChapter('qin', true, opened), 'qin', 'Opening the first sentence is a real reading record')
const played = opened.map(chapter => chapter.id === 'qin' ? { ...chapter, played: true } : chapter)
assert.equal(selectResumeChapter('', true, played), 'qin', 'Legacy saves without a recent-chapter key remain resumable')
assert.equal(selectResumeChapter('zero', true, played), 'zero', 'Re-reading the prologue updates the continuation card')
assert.equal(selectResumeChapter('fog', false, played), 'qin', 'A forged recent chapter cannot reveal a locked bonus')
assert.equal(selectResumeChapter('damaged', false, fresh), null)
assert.equal(selectResumeChapter('fog', true, [...played.slice(0,2), { id: 'fog', unlocked: true, played: true }]), 'fog')
console.log('PASS: fresh cover vs real reading records, zero/novel continuation, legacy progress, and locked bonus protection.')
