import content from '../data/lives/lifetime-zero.json'
import { advanceStory, restoreStory, startStory, storyNode, type Story, type StoryPosition } from './theatre_story'

export const zeroStory: Story = content
// Keep the older theatre/card saves intact: this revision has different sentence boundaries.
export const ZERO_SAVE_KEY = 'hx.theatre.lifetime-zero.v2'
export const zeroStills: Record<string, { src: string; alt: string }> = {
  banquet: { src: '/art/zero/banquet.webp', alt: '瑤池燈下，金童與玉女奉酒，月老坐在案邊寫簿。' },
  wound: { src: '/art/zero/wound.webp', alt: '碎盞落在階邊，玉女扶住金童受傷的手。' },
  court: { src: '/art/zero/court.webp', alt: '玉帝臨階宣判，月老上前求情，金童玉女並肩聽候。' },
  bridge: { src: '/art/zero/bridge.webp', alt: '輪迴渡口，月老持著紅線與姻緣簿，金童玉女相對道別。' },
  ledger: { src: '/art/zero/ledger.webp', alt: '兩人已離開，月老獨留渡口，筆停在姻緣簿上。' },
}

export const zeroTotal = zeroStory.nodes.reduce((count, node) => count + node.beats.length, 0)
export const restoreZero = (raw: unknown) => restoreStory(zeroStory, raw)
export const zeroFinished = (position: StoryPosition) => {
  const node = storyNode(zeroStory, position.node)
  return !node.next && position.beat === node.beats.length
}
export const zeroReadCount = (position: StoryPosition) => {
  let count = 0
  for (const node of zeroStory.nodes) {
    if (node.id === position.node) return count + Math.min(position.beat + 1, node.beats.length)
    count += node.beats.length
  }
  return count
}
export function previousZero(position: StoryPosition): StoryPosition {
  const index = zeroStory.nodes.findIndex(node => node.id === position.node)
  if (position.beat > 0) return { ...position, beat: position.beat - 1 }
  if (index < 1) return position
  const previous = zeroStory.nodes[index - 1]
  return { node: previous.id, beat: previous.beats.length - 1, choices: [] }
}
export const nextZero = (position: StoryPosition) => advanceStory(zeroStory, position)
export const startZero = () => startStory(zeroStory)
export { readingDelay as zeroDelay } from './reading_timing'
