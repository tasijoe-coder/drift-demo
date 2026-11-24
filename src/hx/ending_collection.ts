import type { Novel } from '../engine/novel'

/** Unknown entries deliberately contain neither titles nor prose. No save writes. */
export function endingCollection(story: Novel, collected: readonly string[]) {
  return story.nodes.filter(node => node.ending).map((node, index) => {
    const known = collected.includes(node.id)
    return { id: node.id, number: index + 1, known,
      title: known ? node.title : '未收錄',
      excerpt: known ? node.beats.filter(beat => !beat.when).slice(0, 3) : [],
    }
  })
}
