import { useEffect, useState } from 'react'
import { startNovel, type Novel } from '../engine/novel'
import { novelKeys, readEndings, readNovel, readNovelCompleted } from './novel_save'

/** Each lifetime owns its progress, bookmark, collection and permanent completion. */
export function useNovelProgress(story: Novel) {
  const keys = novelKeys(story)
  const [position, setPosition] = useState(() => {
    try { return readNovel(localStorage, story) } catch { return startNovel(story) }
  })
  const [endings, setEndings] = useState<string[]>(() => {
    try { return readEndings(localStorage, story) } catch { return [] }
  })
  const [completed, setCompleted] = useState(() => {
    try { return readNovelCompleted(localStorage, story) } catch { return false }
  })
  const everCompleted = completed || position.finished || endings.length > 0
  useEffect(() => {
    try { localStorage.setItem(keys.save, JSON.stringify(position)) } catch { /* Keep session progress. */ }
  }, [keys.save, position])
  useEffect(() => {
    try { localStorage.setItem(keys.endings, JSON.stringify(endings)) } catch { /* Keep session collection. */ }
  }, [keys.endings, endings])
  useEffect(() => {
    if (everCompleted) {
      try { localStorage.setItem(keys.completed, 'true') } catch { /* Keep session completion. */ }
    }
  }, [keys.completed, everCompleted])
  const finish = (id: string) => {
    if (!story.nodes.some(node => node.id === id && node.ending)) return
    setCompleted(true)
    setEndings(current => current.includes(id) ? current : [...current, id])
  }
  return { position, setPosition, endings, completed: everCompleted, finish }
}
