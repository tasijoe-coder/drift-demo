/** Data-driven novel routes. No browser state or presentation dependencies. */
import type { BgmTrack } from '../data/bgm'
export type Flags = Record<string, string | boolean>
export type Condition = Flags
export type NovelBeat = { speaker: string; text: string; when?: Condition }
export type NovelOption = { id: string; label: string; detail: string; next: string; when?: Condition }
export type NovelNode = {
  id: string; title: string; chapter: string; beats: NovelBeat[]; set?: Flags; bgm?: BgmTrack
  next?: string; choice?: { prompt: string; options: NovelOption[] }; ending?: boolean; perfect?: boolean
}
export type Novel = { id: string; title: string; subtitle?: string; start: string; pageCount: number; readingMinutes: number[]; nodes: NovelNode[] }
export type NovelPosition = { node: string; choices: { node: string; option: string }[]; finished: boolean }
export const startNovel = (story: Novel): NovelPosition => ({ node: story.start, choices: [], finished: false })
export const matches = (flags: Flags, when?: Condition) => !when || Object.entries(when).every(([key, value]) => flags[key] === value)
export const novelNode = (story: Novel, id: string) => story.nodes.find(node => node.id === id)!

/** Reconstruct flags from decisions and nodes, never from untrusted saved flags. */
function trace(story: Novel, value: NovelPosition) {
  let id = story.start
  const flags: Flags = {}
  const route: NovelPosition[] = []
  let taken = 0
  const seen = new Set<string>()
  while (!seen.has(id)) {
    seen.add(id)
    const node = novelNode(story, id)
    if (!node) return null
    Object.assign(flags, node.set)
    route.push({ node: id, choices: value.choices.slice(0, taken), finished: false })
    if (id === value.node) {
      if (taken !== value.choices.length || (value.finished && !node.ending)) return null
      return { node, flags, route }
    }
    if (node.ending) return null
    if (node.choice) {
      const choice = value.choices[taken++]
      if (!choice || choice.node !== id) return null
      const option = node.choice.options.find(option => option.id === choice.option && matches(flags, option.when))
      if (!option) return null
      id = option.next
    } else if (node.next) id = node.next
    else return null
  }
  return null
}
export function novelView(story: Novel, position: NovelPosition) {
  const current = trace(story, position) ?? trace(story, startNovel(story))!
  return { ...current, beats: current.node.beats.filter(beat => matches(current.flags, beat.when)),
    options: current.node.choice?.options.filter(option => matches(current.flags, option.when)) ?? [] }
}
export function advanceNovel(story: Novel, position: NovelPosition): NovelPosition {
  const view = novelView(story, position)
  return view.node.next ? { ...position, node: view.node.next, finished: false } : position
}
export function chooseNovel(story: Novel, position: NovelPosition, optionId: string): NovelPosition {
  const option = novelView(story, position).options.find(option => option.id === optionId)
  return option ? { node: option.next, choices: [...position.choices, { node: position.node, option: option.id }], finished: false } : position
}
export function previousNovel(story: Novel, position: NovelPosition): NovelPosition {
  const route = novelView(story, position).route
  return route.at(-2) ?? position
}
export function previousDecision(story: Novel, position: NovelPosition): NovelPosition {
  const route = novelView(story, position).route.slice(0, -1)
  return route.findLast(entry => novelNode(story, entry.node).choice) ?? position
}
export function finishNovel(story: Novel, position: NovelPosition): NovelPosition {
  return novelView(story, position).node.ending ? { ...position, finished: true } : position
}
export function restoreNovel(story: Novel, raw: unknown): NovelPosition {
  if (!raw || typeof raw !== 'object') return startNovel(story)
  const value = raw as Partial<NovelPosition>
  if (typeof value.node !== 'string' || !Array.isArray(value.choices) || value.choices.length > story.nodes.length) return startNovel(story)
  if (value.choices.some(choice => !choice || typeof choice.node !== 'string' || typeof choice.option !== 'string')) return startNovel(story)
  const position: NovelPosition = { node: value.node, choices: value.choices.map(({ node, option }) => ({ node, option })), finished: value.finished === true }
  return trace(story, position) ? position : startNovel(story)
}
