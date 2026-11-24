import { useEffect, useMemo, useRef, useState } from 'react'
import { storyNode, storyTranscript, type StoryPosition } from './theatre_story'
import { nextZero, previousZero, restoreZero, startZero, ZERO_SAVE_KEY, zeroFinished, zeroReadCount, zeroStills, zeroStory, zeroTotal } from './zero_story'
import { sfx, unlock } from './sfx'
import { BONUS_NOVELS, NOVELS } from '../data/lives'
import type { NovelPosition } from '../engine/novel'
import { NovelEntry, NovelReader } from './NovelReader'
import { novelKeys, readZeroUnlock, ZERO_COMPLETED_KEY } from './novel_save'
import { useNovelProgress } from './useNovelProgress'
import { AfterwordReader } from './AfterwordReader'
import { AFTERWORD_COMPLETED_KEY, isAfterwordOrigin, readAfterwordUnlock, type AfterwordOrigin } from './afterword_story'
import { ReaderHeader } from './ReaderHeader'
import { useReaderPreferences } from './reader_preferences'
import { StageStill as Still } from './StageStill'
import { useReadingPlayback } from './useReadingPlayback'
import { bonusChapterUnlocked } from './reading_timing'
import { useBgmTrack } from './bgm'
import { OpeningCover } from './OpeningCover'
import { selectResumeChapter } from './chapter_resume'
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
const fog = BONUS_NOVELS[0]
function loadCompleted() {
  try { return readZeroUnlock(localStorage) }
  catch { return zeroFinished(loadPosition()) }
}

