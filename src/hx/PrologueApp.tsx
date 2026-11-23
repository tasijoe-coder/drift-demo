import { useEffect, useMemo, useRef, useState } from 'react'
import { storyNode, storyTranscript, type StoryPosition } from './theatre_story'
import { nextZero, previousZero, restoreZero, startZero, ZERO_SAVE_KEY, zeroDelay, zeroFinished, zeroReadCount, zeroStills, zeroStory, zeroTotal } from './zero_story'
import { isMuted, setMuted, sfx, unlock } from './sfx'
import { NOVELS } from '../data/lives'
import type { NovelPosition } from '../engine/novel'
import { NovelEntry, NovelReader } from './NovelReader'
import { readZeroUnlock, ZERO_COMPLETED_KEY } from './novel_save'
import { useNovelProgress } from './useNovelProgress'
import './prologue.css'

function loadPosition() {
  try { return restoreZero(JSON.parse(localStorage.getItem(ZERO_SAVE_KEY) ?? 'null')) }
  catch { return startZero() }
}

const qin = NOVELS[0]
const jin = NOVELS[1]
const tang = NOVELS[2]
const song = NOVELS[3]
function loadCompleted() {
  try { return readZeroUnlock(localStorage) }
  catch { return zeroFinished(loadPosition()) }
}

function Still({ id, caption }: { id: string; caption: string }) {
  const [failed, setFailed] = useState(false)
  const still = zeroStills[id]
  return <figure className="zero-still" data-still={id}>
    {failed ? <p className="zero-image-error">場景圖片暫時無法載入，仍可繼續閱讀。</p> :
      <img key={still.src} src={still.src} alt={still.alt} width="1536" height="1024" decoding="async" fetchPriority="high" onError={() => setFailed(true)} />}
    <figcaption>{caption}</figcaption>
  </figure>
}

