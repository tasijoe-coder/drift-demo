import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { isReadingTap, readingDelay } from './reading_timing'

/** Shared input rules. Native scrolling and text selection remain available. */
export function useReadingPlayback(progress: string, text: string, blocked: boolean, advance: () => void, imageChanged = false) {
  const [auto, setAuto] = useState(false)
  const log = useRef<HTMLElement>(null)
  const mounted = useRef(false)
  const lastTop = useRef(0)
  const pointer = useRef<{ id: number; x: number; y: number; time: number; distance: number } | null>(null)
  useLayoutEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: mounted.current ? 'smooth' : 'instant' })
    mounted.current = true
  }, [progress])
  useEffect(() => {
    const hide = () => { if (document.hidden) setAuto(false) }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [])
  useEffect(() => {
    if (!auto || blocked || document.hidden) return
    const timer = window.setTimeout(advance, readingDelay(text, imageChanged))
    return () => window.clearTimeout(timer)
  }, [auto, blocked, progress, text, advance, imageChanged])
  const next = () => { if (!blocked) advance() }
  const move = (event: PointerEvent<HTMLElement>) => {
    const start = pointer.current
    if (!start || start.id !== event.pointerId) return
    start.distance = Math.max(start.distance, Math.hypot(event.clientX - start.x, event.clientY - start.y))
    if (event.clientY - start.y >= 10) setAuto(false)
  }
  return { log, auto: auto && !blocked, setAuto, next, gestures: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (!event.isPrimary || event.button !== 0) return
      pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), distance: 0 }
    },
    onPointerMove: move,
    onPointerCancel: () => { pointer.current = null; setAuto(false) },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      move(event)
      const start = pointer.current
      pointer.current = null
      if (!start || start.id !== event.pointerId || !isReadingTap(start.distance, performance.now() - start.time)) return
      if ((event.target as HTMLElement).closest('button,a,input,select,textarea,h1,h2,.novel-choice,.zero-ending')) return
      if (window.getSelection()?.toString()) return
      next()
    },
    onWheel: (event: { deltaY: number }) => { if (event.deltaY < 0) setAuto(false) },
    onScroll: (event: { currentTarget: HTMLElement }) => {
      const top = event.currentTarget.scrollTop
      if (top < lastTop.current - 1) setAuto(false)
      lastTop.current = top
    },
    onKeyDown: (event: { key: string }) => { if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) setAuto(false) },
  } }
}
