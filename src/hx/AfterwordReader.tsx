import { useEffect, useMemo, useState } from 'react'
import { afterwordFinished, afterwordKey, afterwordStory, advanceAfterword, previousAfterword, restoreAfterword, startAfterword, type AfterwordOrigin } from './afterword_story'
import { storyNode, storyTranscript } from './theatre_story'
import './prologue.css'
import { ReaderHeader } from './ReaderHeader'
import { useReaderPreferences } from './reader_preferences'
import { useReadingPlayback } from './useReadingPlayback'
import { useBgmTrack } from './bgm'

export function AfterwordReader({ origin, onBack, onHome, onComplete, onBonus }: {
  origin: AfterwordOrigin; onBack: () => void; onHome: () => void; onComplete: () => void; onBonus: () => void
}) {
  const story = useMemo(() => afterwordStory(origin), [origin])
  const key = afterwordKey(origin)
  const [position, setPosition] = useState(() => {
    try { return restoreAfterword(story, JSON.parse(localStorage.getItem(key) ?? 'null')) }
    catch { return startAfterword(story) }
  })
  const [imageFailed, setImageFailed] = useState(false)
  const { large } = useReaderPreferences()
  const node = storyNode(story, position.node)
  useBgmTrack(node.bgm)
  const finished = afterwordFinished(story, position)
  const transcript = storyTranscript(story, position)
  const total = story.nodes.reduce((sum, n) => sum + n.beats.length, 0)
  const count = transcript.length
  const beat = node.beats[Math.min(position.beat, node.beats.length - 1)]
  const advance = () => {
    const next = advanceAfterword(story, position)
    setPosition(next)
    if (afterwordFinished(story, next)) onComplete()
  }
  const { log, auto, setAuto, next, gestures } = useReadingPlayback(position.node + ':' + position.beat, beat.text, finished, advance)
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(position)) } catch { /* Reading continues without storage. */ }
  }, [key, position])

  return <main className="zero-page">
    <div className={`zero-reader${large ? ' reader-large' : ''}`} data-afterword-node={node.id} data-beat={position.beat}>
      <ReaderHeader subtitle={story.title} onBack={onBack} backLabel="返回第七世結局" auto={auto && !finished} onAutoChange={finished ? undefined : setAuto} autoHint={finished ? '已讀完，可從頭重讀' : undefined} />
      <figure className="zero-still">
        {imageFailed ? <p className="zero-image-error">月老案前・暫代圖</p> :
          <img src="/art/zero/ledger.webp" alt="暫代畫面：月老案前的姻緣簿。後日談各場暫用同一張圖。" width="1200" height="800" onError={() => setImageFailed(true)} />}
        <figcaption>{node.setting}（暫代圖）</figcaption>
      </figure>
      <div className="zero-chapter-row"><span>{node.chapter}</span><span className="zero-progress" aria-label="閱讀進度">{count} / {total}</span></div>
      <div className="zero-progress-track" aria-hidden="true"><div style={{ width: `${count / total * 100}%` }} /></div>
      <section className="zero-reading-body" aria-label="歸天以後後日談">
        <div ref={log as React.RefObject<HTMLDivElement>} {...gestures} className="zero-log" role="log" aria-label="故事文字" aria-live={auto ? 'off' : 'polite'} tabIndex={0}>
          <div className="zero-lines">{transcript.map((line, index) => <article key={line.key} className={`zero-line${index === transcript.length - 1 ? ' zero-current' : ''}`}>
            {line.speaker && line.speaker !== '旁白' && <div className="zero-speaker">{line.speaker}</div>}<p>{line.text}</p>
          </article>)}
          {finished && <div className="zero-ending"><span>七世之後</span><h2>歸天以後・完</h2><p>七頁舊簿仍在。新的故事，將從新的名字開始。</p></div>}
          </div>
        </div>
      </section>
      <footer className="zero-footer">
        {finished ? <><button type="button" className="zero-primary" onClick={onBonus}>閱讀第八世・沈照微與陸聞笙<span aria-hidden="true">→</span></button><button type="button" className="zero-text-button" onClick={() => { setAuto(false); setPosition(startAfterword(story)) }}>重讀歸天以後</button><button type="button" className="zero-text-button" onClick={onBack}>返回第七世結局</button><button type="button" className="zero-text-button" onClick={onHome}>返回首頁</button></> : <>
          <div className="zero-navigation">
            <button type="button" className="zero-previous" disabled={position.node === story.start && position.beat === 0} onClick={() => { setAuto(false); setPosition(previousAfterword(story, position)) }}>上一句</button>
            <button type="button" className="zero-primary" onClick={next}>{position.beat === node.beats.length - 1 ? node.next ? '下一場' : '讀完後日談' : '下一句'}<span aria-hidden="true">↓</span></button>
          </div><p>{auto ? '自動閱讀中・開啟設定即可暫停' : '依自己的步調閱讀・向上可回看文字'}</p>
        </>}
      </footer>
    </div>
  </main>
}
