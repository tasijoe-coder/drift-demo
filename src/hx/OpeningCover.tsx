import { useEffect, useRef, useState } from 'react'
import { bgm } from './bgm'
import './opening.css'

export const COVER_TRANSITION_MS = 800

export function OpeningCover({ onEnter }: { onEnter: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const entered = useRef(false)
  useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(onEnter, COVER_TRANSITION_MS)
    return () => window.clearTimeout(timer)
  }, [leaving, onEnter])
  const enter = () => {
    if (entered.current) return
    entered.current = true
    bgm.setTrack('theme')
    bgm.unlock()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) onEnter()
    else setLeaving(true)
  }
  return <main className={`zero-page opening-cover${leaving ? ' opening-leaving' : ''}`} data-opening-phase={leaving ? 'transition' : 'cover'}>
    <div className="opening-art-frame" aria-hidden="true">
      <img className="opening-art" src="/icon-yuelao-v2-512.png" alt="" width="512" height="512" fetchPriority="high" />
      <svg className="opening-thread" viewBox="0 0 512 512" fill="none">
        <path pathLength="1" d="M 392 438 C 456 420 462 350 521 344 S 650 383 790 325" />
      </svg>
    </div>
    <div className="opening-wordmark">
      <h1>月老</h1>
      <div className="opening-title-rule" aria-hidden="true" />
      <p>七世人間</p>
    </div>
    <button type="button" className="opening-hitbox" aria-label="點擊任意處進入章節清單" onClick={enter} disabled={leaving}>
      <span className="opening-prompt">點擊任意處進入</span>
    </button>
  </main>
}
