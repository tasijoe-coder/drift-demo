import { useEffect, useRef, useState } from 'react'
import type { Novel } from '../engine/novel'
import { ReaderHeader } from './ReaderHeader'
import { useReaderPreferences } from './reader_preferences'
import { endingCollection } from './ending_collection'
import './ending_archive.css'

export function EndingArchive({ entries, onBack }: { entries: { story: Novel; endings: string[] }[]; onBack: () => void }) {
  const { large } = useReaderPreferences()
  const heading = useRef<HTMLHeadingElement>(null)
  const detail = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState<ReturnType<typeof endingCollection>[number] | null>(null)
  const rows = entries.map(entry => ({ story: entry.story, cards: endingCollection(entry.story, entry.endings) }))
  const total = rows.reduce((sum, row) => sum + row.cards.length, 0)
  const known = rows.reduce((sum, row) => sum + row.cards.filter(card => card.known).length, 0)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  return <main className={`zero-page ending-archive${large ? ' reader-large' : ''}`}>
    <div className="ending-archive-inner">
      <ReaderHeader subtitle="姻緣圖鑑" onBack={onBack} backLabel="返回章節清單" />
      <h1 ref={heading} tabIndex={-1}>姻緣圖鑑</h1>
      <p className="archive-count">已收錄 {known} / {total}</p>
      <p className="archive-hint">那些親眼讀到的往後，都留在這裡。</p>
      {rows.map(row => <section key={row.story.id} className="archive-chapter" aria-label={row.story.title}>
        <h2>{row.story.title}</h2>
        {row.story.subtitle && <p className="archive-subtitle">{row.story.subtitle}</p>}
        <div className="archive-grid">{row.cards.map(card => <button type="button" key={card.id} disabled={!card.known}
          className={`archive-card${card.known ? ' is-collected' : ''}`} onClick={() => { setSelected(card); detail.current?.showModal() }}>
          <span className="archive-card-number">{String(card.number).padStart(2, '0')}</span>
          <strong>{card.title}</strong><small>{card.known ? '已收錄・查看摘錄' : '尚未讀到'}</small>
        </button>)}</div>
      </section>)}
      <dialog ref={detail} className="reader-settings archive-detail" aria-labelledby="ending-detail-title" onClick={event => {
        if (event.target !== detail.current) return
        const rect = detail.current.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) detail.current.close()
      }}>
        <div className="reader-settings-heading"><h2 id="ending-detail-title">{selected?.title}</h2><button type="button" onClick={() => detail.current?.close()}>關閉 ✕</button></div>
        <p className="archive-excerpt-label">結局摘錄</p>
        <div className="archive-excerpt">{selected?.excerpt.map((beat, index) => <p key={index}>{beat.speaker && beat.speaker !== '旁白' && <span className="zero-speaker">{beat.speaker}</span>}{beat.text}</p>)}</div>
      </dialog>
    </div>
  </main>
}
