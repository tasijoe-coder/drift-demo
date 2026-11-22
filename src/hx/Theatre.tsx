import { useEffect, useMemo, useRef, useState } from 'react'
import { advanceStory, chooseStory, opening, restoreStory, startStory, storyMemories, storyNode, storyTranscript, type StoryPosition } from './theatre_story'
import { isMuted, setMuted, sfx, unlock } from './sfx'
import './theatre.css'

const SAVE_KEY = 'hx.theatre.qin-opening.v1'
const readPosition = () => {
  try { return restoreStory(opening, JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')) }
  catch { return startStory(opening) }
}

function Puppet({ who }: { who: string }) {
  return (
    <div className={`shadow-puppet shadow-${who}`} aria-hidden="true">
      <div className="shadow-head" /><div className="shadow-hair" />
      <div className="shadow-body" /><div className="shadow-robe" /><div className="shadow-cutwork" />
      <div className="shadow-arm"><i className="shadow-joint" /><div className="shadow-forearm"><i className="shadow-rod" /></div></div>
      <div className="shadow-foot" />
    </div>
  )
}

export function Theatre({ onHome, restart = false }: { onHome: () => void; restart?: boolean }) {
  const [position, setPosition] = useState<StoryPosition>(() => restart ? startStory(opening) : readPosition())
  const [auto, setAuto] = useState(false)
  const [muted, setMute] = useState(isMuted)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)
  const log = useRef<HTMLDivElement>(null)
  const choiceHeading = useRef<HTMLHeadingElement>(null)
  const nextButton = useRef<HTMLButtonElement>(null)
  const previousNode = useRef(position.node)
  const previousChoice = useRef(false)
  const node = storyNode(opening, position.node)
  const beat = node.beats[Math.min(position.beat, node.beats.length - 1)]
  const atBoundary = position.beat === node.beats.length
  const choosing = atBoundary && !!node.choice
  const finished = atBoundary && !node.choice && !node.next
  const transcript = useMemo(() => storyTranscript(opening, position), [position])

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(position)) } catch { /* Storage can be unavailable in private browsing. */ }
  }, [position])

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!auto || choosing || finished || !pageVisible) return
    const timer = window.setTimeout(() => setPosition((value) => advanceStory(opening, value)), Math.max(3400, beat.text.length * 125))
    return () => window.clearTimeout(timer)
  }, [auto, beat, choosing, finished, pageVisible, position])

  useEffect(() => {
    if (previousNode.current !== position.node) {
      previousNode.current = position.node
      sfx.card()
    }
    if (beat.sound === 'knock') sfx.warn()
    if (beat.sound === 'wind') sfx.drop()
    if (beat.sound === 'bell') sfx.heaven()
  }, [beat, position.node])

  useEffect(() => {
    if (log.current) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      log.current.scrollTo({ top: log.current.scrollHeight, behavior: reduce ? 'instant' : 'smooth' })
    }
    if (choosing) choiceHeading.current?.focus()
    else if (previousChoice.current) nextButton.current?.focus()
    previousChoice.current = choosing
  }, [position, choosing])

  const continueStory = () => {
    sfx.tap()
    setPosition((value) => advanceStory(opening, value))
  }
  const choose = (id: string) => {
    sfx.drop()
    setPosition((value) => chooseStory(opening, value, id))
    nextButton.current?.focus()
  }
  const replay = () => { setAuto(false); setPosition(startStory(opening)); sfx.act() }

  return (
    <main className="shadow-page">
      <div className="shadow-theatre">
        <header className="shadow-header">
          <button type="button" onClick={onHome} aria-label="返回姻緣簿">← 返回</button>
          <span>紅線千年<span className="shadow-header-sub">{node.era ?? '第一世・秦'}</span></span>
          <button type="button" aria-pressed={muted} onClick={() => { setMuted(!muted); setMute(!muted) }}>{muted ? '音效關' : '音效開'}</button>
        </header>

        <section className={`shadow-stage shadow-scene-${node.scene}${choosing ? ' shadow-stage-paused' : ''}`} data-pose={beat.pose} role="img" aria-label={`${node.setting}。${beat.speaker}：${beat.text}`}>
          <div className="shadow-screen">
            <div className="shadow-valance" /><div className="shadow-moon" />
            <div className="shadow-wall" /><div className="shadow-door" /><div className="shadow-flower" />
            <div className="shadow-table" /><div className="shadow-lamp" /><div className="shadow-bowl" />
            <div className="shadow-rain" />
            <div className="shadow-clouds" /><div className="shadow-celestial-cup" /><div className="shadow-fate-thread" />
            <div className="shadow-register" aria-hidden="true"><span>姻緣簿</span></div>
            <Puppet who="meng" /><Puppet who="fan" /><Puppet who="father" /><Puppet who="zhang" />
            <div className="shadow-floor" />
          </div>
          <div className="shadow-stage-caption">{node.setting}</div>
        </section>

        <div className="shadow-scene-heading">
          <span>{node.title ?? opening.title}<span className="shadow-separator">／</span>{node.chapter}</span>
          {!choosing && !finished && <button type="button" aria-pressed={auto} onClick={async () => { await unlock(); setAuto((value) => !value) }}>{auto ? '暫停自動' : '自動演出'}</button>}
          {(choosing || finished) && <span className="shadow-mode">{choosing ? '此刻・由你' : '第一折・待續'}</span>}
        </div>

        <section className="shadow-lower">
          <div ref={log} className={`shadow-dialogue${choosing || finished ? ' shadow-dialogue-hidden' : ''}`} role="log" aria-label="演出對話" aria-live={auto ? 'off' : 'polite'} tabIndex={0}>
            <div className="shadow-dialogue-lines">
              {transcript.map((line, index) => (
                <article key={line.key} className={`shadow-line${index === transcript.length - 1 ? ' shadow-line-current' : ''}`}>
                  <div className="shadow-speaker">{line.speaker}</div><p>{line.text}</p>
                </article>
              ))}
            </div>
          </div>

          {choosing && node.choice && <div className="shadow-decision">
            <div className="shadow-eyebrow">天意，停在這一刻</div>
            <h1 ref={choiceHeading} tabIndex={-1}>{node.choice.prompt}</h1>
            <p className="shadow-decision-context">{beat.text}</p>
            <div className="shadow-options">{node.choice.options.map((option) => (
              <button type="button" key={option.id} onClick={() => choose(option.id)}><span>{option.label}</span><small>{option.detail}</small></button>
            ))}</div>
          </div>}

          {finished && <div className="shadow-interval">
            <div className="shadow-eyebrow">燈還留著，門外已有來人</div><h1>第一折・待續</h1>
            <p>今夜，他們才學會把一個人留下。<br />前廳那張文書，卻已等著天亮。</p>
            <h2>這一折，你留下的天意</h2>
            <ol>{storyMemories(opening, position).map((memory) => <li key={memory}>{memory}</li>)}</ol>
            <p className="shadow-next-act">下一折：父親要開的那扇門，會讓誰進來？</p>
            <button type="button" className="shadow-primary" onClick={replay}>從第〇世，重看這段姻緣</button>
            <button type="button" className="shadow-secondary" onClick={onHome}>回到姻緣簿</button>
          </div>}
        </section>

        {!choosing && !finished && <footer className="shadow-footer">
          <button ref={nextButton} type="button" className="shadow-primary" onClick={continueStory}>
            {position.beat === node.beats.length - 1 && node.choice ? '降下天意' : position.beat === node.beats.length - 1 && !node.next ? '第一折・待續' : '繼續演出'}<span aria-hidden="true">{position.beat === node.beats.length - 1 && node.choice ? '◇' : '↓'}</span>
          </button>
          <p>{node.era ? '第〇世・緣起　／　對話可往上回看' : '對話可往上回看・演到分歧，才由你決定'}</p>
        </footer>}
      </div>
    </main>
  )
}