export function PrologueApp() {
  const [position, setPosition] = useState(loadPosition)
  const [reading, setReading] = useState<'home' | 'zero' | 'qin' | 'jin' | 'tang' | 'song'>('home')
  const qinProgress = useNovelProgress(qin)
  const jinProgress = useNovelProgress(jin)
  const tangProgress = useNovelProgress(tang)
  const songProgress = useNovelProgress(song)
  const [completed, setCompleted] = useState(loadCompleted)
  const [muted, setMute] = useState(isMuted)
  const hasProgress = position.node !== zeroStory.start || position.beat > 0
  const finished = zeroFinished(position)
  const qinUnlocked = completed || finished
  const jinUnlocked = qinUnlocked && qinProgress.completed
  const tangUnlocked = jinUnlocked && jinProgress.completed
  const songUnlocked = tangUnlocked && tangProgress.completed

  useEffect(() => { document.title = '紅線千年｜杯中月與四世姻緣' }, [])
  useEffect(() => {
    try { localStorage.setItem(ZERO_SAVE_KEY, JSON.stringify(position)) } catch { /* Reading remains available without storage. */ }
  }, [position])
  useEffect(() => {
    if (qinUnlocked) {
      try { localStorage.setItem(ZERO_COMPLETED_KEY, 'true') } catch { /* Session unlock remains available. */ }
    }
  }, [qinUnlocked])
  useEffect(() => {
    // Small compressed stills are cached before the reader reaches their sentence.
    const images = Object.values(zeroStills).map(still => {
      const image = new Image()
      image.src = still.src
      return image
    })
    return () => { images.forEach(image => { image.onload = null }) }
  }, [])

  const begin = async (restart = false) => {
    if (restart) setPosition(startZero())
    setReading('zero')
    try { await unlock() } catch { /* Audio must never prevent reading. */ }
  }
  const toggleSound = () => { setMuted(!muted); setMute(!muted) }
  const changeZero = (value: StoryPosition | ((previous: StoryPosition) => StoryPosition)) => {
    const next = typeof value === 'function' ? value(position) : value
    setPosition(next)
    if (zeroFinished(next)) setCompleted(true)
  }
  const changeQin = (next: NovelPosition) => { if (qinUnlocked) qinProgress.setPosition(next) }
  const changeJin = (next: NovelPosition) => { if (jinUnlocked) jinProgress.setPosition(next) }
  const changeTang = (next: NovelPosition) => { if (tangUnlocked) tangProgress.setPosition(next) }
  const changeSong = (next: NovelPosition) => { if (songUnlocked) songProgress.setPosition(next) }

  if (reading === 'zero') return <PrologueReader position={position} onChange={changeZero} onHome={() => setReading('home')} muted={muted} onToggleSound={toggleSound} />
  if (reading === 'qin' && qinUnlocked) return <NovelReader key={qin.id} story={qin} position={qinProgress.position} onChange={changeQin} onHome={() => setReading('home')} endings={qinProgress.endings} onFinish={qinProgress.finish} />
  if (reading === 'jin' && jinUnlocked) return <NovelReader key={jin.id} story={jin} position={jinProgress.position} onChange={changeJin} onHome={() => setReading('home')} endings={jinProgress.endings} onFinish={jinProgress.finish} />
  if (reading === 'tang' && tangUnlocked) return <NovelReader key={tang.id} story={tang} position={tangProgress.position} onChange={changeTang} onHome={() => setReading('home')} endings={tangProgress.endings} onFinish={tangProgress.finish} />
  if (reading === 'song' && songUnlocked) return <NovelReader key={song.id} story={song} position={songProgress.position} onChange={changeSong} onHome={() => setReading('home')} endings={songProgress.endings} onFinish={songProgress.finish} />
  return <main className="zero-page zero-home">
    <div className="zero-home-inner">
      <div className="zero-home-top"><span>一段姻緣，從天上說起</span><button type="button" onClick={toggleSound} aria-pressed={muted}>{muted ? '音效關' : '音效開'}</button></div>
      <div className="zero-title-mark" aria-hidden="true">緣</div>
      <h1>紅線千年</h1>
      <p className="zero-home-subtitle">杯中月・四世人間</p>
      <Still id="banquet" caption="瑤池・七夕宴" />
      <p className="zero-home-copy">他們還不知道，<br />有一天，連記得彼此都會成為奢望。</p>
      <p className="zero-home-role">你是月老，見證這段姻緣的開始。</p>
      <div className="zero-home-actions">
        <button type="button" className="zero-primary" onClick={() => void begin(finished)}>{finished ? '重讀第〇世' : hasProgress ? '繼續閱讀第〇世' : '閱讀第〇世'}<span aria-hidden="true">→</span></button>
        <NovelEntry story={qin} position={qinProgress.position} unlocked={qinUnlocked} onBegin={() => setReading('qin')} lovers="孟姜女・范喜良" unlockHint="讀完第〇世後開啟" />
        <NovelEntry story={jin} position={jinProgress.position} unlocked={jinUnlocked} onBegin={() => setReading('jin')} lovers="梁山伯・祝英台" unlockHint="讀完第一世任一結局後開啟" />
        <NovelEntry story={tang} position={tangProgress.position} unlocked={tangUnlocked} onBegin={() => setReading('tang')} lovers="王月英・郭華" unlockHint="讀完第二世任一結局後開啟" />
        <NovelEntry story={song} position={songProgress.position} unlocked={songUnlocked} onBegin={() => setReading('song')} lovers="錢玉蓮・王十朋" unlockHint="讀完第三世任一結局後開啟" />
        {hasProgress && !finished && <button type="button" className="zero-text-button" onClick={() => void begin(true)}>從頭閱讀</button>}
      </div>
      <p className="zero-home-note">依序開啟・各世進度分開保存<br />第一至第四世每輪約 45–60 分鐘，依閱讀速度而異</p>
    </div>
  </main>
}

