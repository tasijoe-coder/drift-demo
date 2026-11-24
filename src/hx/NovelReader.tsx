import { useEffect, useRef, useState } from 'react'
import { useReadingPlayback } from './useReadingPlayback'
import { useBgmTrack } from './bgm'
import { splitReadingText } from './reading_timing'
import { advanceNovel, chooseNovel, finishNovel, novelNode, novelView, previousDecision, previousNovel, startNovel, type Novel, type NovelPosition } from '../engine/novel'
import { novelKeys } from './novel_save'
import { ReaderHeader } from './ReaderHeader'
import { useReaderPreferences } from './reader_preferences'
import './novel.css'

type ReaderProps = {
  story: Novel; position: NovelPosition; onChange: (next: NovelPosition) => void
  onHome: () => void; endings: string[]; onFinish: (id: string) => void; onAfterword?: () => void
}
export function NovelReader(props: ReaderProps) {
  return <NovelScene key={props.position.node + JSON.stringify(props.position.choices)} {...props} />
}
function NovelScene({ story, position, onChange, onHome, endings, onFinish, onAfterword }: ReaderProps) {
  const view = novelView(story, position)
  useBgmTrack(view.node.bgm)
  const label = story.title.split('・')[0]
  const bookmarkKey = novelKeys(story).bookmark
  const [imageFailed, setImageFailed] = useState(false)
  const { large: textSize } = useReaderPreferences()
  const sentences = view.beats.flatMap(beat => splitReadingText(beat.text).map(text => ({ ...beat, text })))
  const preceding = view.route.at(-2)
  const context = preceding ? novelView(story, preceding).beats.flatMap(beat => splitReadingText(beat.text).map(text => ({ ...beat, text }))).slice(-4) : []
  const [count, setCount] = useState(() => {
    if (position.finished) return sentences.length
    try {
      const saved = JSON.parse(localStorage.getItem(bookmarkKey) ?? 'null')
      if (saved?.node === position.node && JSON.stringify(saved.choices) === JSON.stringify(position.choices) && Number.isInteger(saved.count))
        return Math.max(1, Math.min(sentences.length, saved.count))
    } catch { /* Older scroll bookmarks start at the first sentence. */ }
    return 1
  })
  const full = count >= sentences.length
  const blocked = full && !!(view.node.choice || view.node.ending)
  const remember = () => {
    try { localStorage.setItem(bookmarkKey, JSON.stringify({ node: position.node, count, choices: position.choices, top: body.current?.scrollTop ?? 0 })) } catch { /* Keep reading. */ }
  }
  const advance = () => {
    if (count < sentences.length) setCount(count + 1)
    else if (view.node.next) onChange(advanceNovel(story, position))
  }
  const { log: body, auto, setAuto, next, gestures } = useReadingPlayback(position.node + ':' + count, sentences[count - 1]?.text ?? '', blocked, advance)
  useEffect(() => {
    try { localStorage.setItem(bookmarkKey, JSON.stringify({ node: position.node, count, choices: position.choices })) } catch { /* Reading continues. */ }
  }, [bookmarkKey, position.node, position.choices, count])
  const change = (next: NovelPosition, revisit = false) => {
    setAuto(false)
    if (next === position) return
    try {
      if (revisit) {
        const count = novelView(story, next).beats.flatMap(beat => splitReadingText(beat.text)).length
        localStorage.setItem(bookmarkKey, JSON.stringify({ node: next.node, count, choices: next.choices }))
      } else localStorage.removeItem(bookmarkKey)
    } catch { /* Optional bookmark. */ }
    onChange(next)
  }
  const finish = () => { onFinish(view.node.id); onChange(finishNovel(story, position)) }
  return <main className="zero-page">
    <div className={`zero-reader novel-reader${textSize ? ' novel-large' : ''}`} data-novel-node={view.node.id}>
      <ReaderHeader subtitle={story.title} onBack={() => { remember(); onHome() }} auto={auto} onAutoChange={blocked ? undefined : setAuto} autoHint={blocked ? "已到選擇或結尾，請依自己的步調繼續" : undefined} />
      <figure className="zero-still novel-placeholder">
        {imageFailed ? <p className="zero-image-error">月老案前・暫代圖</p> : <img src="/art/zero/ledger.webp" alt={`暫代畫面：月老在渡口的姻緣簿前。${label}各段使用同一張圖。`} width="1200" height="800" onError={() => setImageFailed(true)} />}
        <figcaption>姻緣簿・{label}（暫代圖）</figcaption>
      </figure>
      <div className="zero-chapter-row"><span>{view.node.chapter}</span><span className="zero-progress">{count} / {sentences.length} 句</span></div>
      <div className="zero-progress-track" aria-hidden="true"><div style={{ width: `${view.route.length / story.pageCount * 100}%` }} /></div>
      <section className="novel-body" ref={body} {...gestures} tabIndex={0} aria-label={`${label}小說正文`} onScroll={event => { gestures.onScroll(event); remember() }}>
        {context.map((beat, i) => <article className="novel-paragraph novel-history" key={`context-${i}`}>
          {beat.speaker && beat.speaker !== '旁白' && <span className="zero-speaker">{beat.speaker}</span>}<p>{beat.text}</p>
        </article>)}
        <h1 tabIndex={-1}>{view.node.title}</h1>
        {sentences.slice(0, count).map((beat, i) => <article className={`novel-paragraph${i === count - 1 ? " reading-new" : ""}`} key={i}>
          {beat.speaker && beat.speaker !== '旁白' && <span className="zero-speaker">{beat.speaker}</span>}
          <p>{beat.text}</p>
        </article>)}
        {full && view.node.choice && <ChoiceGate key={view.node.id}>
          <p className="novel-choice-note">你是月老，能留下機會，不能替人決定心意。</p>
          <h2>{view.node.choice.prompt}</h2>
          {view.options.map(option => <button type="button" key={option.id} onClick={() => change(chooseNovel(story, position, option.id))}>
            <strong>{option.label}</strong><span>{option.detail}</span>
          </button>)}
          <p className="novel-choice-note">選擇後自動保存；可回到先前的分歧重讀。</p>
        </ChoiceGate>}
        {full && view.node.ending && <section className="zero-ending novel-ending" aria-label="本世結局">
          <span>{view.node.perfect ? '相伴至白首' : '此路至此'}</span>
          <h2>{view.node.title}</h2>
          {!position.finished ? <button type="button" className="zero-primary" onClick={finish}>讀完{label}・記下這個結局</button> : <p role="status">已記下這個結局</p>}
          {position.finished && onAfterword && <button type="button" className="zero-primary" onClick={onAfterword}>接著閱讀後日談・歸天以後</button>}
          <p className="novel-ending-count">已讀結局 {endings.length} / {story.nodes.filter(node => node.ending).length}</p>
          <div className="novel-ending-list">{story.nodes.filter(node => node.ending).map(node => <span key={node.id}>{endings.includes(node.id) ? node.title : '尚未讀到的結局'}</span>)}</div>
          <button type="button" className="zero-text-button" onClick={() => change(previousDecision(story, position), true)}>回到上一個選擇</button>
          <button type="button" className="zero-text-button" onClick={() => change(startNovel(story))}>從相遇重新閱讀{label}</button>
          <button type="button" className="zero-text-button" onClick={onHome}>返回首頁</button>
        </section>}
      </section>
      <footer className="novel-footer">
        <button type="button" disabled={view.route.length === 1} onClick={() => change(previousNovel(story, position), true)}>上一段</button>
        <button type="button" disabled={!position.choices.length} onClick={() => change(previousDecision(story, position), true)}>上一個選擇</button>
        <button type="button" className="novel-advance" onClick={() => blocked ? body.current?.scrollTo({ top: body.current.scrollHeight, behavior: 'smooth' }) : next()}>{blocked ? view.node.choice ? '前往選擇' : '前往結尾' : full ? '下一段' : '下一句'}</button>
      </footer>
    </div>
  </main>
}

function ChoiceGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const entered = useRef(0)
  useEffect(() => {
    entered.current = performance.now()
    const timer = window.setTimeout(() => setReady(true), 400)
    return () => window.clearTimeout(timer)
  }, [])
  return <section className="novel-choice" aria-label="劇情選擇" onClickCapture={event => {
    if (performance.now() - entered.current < 400) { event.preventDefault(); event.stopPropagation() }
  }}><fieldset disabled={!ready}>{children}</fieldset></section>
}

export function NovelEntry({ story, position, unlocked, onBegin, lovers, unlockHint, primary = false }: {
  story: Novel; position: NovelPosition; unlocked: boolean; onBegin: () => void; lovers: string; unlockHint: string
  primary?: boolean
}) {
  let hasSentenceProgress = false
  try { hasSentenceProgress = (JSON.parse(localStorage.getItem(novelKeys(story).bookmark) ?? 'null')?.count ?? 1) > 1 } catch { /* Optional progress label. */ }
  const hasProgress = position.node !== story.start || hasSentenceProgress
  const label = story.title.split('・')[0]
  const ordinal = label.replace('第', '').replace('世', '')
  const endingCount = story.nodes.filter(node => node.ending).length
  return <div className={`novel-entry${primary ? ' novel-entry-primary' : ''}`}>
    {primary && <p className="home-current-label">接續姻緣</p>}
    <button type="button" className={`zero-primary${primary ? ' home-primary' : ' zero-secondary'}`} disabled={!unlocked} onClick={() => { if (unlocked) onBegin() }}>
      <span className={primary ? 'home-action-copy' : undefined}>{primary ? `繼續閱讀 ${label}` : unlocked ? position.finished ? `重訪${label}` : hasProgress ? `繼續閱讀${label}` : `閱讀${label}` : `${label}・尚未開啟`}
      {primary && <small>上次停在：{novelNode(story, position.node).title}</small>}</span>
      <span aria-hidden="true">{unlocked ? ordinal : '鎖'}</span>
    </button>
    {!primary && <p>{unlocked ? `${lovers}｜${endingCount} 個結局` : unlockHint}</p>}
  </div>
}
