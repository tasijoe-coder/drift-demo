import type { NovelPosition } from '../engine/novel'
import { restoreNovel, startNovel, type Novel } from '../engine/novel'
import { restoreZero, ZERO_SAVE_KEY, zeroFinished } from './zero_story'

export const ZERO_COMPLETED_KEY = 'hx.theatre.lifetime-zero.completed.v1'
export const QIN_SAVE_KEY = 'hx.novel.qin.v1'
export const QIN_ENDINGS_KEY = 'hx.novel.qin.endings.v1'
export const QIN_BOOKMARK_KEY = 'hx.novel.qin.bookmark.v1'
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

/** Completion is permanent even when the player restarts the prologue. */
export function unlockedZero(completed: string | null, zeroRaw: unknown): boolean {
  return completed === 'true' || zeroFinished(restoreZero(zeroRaw))
}
export function readZeroUnlock(storage: StorageLike): boolean {
  try {
    // A damaged in-progress replay must not invalidate a previous completion.
    if (storage.getItem(ZERO_COMPLETED_KEY) === 'true') return true
    return unlockedZero(null, JSON.parse(storage.getItem(ZERO_SAVE_KEY) ?? 'null'))
  } catch { return false }
}
export function readNovel(storage: StorageLike, story: Novel): NovelPosition {
  try { return restoreNovel(story, JSON.parse(storage.getItem(QIN_SAVE_KEY) ?? 'null')) }
  catch { return startNovel(story) }
}
export function readEndings(storage: StorageLike, story: Novel): string[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(QIN_ENDINGS_KEY) ?? '[]')
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && !!story.nodes.find(node => node.id === id && node.ending)))] : []
  } catch { return [] }
}
