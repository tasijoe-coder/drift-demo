import { useEffect, useMemo, useRef, useState } from 'react'
import { storyNode, storyTranscript, type StoryPosition } from './theatre_story'
import { nextZero, previousZero, restoreZero, startZero, ZERO_SAVE_KEY, zeroDelay, zeroFinished, zeroReadCount, zeroStills, zeroStory, zeroTotal } from './zero_story'
import { isMuted, setMuted, sfx, unlock } from './sfx'
import { NOVELS } from '../data/lives'
import type { NovelPosition } from '../engine/novel'
import { NovelEntry, NovelReader } from './NovelReader'
import { readZeroUnlock, ZERO_COMPLETED_KEY } from './novel_save'
import { useNovelProgress } from './useNovelProgress'
import { AfterwordReader } from './AfterwordReader'
import { isAfterwordOrigin, type AfterwordOrigin } from './afterword_story'
import './prologue.css'

function loadPosition() {
  try { return restoreZero(JSON.parse(localStorage.getItem(ZERO_SAVE_KEY) ?? 'null')) }
  catch { return startZero() }
}

const qin = NOVELS[0]
const jin = NOVELS[1]
const tang = NOVELS[2]
const song = NOVELS[3]
const ming1 = NOVELS[4]
const ming2 = NOVELS[5]
const seventh = NOVELS[6]
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
  const [reading, setReading] = useState<'home' | 'zero' | 'qin' | 'jin' | 'tang' | 'song' | 'ming1' | 'ming2' | 'seventh'>('home')
  const qinProgress = useNovelProgress(qin)
  const jinProgress = useNovelProgress(jin)
  const tangProgress = useNovelProgress(tang)
  const songProgress = useNovelProgress(song)
  const ming1Progress = useNovelProgress(ming1)
  const ming2Progress = useNovelProgress(ming2)
  const seventhProgress = useNovelProgress(seventh)
  const [afterwordOrigin, setAfterwordOrigin] = useState<AfterwordOrigin | null>(null)
  const [completed, setCompleted] = useState(loadCompleted)
  const [muted, setMute] = useState(isMuted)
  const hasProgress = position.node !== zeroStory.start || position.beat > 0
  const finished = zeroFinished(position)
  const qinUnlocked = completed || finished
  const jinUnlocked = qinUnlocked && qinProgress.completed
  const tangUnlocked = jinUnlocked && jinProgress.completed
  const songUnlocked = tangUnlocked && tangProgress.completed
  const ming1Unlocked = songUnlocked && songProgress.completed
  const ming2Unlocked = ming1Unlocked && ming1Progress.completed
  const seventhUnlocked = ming2Unlocked && ming2Progress.completed
  const seventhEnding = seventhProgress.position.node
  const canReadAfterword = seventhUnlocked && seventhProgress.position.finished && seventhProgress.endings.includes(seventhEnding) && isAfterwordOrigin(seventhEnding)

  useEffect(() => { document.title = '紅線千年｜杯中月與七世姻緣' }, [])
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
  const changeMing1 = (next: NovelPosition) => { if (ming1Unlocked) ming1Progress.setPosition(next) }
  const changeMing2 = (next: NovelPosition) => { if (ming2Unlocked) ming2Progress.setPosition(next) }
  const changeSeventh = (next: NovelPosition) => { if (seventhUnlocked) seventhProgress.setPosition(next) }

  if (reading === 'zero') return <PrologueReader position={position} onChange={changeZero} onHome={() => setReading('home')} muted={muted} onToggleSound={toggleSound} />
  if (reading === 'qin' && qinUnlocked) return <NovelReader key={qin.id} story={qin} position={qinProgress.position} onChange={changeQin} onHome={() => setReading('home')} endings={qinProgress.endings} onFinish={qinProgress.finish} />
  if (reading === 'jin' && jinUnlocked) return <NovelReader key={jin.id} story={jin} position={jinProgress.position} onChange={changeJin} onHome={() => setReading('home')} endings={jinProgress.endings} onFinish={jinProgress.finish} />
  if (reading === 'tang' && tangUnlocked) return <NovelReader key={tang.id} story={tang} position={tangProgress.position} onChange={changeTang} onHome={() => setReading('home')} endings={tangProgress.endings} onFinish={tangProgress.finish} />
  if (reading === 'song' && songUnlocked) return <NovelReader key={song.id} story={song} position={songProgress.position} onChange={changeSong} onHome={() => setReading('home')} endings={songProgress.endings} onFinish={songProgress.finish} />
  if (reading === 'ming1' && ming1Unlocked) return <NovelReader key={ming1.id} story={ming1} position={ming1Progress.position} onChange={changeMing1} onHome={() => setReading('home')} endings={ming1Progress.endings} onFinish={ming1Progress.finish} />
  if (reading === 'ming2' && ming2Unlocked) return <NovelReader key={ming2.id} story={ming2} position={ming2Progress.position} onChange={changeMing2} onHome={() => setReading('home')} endings={ming2Progress.endings} onFinish={ming2Progress.finish} />
  if (reading === 'seventh' && canReadAfterword && afterwordOrigin === seventhEnding) return <AfterwordReader key={afterwordOrigin} origin={afterwordOrigin} onBack={() => setAfterwordOrigin(null)} onHome={() => { setAfterwordOrigin(null); setReading('home') }} />
  if (reading === 'seventh' && seventhUnlocked) return <NovelReader key={seventh.id} story={seventh} position={seventhProgress.position} onChange={changeSeventh} onHome={() => setReading('home')} endings={seventhProgress.endings} onFinish={seventhProgress.finish} onAfterword={canReadAfterword ? () => { if (isAfterwordOrigin(seventhEnding)) setAfterwordOrigin(seventhEnding) } : undefined} />
  return <main className="zero-page zero-home">
    <div className="zero-home-inner">
      <div className="zero-home-top"><span>一段姻緣，從天上說起</span><button type="button" onClick={toggleSound} aria-pressed={muted}>{muted ? '音效關' : '音效開'}</button></div>
      <div className="zero-title-mark" aria-hidden="true">緣</div>
      <h1>紅線千年</h1>
      <p className="zero-home-subtitle">杯中月・七世人間</p>
      <Still id="banquet" caption="瑤池・七夕宴" />
      <p className="zero-home-copy">他們還不知道，<br />有一天，連記得彼此都會成為奢望。</p>
      <p className="zero-home-role">你是月老，見證這段姻緣的開始。</p>
      <div className="zero-home-actions">
        <button type="button" className="zero-primary" onClick={() => void begin(finished)}>{finished ? '重讀第〇世' : hasProgress ? '繼續閱讀第〇世' : '閱讀第〇世'}<span aria-hidden="true">→</span></button>
        <NovelEntry story={qin} position={qinProgress.position} unlocked={qinUnlocked} onBegin={() => setReading('qin')} lovers="孟姜女・范喜良" unlockHint="讀完第〇世後開啟" />
        <NovelEntry story={jin} position={jinProgress.position} unlocked={jinUnlocked} onBegin={() => setReading('jin')} lovers="梁山伯・祝英台" unlockHint="讀完第一世任一結局後開啟" />
        <NovelEntry story={tang} position={tangProgress.position} unlocked={tangUnlocked} onBegin={() => setReading('tang')} lovers="王月英・郭華" unlockHint="讀完第二世任一結局後開啟" />
        <NovelEntry story={song} position={songProgress.position} unlocked={songUnlocked} onBegin={() => setReading('song')} lovers="錢玉蓮・王十朋" unlockHint="讀完第三世任一結局後開啟" />
        <NovelEntry story={ming1} position={ming1Progress.position} unlocked={ming1Unlocked} onBegin={() => setReading('ming1')} lovers="秦雪梅・商琳" unlockHint="讀完第四世任一結局後開啟" />
        <NovelEntry story={ming2} position={ming2Progress.position} unlocked={ming2Unlocked} onBegin={() => setReading('ming2')} lovers="賈玉珍・韋燕春" unlockHint="讀完第五世任一結局後開啟" />
        <NovelEntry story={seventh} position={seventhProgress.position} unlocked={seventhUnlocked} onBegin={() => setReading('seventh')} lovers="劉瑞蓮・李奎元" unlockHint="讀完第六世任一結局後開啟" />
        {hasProgress && !finished && <button type="button" className="zero-text-button" onClick={() => void begin(true)}>從頭閱讀</button>}
      </div>
      <p className="zero-home-note">依序開啟・各世進度分開保存<br />第一至第七世每輪約 45–60 分鐘，依閱讀速度而異</p>
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