export function PrologueApp() {
  const [position, setPosition] = useState(loadPosition)
  const [entered, setEntered] = useState(false)
  const directoryHeading = useRef<HTMLHeadingElement>(null)
  const [reading, setReading] = useState<'home' | 'zero' | 'qin' | 'jin' | 'tang' | 'song' | 'ming1' | 'ming2' | 'seventh' | 'fog'>('home')
  useBgmTrack(reading === 'home' ? 'theme' : undefined)
  const qinProgress = useNovelProgress(qin)
  const jinProgress = useNovelProgress(jin)
  const tangProgress = useNovelProgress(tang)
  const songProgress = useNovelProgress(song)
  const ming1Progress = useNovelProgress(ming1)
  const ming2Progress = useNovelProgress(ming2)
  const seventhProgress = useNovelProgress(seventh)
  const fogProgress = useNovelProgress(fog)
  const [afterwordCompleted, setAfterwordCompleted] = useState(() => {
    try { return readAfterwordUnlock(localStorage) } catch { return false }
  })
  const [afterwordOrigin, setAfterwordOrigin] = useState<AfterwordOrigin | null>(null)
  const [completed, setCompleted] = useState(loadCompleted)
  const { large } = useReaderPreferences()
  const hasProgress = position.node !== zeroStory.start || position.beat > 0
  const finished = zeroFinished(position)
  const qinUnlocked = completed || finished
  const jinUnlocked = qinUnlocked && qinProgress.completed
  const tangUnlocked = jinUnlocked && jinProgress.completed
  const songUnlocked = tangUnlocked && tangProgress.completed
  const ming1Unlocked = songUnlocked && songProgress.completed
  const ming2Unlocked = ming1Unlocked && ming1Progress.completed
  const seventhUnlocked = ming2Unlocked && ming2Progress.completed
  const fogUnlocked = seventhUnlocked && bonusChapterUnlocked(8, seventhProgress.completed ? [7] : [])
  const seventhEnding = seventhProgress.position.node
  const canReadAfterword = seventhUnlocked && seventhProgress.position.finished && seventhProgress.endings.includes(seventhEnding) && isAfterwordOrigin(seventhEnding)

  useEffect(() => { document.title = '月老｜七世人間' }, [])
  useEffect(() => {
    if (entered && reading === 'home') directoryHeading.current?.focus({ preventScroll: true })
  }, [entered, reading])
  useEffect(() => {
    if (reading !== 'home') {
      try { localStorage.setItem('hx.reader.last-chapter.v1', reading) } catch { /* Optional cover shortcut. */ }
    }
  }, [reading])
  useEffect(() => {
    if (afterwordCompleted) {
      try { localStorage.setItem(AFTERWORD_COMPLETED_KEY, 'true') } catch { /* Keep session unlock. */ }
    }
  }, [afterwordCompleted])
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
  const changeFog = (next: NovelPosition) => { if (fogUnlocked) fogProgress.setPosition(next) }

  if (!entered) return <OpeningCover onEnter={() => setEntered(true)} />
  if (reading === 'zero') return <PrologueReader position={position} onChange={changeZero} onHome={() => setReading('home')} />
  if (reading === 'qin' && qinUnlocked) return <NovelReader key={qin.id} story={qin} position={qinProgress.position} onChange={changeQin} onHome={() => setReading('home')} endings={qinProgress.endings} onFinish={qinProgress.finish} />
  if (reading === 'jin' && jinUnlocked) return <NovelReader key={jin.id} story={jin} position={jinProgress.position} onChange={changeJin} onHome={() => setReading('home')} endings={jinProgress.endings} onFinish={jinProgress.finish} />
  if (reading === 'tang' && tangUnlocked) return <NovelReader key={tang.id} story={tang} position={tangProgress.position} onChange={changeTang} onHome={() => setReading('home')} endings={tangProgress.endings} onFinish={tangProgress.finish} />
  if (reading === 'song' && songUnlocked) return <NovelReader key={song.id} story={song} position={songProgress.position} onChange={changeSong} onHome={() => setReading('home')} endings={songProgress.endings} onFinish={songProgress.finish} />
  if (reading === 'ming1' && ming1Unlocked) return <NovelReader key={ming1.id} story={ming1} position={ming1Progress.position} onChange={changeMing1} onHome={() => setReading('home')} endings={ming1Progress.endings} onFinish={ming1Progress.finish} />
  if (reading === 'ming2' && ming2Unlocked) return <NovelReader key={ming2.id} story={ming2} position={ming2Progress.position} onChange={changeMing2} onHome={() => setReading('home')} endings={ming2Progress.endings} onFinish={ming2Progress.finish} />
  if (reading === 'fog' && fogUnlocked) return <NovelReader key={fog.id} story={fog} position={fogProgress.position} onChange={changeFog} onHome={() => setReading('home')} endings={fogProgress.endings} onFinish={fogProgress.finish} />
  if (reading === 'seventh' && canReadAfterword && afterwordOrigin === seventhEnding) return <AfterwordReader key={afterwordOrigin} origin={afterwordOrigin} onBack={() => setAfterwordOrigin(null)} onHome={() => { setAfterwordOrigin(null); setReading('home') }} onComplete={() => setAfterwordCompleted(true)} onBonus={() => { if (fogUnlocked) { setAfterwordOrigin(null); setReading('fog') } }} />
  if (reading === 'seventh' && seventhUnlocked) return <NovelReader key={seventh.id} story={seventh} position={seventhProgress.position} onChange={changeSeventh} onHome={() => setReading('home')} endings={seventhProgress.endings} onFinish={seventhProgress.finish} onAfterword={canReadAfterword ? () => { if (isAfterwordOrigin(seventhEnding)) setAfterwordOrigin(seventhEnding) } : undefined} />
  const entries = [
    { story: qin, progress: qinProgress, unlocked: qinUnlocked, onBegin: () => setReading('qin'), lovers: '孟姜女・范喜良' },
    { story: jin, progress: jinProgress, unlocked: jinUnlocked, onBegin: () => setReading('jin'), lovers: '梁山伯・祝英台' },
    { story: tang, progress: tangProgress, unlocked: tangUnlocked, onBegin: () => setReading('tang'), lovers: '王月英・郭華' },
    { story: song, progress: songProgress, unlocked: songUnlocked, onBegin: () => setReading('song'), lovers: '錢玉蓮・王十朋' },
    { story: ming1, progress: ming1Progress, unlocked: ming1Unlocked, onBegin: () => setReading('ming1'), lovers: '秦雪梅・商琳' },
    { story: ming2, progress: ming2Progress, unlocked: ming2Unlocked, onBegin: () => setReading('ming2'), lovers: '賈玉珍・韋燕春' },
    { story: seventh, progress: seventhProgress, unlocked: seventhUnlocked, onBegin: () => setReading('seventh'), lovers: '劉瑞蓮・李奎元' },
    { story: fog, progress: fogProgress, unlocked: fogUnlocked, onBegin: () => setReading('fog'), lovers: '民初商業諜報番外｜沈照微・陸聞笙' },
  ]
  let lastChapter = ''
  try { lastChapter = localStorage.getItem('hx.reader.last-chapter.v1') ?? '' } catch { /* Use latest open chapter. */ }
  const resume = selectResumeChapter(lastChapter, hasProgress || completed || finished || lastChapter === 'zero', entries.map(entry => {
    const position = entry.progress.position
    let bookmarked = false
    try {
      const bookmark = JSON.parse(localStorage.getItem(novelKeys(entry.story).bookmark) ?? 'null')
      bookmarked = bookmark?.node === position.node && Number.isInteger(bookmark.count) && bookmark.count > 0 && JSON.stringify(bookmark.choices) === JSON.stringify(position.choices)
    } catch { /* Ignore damaged optional sentence bookmarks. */ }
    return {
      id: entry.story.id.replace(/-novel$/, ''), unlocked: entry.unlocked,
      played: entry.progress.completed || position.finished || position.node !== entry.story.start || position.choices.length > 0 || bookmarked,
    }
  }))
  const primaryEntry = entries.find(entry => entry.story.id === `${resume}-novel` && entry.unlocked)
  return <main className={`zero-page chapter-hall${large ? ' reader-large' : ''}`} data-opening-phase="directory">
    <div className="chapter-hall-inner">
      <ReaderHeader subtitle="章節清單" leftNote="緣起" />
      <h1 ref={directoryHeading} tabIndex={-1}>七世人間</h1>
      {resume === 'zero' && <section className="chapter-resume" aria-label="繼續閱讀">
        <p>接續姻緣</p>
        <button type="button" className="zero-primary home-primary" onClick={() => void begin(false)}>
          <span className="home-action-copy">繼續閱讀 第〇世<small>上次停在：{storyNode(zeroStory, position.node).chapter}・{zeroReadCount(position)} / {zeroTotal} 句</small></span>
          <span aria-hidden="true">→</span>
        </button>
      </section>}
      {primaryEntry && <section aria-label="繼續閱讀"><NovelEntry story={primaryEntry.story} position={primaryEntry.progress.position} unlocked onBegin={primaryEntry.onBegin} lovers={primaryEntry.lovers} unlockHint="" primary /></section>}
      <section className="chapter-directory" aria-labelledby="chapter-directory-title">
        <h2 id="chapter-directory-title">章節目錄</h2>
        <button type="button" className={`zero-primary${resume ? ' zero-secondary' : ' home-primary'}`} onClick={() => void begin(finished)}>第〇世・序章<span aria-hidden="true">〇</span></button>
        {entries.filter(entry => entry.story.id !== fog.id).map((entry, index) => <NovelEntry key={entry.story.id}
          story={entry.story} position={entry.progress.position} unlocked={entry.unlocked} onBegin={entry.onBegin}
          lovers={entry.lovers} unlockHint={index === 0 ? '讀完第〇世後開啟' : `讀完${entries[index - 1].story.title.split('・')[0]}任一結局後開啟`} />)}
        {fogUnlocked && <div className="bonus-entry"><h2>簿外・第八世</h2><NovelEntry story={fog} position={fogProgress.position} unlocked onBegin={() => setReading('fog')} lovers="沈照微・陸聞笙" unlockHint="" /></div>}
      </section>
      {hasProgress && !finished && <button type="button" className="zero-text-button" onClick={() => void begin(true)}>從頭閱讀第〇世</button>}
    </div>
  </main>
}

