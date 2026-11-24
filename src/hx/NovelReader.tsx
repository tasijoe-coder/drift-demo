import { useLayoutEffect, useRef, useState } from 'react'
import { advanceNovel, chooseNovel, finishNovel, novelNode, novelView, previousDecision, previousNovel, startNovel, type Novel, type NovelPosition } from '../engine/novel'
import { novelKeys } from './novel_save'
import { ReaderHeader } from './ReaderHeader'
import { useReaderPreferences } from './reader_preferences'
import './novel.css'

export function NovelReader({ story, position, onChange, onHome, endings, onFinish, onAfterword }: {
  story: Novel; position: NovelPosition; onChange: (next: NovelPosition) => void
  onHome: () => void; endings: string[]; onFinish: (id: string) => void
  onAfterword?: () => void
}) {
  const view = novelView(story, position)
  const label = story.title.split('・')[0]
  const bookmarkKey = novelKeys(story).bookmark
  const body = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const lastNode = useRef<string | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const { large: textSize } = useReaderPreferences()
  const remember = () => {
    try { localStorage.setItem(bookmarkKey, JSON.stringify({ node: position.node, top: body.current?.scrollTop ?? 0 })) } catch { /* Keep reading. */ }
  }
  useLayoutEffect(() => {
    // StrictMode replays effects on mount; do not reset an already restored bookmark.
    if (lastNode.current === position.node) return
    let top = 0
    if (lastNode.current === null) {
      try {
        const bookmark = JSON.parse(localStorage.getItem(bookmarkKey) ?? 'null')
        if (bookmark?.node === position.node && Number.isFinite(bookmark.top)) top = Math.max(0, bookmark.top)
      } catch { /* Start this scene at its beginning. */ }
    }
    body.current?.scrollTo({ top, behavior: 'instant' })
    heading.current?.focus({ preventScroll: true })
    lastNode.current = position.node
  }, [position.node, bookmarkKey])
  const change = (next: NovelPosition) => {
    if (next === position) return
    try { localStorage.removeItem(bookmarkKey) } catch { /* Optional bookmark. */ }
    onChange(next)
  }
  const finish = () => { onFinish(view.node.id); onChange(finishNovel(story, position)) }
  return <main className="zero-page">
    <div className={`zero-reader novel-reader${textSize ? ' novel-large' : ''}`} data-novel-node={view.node.id}>
      <ReaderHeader subtitle={story.title} onBack={() => { remember(); onHome() }} />
      <figure className="zero-still novel-placeholder">
        {imageFailed ? <p className="zero-image-error">月老案前・暫代圖</p> : <img src="/art/zero/ledger.webp" alt={`暫代畫面：月老在渡口的姻緣簿前。${label}各段使用同一張圖。`} width="1200" height="800" onError={() => setImageFailed(true)} />}
        <figcaption>姻緣簿・{label}（暫代圖）</figcaption>
      </figure>
      <div className="zero-chapter-row"><span>{view.node.chapter}</span><span className="zero-progress">第 {view.route.length} / {story.pageCount} 段</span></div>
      <div className="zero-progress-track" aria-hidden="true"><div style={{ width: `${view.route.length / story.pageCount * 100}%` }} /></div>
      <section className="novel-body" ref={body} tabIndex={0} aria-label={`${label}小說正文`} onScroll={remember}>
        <h1 ref={heading} tabIndex={-1}>{view.node.title}</h1>
        {view.beats.map((beat, i) => <article className="novel-paragraph" key={i}>
          {beat.speaker && beat.speaker !== '旁白' && <span className="zero-speaker">{beat.speaker}</span>}
          <p>{beat.text}</p>
        </article>)}
        {view.node.choice && <section className="novel-choice" aria-label="劇情選擇">
          <p className="novel-choice-note">你是月老，能留下機會，不能替人決定心意。</p>
          <h2>{view.node.choice.prompt}</h2>
          {view.options.map(option => <button type="button" key={option.id} onClick={() => change(chooseNovel(story, position, option.id))}>
            <strong>{option.label}</strong><span>{option.detail}</span>
          </button>)}
          <p className="novel-choice-note">選擇後自動保存；可回到先前的分歧重讀。</p>
        </section>}
        {view.node.next && <button type="button" className="zero-primary novel-next" onClick={() => change(advanceNovel(story, position))}>讀下一段</button>}
        {view.node.ending && <section className="zero-ending novel-ending" aria-label="本世結局">
          <span>{view.node.perfect ? '相伴至白首' : '此路至此'}</span>
          <h2>{view.node.title}</h2>
          {!position.finished ? <button type="button" className="zero-primary" onClick={finish}>讀完{label}・記下這個結局</button> : <p role="status">已記下這個結局</p>}
          {position.finished && onAfterword && <button type="button" className="zero-primary" onClick={onAfterword}>接著閱讀後日談・歸天以後</button>}
          <p className="novel-ending-count">已讀結局 {endings.length} / {story.nodes.filter(node => node.ending).length}</p>
          <div className="novel-ending-list">{story.nodes.filter(node => node.ending).map(node => <span key={node.id}>{endings.includes(node.id) ? node.title : '尚未讀到的結局'}</span>)}</div>
          <button type="button" className="zero-text-button" onClick={() => change(previousDecision(story, position))}>回到上一個選擇</button>
          <button type="button" className="zero-text-button" onClick={() => change(startNovel(story))}>從相遇重新閱讀{label}</button>
          <button type="button" className="zero-text-button" onClick={onHome}>返回首頁</button>
        </section>}
      </section>
      <footer className="novel-footer">
        <button type="button" disabled={view.route.length === 1} onClick={() => change(previousNovel(story, position))}>上一段</button>
        <button type="button" disabled={!position.choices.length} onClick={() => change(previousDecision(story, position))}>上一個選擇</button>
        <button type="button" onClick={() => body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' })}>{view.node.choice ? '前往選擇' : view.node.ending ? '前往結尾' : '本段末尾'}</button>
      </footer>
    </div>
  </main>
}

export function NovelEntry({ story, position, unlocked, onBegin, lovers, unlockHint, primary = false }: {
  story: Novel; position: NovelPosition; unlocked: boolean; onBegin: () => void; lovers: string; unlockHint: string
  primary?: boolean
}) {
  const hasProgress = position.node !== story.start
  const label = story.title.split('・')[0]
  const ordinal = label.replace('第', '').replace('世', '')
  const endingCount = story.nodes.filter(node => node.ending).length
  return <div className={`novel-entry${primary ? ' novel-entry-primary' : ''}`}>
    {primary && <p className="home-current-label">接續姻緣</p>}
    <button type="button" className={`zero-primary${primary ? ' home-primary' : ' zero-secondary'}`} disabled={!unlocked} onClick={() => { if (unlocked) onBegin() }}>
      {unlocked ? position.finished ? `重訪${label}` : hasProgress ? `繼續閱讀${label}` : `閱讀${label}` : `${label}・尚未開啟`}
      <span aria-hidden="true">{unlocked ? ordinal : '鎖'}</span>
    </button>
    <p>{unlocked ? `${lovers}｜${endingCount} 個結局・每輪六次選擇${hasProgress ? `｜上次：${novelNode(story, position.node).title}` : ''}` : unlockHint}</p>
  </div>
}
