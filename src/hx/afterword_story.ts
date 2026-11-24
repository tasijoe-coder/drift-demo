import content from '../data/lives/heaven-afterword.json'
import { advanceStory, restoreStory, startStory, storyNode, type Story, type StoryPosition } from './theatre_story'
import type { BgmTrack } from '../data/bgm'

export type AfterwordOrigin = keyof typeof content.intros
export const isAfterwordOrigin = (id: string): id is AfterwordOrigin => Object.hasOwn(content.intros, id)
export function afterwordStory(origin: AfterwordOrigin): Story {
  return {
    id: content.id, title: content.title, start: 'coda-entry',
    nodes: [{
      id: 'coda-entry', chapter: '序場・第七世之後', setting: '七世已畢・各自的來路', scene: 'heaven',
      bgm: content.bgm as BgmTrack,
      next: content.scenes[0].id,
      beats: content.intros[origin].map(([speaker, text]) => ({ speaker, text, pose: 'still', still: 'ledger' })),
    }, ...content.scenes.map((scene, index) => ({
      ...scene, bgm: scene.bgm as BgmTrack, scene: 'heaven', next: content.scenes[index + 1]?.id,
    }))],
  }
}
export const afterwordKey = (origin: AfterwordOrigin) => `hx.theatre.heaven-afterword.${origin}.v2`
export const AFTERWORD_COMPLETED_KEY = 'hx.theatre.heaven-afterword.completed.v1'
export function readAfterwordUnlock(storage: Pick<Storage, 'getItem'>): boolean {
  try { if (storage.getItem(AFTERWORD_COMPLETED_KEY) === 'true') return true } catch { /* Try saved readings. */ }
  for (const origin of Object.keys(content.intros) as AfterwordOrigin[]) {
    try {
      const story = afterwordStory(origin)
      if (afterwordFinished(story, restoreAfterword(story, JSON.parse(storage.getItem(afterwordKey(origin)) ?? 'null')))) return true
    } catch { /* One damaged reading must not hide another completed entry. */ }
  }
  return false
}
export const afterwordFinished = (story: Story, position: StoryPosition) => {
  const node = storyNode(story, position.node)
  return !node.next && position.beat === node.beats.length
}
export const advanceAfterword = advanceStory
export const restoreAfterword = restoreStory
export const startAfterword = startStory
export function previousAfterword(story: Story, position: StoryPosition): StoryPosition {
  if (position.beat > 0) return { ...position, beat: position.beat - 1 }
  const index = story.nodes.findIndex(node => node.id === position.node)
  if (index <= 0) return position
  const previous = story.nodes[index - 1]
  return { node: previous.id, beat: previous.beats.length - 1, choices: [] }
}