function PrologueReader({ position, onChange, onHome }: {
  position: StoryPosition; onChange: (value: StoryPosition | ((previous: StoryPosition) => StoryPosition)) => void
  onHome: () => void
}) {
  const { large } = useReaderPreferences()
  const endHeading = useRef<HTMLHeadingElement>(null)
  const node = storyNode(zeroStory, position.node)
  useBgmTrack(node.bgm)
  const beat = node.beats[Math.min(position.beat, node.beats.length - 1)]
  const finished = zeroFinished(position)
  const count = zeroReadCount(position)
  const transcript = useMemo(() => storyTranscript(zeroStory, position), [position])
  const first = position.node === zeroStory.start && position.beat === 0

  const imageChanged = count > 1 && transcript.at(-2)?.still !== beat.still
  const { log, auto, setAuto, next, gestures } = useReadingPlayback(
    position.node + ':' + position.beat, beat.text, finished, () => onChange(nextZero), imageChanged)
  useEffect(() => {
    if (finished) endHeading.current?.focus({ preventScroll: true })
  }, [finished])
  useEffect(() => {
    if (finished) return
    if (beat.sound === 'knock') sfx.warn()
    if (beat.sound === 'bell') sfx.heaven()
  }, [beat, finished])

  const replay = () => { setAuto(false); onChange(startZero()) }
  return <main className="zero-page">
    <div className={`zero-reader${large ? ' reader-large' : ''}`} data-node={node.id} data-beat={position.beat}>
      <ReaderHeader subtitle="第〇世・杯中月" onBack={onHome} auto={auto && !finished} onAutoChange={finished ? undefined : setAuto} autoHint={finished ? '已讀完，可從頭重讀' : undefined} />
      <Still id={beat.still!} caption={node.setting} />
      <div className="zero-chapter-row"><span>{node.chapter}</span><span className="zero-progress" aria-label="閱讀進度">{count} / {zeroTotal}</span>
        {finished && <span>第〇世・終</span>}
      </div>
      <div className="zero-progress-track" aria-hidden="true"><div style={{ width: `${count / zeroTotal * 100}%` }} /></div>
      <section className="zero-reading-body" aria-label="第〇世小說">
        <div ref={log as React.RefObject<HTMLDivElement>} {...gestures} className="zero-log" role="log" aria-label="故事文字" aria-live={auto ? 'off' : 'polite'} tabIndex={0}>
          <div className="zero-lines">{transcript.map((line, index) => <article key={line.key} className={`zero-line${index === transcript.length - 1 ? ' zero-current' : ''}`}>
            {line.speaker && line.speaker !== '旁白' && <div className="zero-speaker">{line.speaker}</div>}<p>{line.text}</p>
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
            <button type="button" className="zero-primary" onClick={next}>{position.beat === node.beats.length - 1 ? node.next ? '下一場' : '讀完第〇世' : '下一句'}<span aria-hidden="true">↓</span></button>
          </div><p>{auto ? '自動閱讀中・開啟設定即可暫停' : '依自己的步調閱讀・向上可回看文字'}</p>
        </>}
      </footer>
    </div>
  </main>
}
