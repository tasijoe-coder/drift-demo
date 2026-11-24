import content from '../data/lives/qin-opening.json'
import type { BgmTrack } from '../data/bgm'

export type Beat = { speaker: string; text: string; pose: string; sound?: string; still?: string }
export type StoryOption = { id: string; label: string; detail: string; next: string; memory: string }
export type StoryNode = {
  id: string
  bgm?: BgmTrack
  chapter: string
  setting: string
  scene: string
  title?: string
  era?: string
  beats: Beat[]
  next?: string
  choice?: { prompt: string; options: StoryOption[] }
}
export type Story = { id: string; title: string; start: string; nodes: StoryNode[] }
export type StoryPosition = { node: string; beat: number; choices: { node: string; option: string }[] }

export const opening = content as Story
export const storyNode = (story: Story, id: string) => story.nodes.find((node) => node.id === id)!
export const startStory = (story: Story): StoryPosition => ({ node: story.start, beat: 0, choices: [] })

// Presentation progress stays separate from the card engine and its save data.
export function advanceStory(story: Story, state: StoryPosition): StoryPosition {
  const node = storyNode(story, state.node)
  if (state.beat < node.beats.length - 1) return { ...state, beat: state.beat + 1 }
  if (node.choice || !node.next) return state.beat === node.beats.length ? state : { ...state, beat: node.beats.length }
  return { ...state, node: node.next, beat: 0 }
}

export function chooseStory(story: Story, state: StoryPosition, optionId: string): StoryPosition {
  const node = storyNode(story, state.node)
  if (state.beat !== node.beats.length) return state
  const option = node.choice?.options.find((item) => item.id === optionId)
  if (!option) return state
  return { node: option.next, beat: 0, choices: [...state.choices, { node: node.id, option: option.id }] }
}

export function restoreStory(story: Story, value: unknown): StoryPosition {
  if (!value || typeof value !== 'object') return startStory(story)
  const raw = value as Partial<StoryPosition>
  if (!Array.isArray(raw.choices)) return startStory(story)
  // Replay the saved route. Do not accept a later scene with missing or forged decisions.
  let state = startStory(story)
  for (const choice of raw.choices) {
    if (!choice || typeof choice.node !== 'string' || typeof choice.option !== 'string') return startStory(story)
    let found = false
    for (let guard = 0; guard < story.nodes.length; guard++) {
      const node = storyNode(story, state.node)
      if (node.choice) { found = node.id === choice.node; break }
      if (!node.next) break
      state = { ...state, node: node.next }
    }
    if (!found) return startStory(story)
    state = { ...state, beat: storyNode(story, state.node).beats.length }
    const next = chooseStory(story, state, choice.option)
    if (next === state) return startStory(story)
    state = next
  }
  for (let guard = 0; guard < story.nodes.length; guard++) {
    const node = storyNode(story, state.node)
    const maxBeat = node.choice || !node.next ? node.beats.length : node.beats.length - 1
    if (node.id === raw.node && Number.isInteger(raw.beat) && raw.beat! >= 0 && raw.beat! <= maxBeat) {
      return { ...state, beat: raw.beat! }
    }
    if (node.choice || !node.next) break
    state = { ...state, node: node.next }
  }
  return startStory(story)
}

export const storyMemories = (story: Story, state: StoryPosition) => state.choices.map((choice) =>
  storyNode(story, choice.node).choice!.options.find((option) => option.id === choice.option)!.memory,
)

export function storyTranscript(story: Story, state: StoryPosition): (Beat & { key: string })[] {
  const lines: (Beat & { key: string })[] = []
  let id = story.start
  for (let guard = 0; guard < story.nodes.length; guard++) {
    const node = storyNode(story, id)
    const count = id === state.node ? Math.min(state.beat + 1, node.beats.length) : node.beats.length
    lines.push(...node.beats.slice(0, count).map((beat, index) => ({ ...beat, key: `${id}:${index}` })))
    if (id === state.node) break
    const choice = state.choices.find((item) => item.node === id)
    const next = node.choice ? node.choice.options.find((item) => item.id === choice?.option)?.next : node.next
    if (!next) break
    id = next
  }
  return lines
}