function PrologueReader({ position, onChange, onHome, muted, onToggleSound }: {
  position: StoryPosition; onChange: (value: StoryPosition | ((previous: StoryPosition) => StoryPosition)) => void
  onHome: () => void; muted: boolean; onToggleSound: () => void
}) {
  const [auto, setAuto] = useState(false)
  const [visible, setVisible] = useState(() => !document.hidden)
  const log = useRef<HTMLDivElement>(null)
  const endHeading = useRef<HTMLHeadingElement>(null)
  const node = storyNode(zeroStory, position.node)
  const beat = node.beats[Math.min(position.beat, node.beats.length - 1)]
  const finished = zeroFinished(position)
  const count = zeroReadCount(position)
  const transcript = useMemo(() => storyTranscript(zeroStory, position), [position])
  const first = position.node === zeroStory.start && position.beat === 0

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  useEffect(() => {
    if (!auto || finished || !visible) return
    const timer = window.setTimeout(() => onChange(nextZero), zeroDelay(beat.text))
    return () => window.clearTimeout(timer)
  }, [auto, finished, visible, beat.text, position, onChange])
  useEffect(() => {
    if (log.current) log.current.scrollTo({ top: log.current.scrollHeight, behavior: 'instant' })
    if (finished) endHeading.current?.focus({ preventScroll: true })
  }, [position, finished])
  useEffect(() => {
    if (finished) return
    if (beat.sound === 'knock') sfx.warn()
    if (beat.sound === 'bell') sfx.heaven()
  }, [beat, finished])

  const replay = () => { setAuto(false); onChange(startZero()) }
  return <main className="zero-page">
    <div className="zero-reader" data-node={node.id} data-beat={position.beat}>
      <header className="zero-header">
        <button type="button" aria-label="返回首頁" onClick={onHome}>← 返回</button>
        <div>紅線千年<small>第〇世・杯中月</small></div>
        <button type="button" onClick={onToggleSound} aria-pressed={muted}>{muted ? '音效關' : '音效開'}</button>
      </header>
      <Still key={beat.still} id={beat.still!} caption={node.setting} />
      <div className="zero-chapter-row"><span>{node.chapter}</span><span className="zero-progress" aria-label="閱讀進度">{count} / {zeroTotal}</span>
        {!finished && <button type="button" aria-pressed={auto} onClick={() => setAuto(value => !value)}>{auto ? '暫停自動' : '自動閱讀'}</button>}
        {finished && <span>第〇世・終</span>}
      </div>
      <div className="zero-progress-track" aria-hidden="true"><div style={{ width: `${count / zeroTotal * 100}%` }} /></div>
      <section className="zero-reading-body" aria-label="第〇世小說">
        <div ref={log} className="zero-log" role="log" aria-label="故事文字" aria-live={auto ? 'off' : 'polite'} tabIndex={0}>
          <div className="zero-lines">{transcript.map((line, index) => <article key={line.key} className={`zero-line${index === transcript.length - 1 ? ' zero-current' : ''}`}>
            <div className="zero-speaker">{line.speaker}</div><p>{line.text}</p>
          </article>)}
          {finished && <div className="zero-ending">
            <span>緣起至此</span><h2 ref={endHeading} tabIndex={-1}>第〇世・完</h2>
            <p>紅線已繫，前塵將忘。<br />你記得他們還在天上時的模樣。</p>
          </div>}
          </div>
        </div>
      </section>
      <footer className="zero-footer">
        {finished ? <><button type="button" className="zero-primary" onClick={replay}>重讀第〇世<span aria-hidden="true">↺</span></button><button type="button" className="zero-text-button" onClick={onHome}>返回首頁</button></> : <>
          <div className="zero-navigation"><button type="button" className="zero-previous" disabled={first} onClick={() => { setAuto(false); onChange(previousZero) }}>上一句</button>
            <button type="button" className="zero-primary" onClick={() => onChange(nextZero)}>{position.beat === node.beats.length - 1 ? node.next ? '下一場' : '讀完第〇世' : '下一句'}<span aria-hidden="true">↓</span></button>
          </div><p>依自己的步調閱讀・向上可回看文字</p>
        </>}
      </footer>
    </div>
  </main>
}
