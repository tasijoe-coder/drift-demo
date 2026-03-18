import { useEffect, useMemo, useRef, useState } from 'react'

import { useAmbientAudio } from '../hooks/useAmbientAudio'
import { useEncounter, type NarrativeChoice, type NarrativeEvent } from '../hooks/useEncounter'
import { useMetaVariables } from '../hooks/useMetaVariables'
import { useProjectStore, type Weather } from '../store/useProjectStore'
import {
  buildDiaryEntry,
  buildShiftNarrative,
  clampOddities,
  clampResource,
  clampZeroToHundred,
  distortChoiceText,
  distortFeeling,
  distortLine,
  endings,
  getAmbientLine,
  getDailyConsequence,
  getDistortionLevel,
  getEndingState,
  getResourceDescriptor,
  getStaminaDescriptor,
  getStressDescriptor,
  getTrustDescriptor,
  mergeEffect,
  phaseBackgrounds,
  pickRandomOutcome,
  sceneStyles,
  useRevealBlocks,
  useTypewriterText,
  weatherPool,
} from './storyHelpers'

type EchoTone = 'calm' | 'warning' | 'danger'

type FloatingEcho = {
  id: number
  text: string
  tone: EchoTone
}

type ChoiceButtonProps = {
  text: string
  hoverHint?: string
  onClick: () => void
  disabled?: boolean
  delayMs?: number
}

function ChoiceButton({ text, hoverHint, onClick, disabled = false, delayMs = 0 }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{ animationDelay: `${delayMs}ms` }}
      className={`group w-full rounded-[22px] border px-5 py-4 text-left [animation:driftFadeUp_.55s_ease-out_both] ${
        disabled
          ? 'cursor-not-allowed border-stone-800 bg-black/55 text-stone-500'
          : 'border-stone-700/80 bg-[linear-gradient(180deg,rgba(27,23,21,0.92),rgba(8,7,6,0.98))] text-stone-100 transition duration-300 hover:border-stone-500/70 hover:bg-[linear-gradient(180deg,rgba(38,32,29,0.94),rgba(12,10,9,0.98))] hover:shadow-[0_22px_50px_rgba(0,0,0,0.38)] active:scale-[0.99]'
      }`}
    >
      <div className="text-base font-semibold leading-7 tracking-[0.02em]">{text}</div>
      {hoverHint && !disabled && (
        <div className="mt-2 max-h-0 overflow-hidden text-sm leading-6 text-stone-300/58 opacity-0 transition-all duration-300 group-hover:max-h-20 group-hover:opacity-100 group-focus-visible:max-h-20 group-focus-visible:opacity-100">
          {hoverHint}
        </div>
      )}
    </button>
  )
}

export function StarterShell() {
  useMetaVariables()

  const { ready: audioReady, unlock, setSeaLevel, setWindLevel, setHeartbeatLevel } = useAmbientAudio()
  const { currentEvent, rollEvent } = useEncounter()

  const day = useProjectStore((state) => state.day)
  const dayPhase = useProjectStore((state) => state.dayPhase)
  const phase = useProjectStore((state) => state.phase)
  const stamina = useProjectStore((state) => state.stamina)
  const trust = useProjectStore((state) => state.trust)
  const suspicion = useProjectStore((state) => state.suspicion)
  const stress = useProjectStore((state) => state.stress)
  const resource = useProjectStore((state) => state.resource)
  const oddities = useProjectStore((state) => state.oddities)
  const metaVariables = useProjectStore((state) => state.metaVariables)
  const nextDay = useProjectStore((state) => state.nextDay)
  const changePhase = useProjectStore((state) => state.changePhase)
  const setMetaVariables = useProjectStore((state) => state.setMetaVariables)
  const resetGame = useProjectStore((state) => state.resetGame)

  const [showCover, setShowCover] = useState(true)
  const [coverStage, setCoverStage] = useState(0)
  const [resultLines, setResultLines] = useState<string[]>([])
  const [resultStamp, setResultStamp] = useState(0)
  const [journalEntries, setJournalEntries] = useState<string[]>([])
  const [showJournal, setShowJournal] = useState(false)
  const [floatingEchoes, setFloatingEchoes] = useState<FloatingEcho[]>([])
  const [backgroundSrc, setBackgroundSrc] = useState(phaseBackgrounds.phase1)
  const [backgroundVisible, setBackgroundVisible] = useState(true)
  const [currentEnding, setCurrentEnding] = useState<keyof typeof endings | null>(null)
  const echoIdRef = useRef(0)

  const typedEllipsis = useTypewriterText('……', coverStage >= 1, 240)
  const typedAlive = useTypewriterText('你還活著。', coverStage >= 2, 76)
  const typedNotAlone = useTypewriterText('但不是只有你一個人。', coverStage >= 3, 72)
  const distortionLevel = getDistortionLevel(stress, suspicion, oddities)
  const ambientLine = getAmbientLine(day, metaVariables.weather, metaVariables.isNight, resource)

  const distortedEventLines = useMemo(
    () => (currentEvent?.text ?? []).map((line, index) => distortLine(line, distortionLevel, currentEvent?.unreliable, index)),
    [currentEvent, distortionLevel],
  )
  const distortedResultLines = useMemo(
    () => resultLines.map((line, index) => distortLine(line, distortionLevel >= 2 ? distortionLevel : 0, false, index)),
    [distortionLevel, resultLines],
  )

  const { blocks: visibleEventBlocks, complete: eventReady } = useRevealBlocks(
    distortedEventLines,
    currentEvent ? `${day}-${currentEvent.id}-${phase}` : `${day}-${phase}`,
    !showCover && phase === 'encounter' && Boolean(currentEvent),
    320,
    1040,
  )
  const { blocks: visibleResultBlocks, complete: resultReady } = useRevealBlocks(
    distortedResultLines,
    `${day}-${resultStamp}-result`,
    !showCover && phase === 'result',
    220,
    780,
  )

  useEffect(() => {
    if (!showCover) return
    if (coverStage === 0) {
      const timer = window.setTimeout(() => setCoverStage(1), 500)
      return () => window.clearTimeout(timer)
    }
    if (coverStage === 1 && typedEllipsis.length === '……'.length) {
      const timer = window.setTimeout(() => setCoverStage(2), 800)
      return () => window.clearTimeout(timer)
    }
    if (coverStage === 2 && typedAlive.length === '你還活著。'.length) {
      const timer = window.setTimeout(() => setCoverStage(3), 1200)
      return () => window.clearTimeout(timer)
    }
    if (coverStage === 3 && typedNotAlone.length === '但不是只有你一個人。'.length) {
      const timer = window.setTimeout(() => setCoverStage(4), 180)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [coverStage, showCover, typedAlive.length, typedEllipsis.length, typedNotAlone.length])

  useEffect(() => {
    if (!audioReady || showCover) return
    setWindLevel(metaVariables.isNight ? 0.08 : 0)
    setHeartbeatLevel(stress >= 80 ? Math.min(1, 0.35 + (stress - 80) / 20) : 0)
  }, [audioReady, metaVariables.isNight, setHeartbeatLevel, setWindLevel, showCover, stress])

  const sceneBackground = useMemo(() => {
    if (showCover) return '/cover_mobile.jpg'
    if (phase === 'ending') return '/bg_phase5.jpg'
    if (currentEvent?.background && phase === 'encounter') return `/${currentEvent.background}`
    return phaseBackgrounds[dayPhase]
  }, [currentEvent, dayPhase, phase, showCover])

  useEffect(() => {
    if (sceneBackground === backgroundSrc) return

    const fadeTimer = window.setTimeout(() => {
      setBackgroundVisible(false)
    }, 0)

    const swapTimer = window.setTimeout(() => {
      setBackgroundSrc(sceneBackground)
      setBackgroundVisible(true)
    }, 520)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(swapTimer)
    }
  }, [backgroundSrc, sceneBackground])

  const pushFloatingEcho = (text: string, tone: EchoTone) => {
    echoIdRef.current += 1
    const id = echoIdRef.current
    setFloatingEchoes((current) => [...current, { id, text, tone }])
    window.setTimeout(() => {
      setFloatingEchoes((current) => current.filter((echo) => echo.id !== id))
    }, 1800)
  }

  const refreshEnvironment = (night: boolean) => {
    const weather = weatherPool[Math.floor(Math.random() * weatherPool.length)] as Weather
    setMetaVariables({ weather, hour: night ? 23 : 8 + Math.floor(Math.random() * 9), isNight: night })
  }

  const restartGame = async () => {
    resetGame()
    setCurrentEnding(null)
    setResultLines([])
    setResultStamp(0)
    setJournalEntries([])
    setShowJournal(false)
    refreshEnvironment(false)
    rollEvent()
    changePhase('encounter')
    setShowCover(true)
    setCoverStage(0)
    if (audioReady) {
      setSeaLevel(0)
      setWindLevel(0)
      setHeartbeatLevel(0)
    }
  }

  const applyChoice = (event: NarrativeEvent, choice: NarrativeChoice) => {
    const storeBefore = useProjectStore.getState()
    const randomOutcome = pickRandomOutcome(choice.randomOutcomes)
    const choiceEffect = mergeEffect(choice.effect, randomOutcome?.effect)
    const dailyEffect = getDailyConsequence(storeBefore.day, storeBefore.metaVariables.weather, {
      resource: clampResource(storeBefore.resource + (choiceEffect.resource ?? 0)),
      stamina: clampZeroToHundred(storeBefore.stamina + (choiceEffect.stamina ?? 0)),
      stress: clampZeroToHundred(storeBefore.stress + (choiceEffect.stress ?? 0)),
      hp: clampZeroToHundred(storeBefore.hp + (choiceEffect.hp ?? 0)),
    })
    const totalEffect = mergeEffect(choiceEffect, dailyEffect)
    const allFlags = [...(choice.setFlags ?? []), ...(randomOutcome?.setFlags ?? [])]

    const nextState = {
      stamina: clampZeroToHundred(storeBefore.stamina + (totalEffect.stamina ?? 0)),
      hp: clampZeroToHundred(storeBefore.hp + (totalEffect.hp ?? 0)),
      trust: clampZeroToHundred(storeBefore.trust + (totalEffect.trust ?? 0)),
      suspicion: clampZeroToHundred(storeBefore.suspicion + (totalEffect.suspicion ?? 0)),
      stress: clampZeroToHundred(storeBefore.stress + (totalEffect.stress ?? 0)),
      resource: clampResource(storeBefore.resource + (totalEffect.resource ?? 0)),
      oddities: clampOddities(storeBefore.oddities + (totalEffect.oddities ?? 0)),
      flags: Array.from(new Set([...storeBefore.flags, ...allFlags])),
      selfishCount: storeBefore.selfishCount + (choice.behavior === 'selfish' ? 1 : 0),
      honestCount: storeBefore.honestCount + (choice.behavior === 'honest' ? 1 : 0),
      cooperativeCount: storeBefore.cooperativeCount + (choice.behavior === 'cooperative' ? 1 : 0),
      aggressiveCount: storeBefore.aggressiveCount + (choice.behavior === 'aggressive' ? 1 : 0),
      otherAlive: !allFlags.some((flag) => ['killed_companion', 'accidental_killing', 'other_left_behind', 'they_walked_away'].includes(flag)),
      phase: 'result' as const,
      metaVariables: { ...storeBefore.metaVariables, isNight: true, hour: 23 },
    }

    useProjectStore.setState(nextState)

    const hiddenLines = buildShiftNarrative(
      { trust: storeBefore.trust, suspicion: storeBefore.suspicion, stress: storeBefore.stress, resource: storeBefore.resource, stamina: storeBefore.stamina, hp: storeBefore.hp },
      { trust: nextState.trust, suspicion: nextState.suspicion, stress: nextState.stress, resource: nextState.resource, stamina: nextState.stamina, hp: nextState.hp },
    )
    const feeling = distortFeeling(randomOutcome?.feeling ?? choice.feeling, distortionLevel, event.unreliable)
    const closingLine = nextState.resource <= 2 ? '夜裡變得更長了，因為你知道明天不會比較仁慈。' : nextState.stress >= 80 ? '你以為自己只是在累，後來才發現那更像是在防著什麼。' : '夜又靠近了一點，而你不確定今天到底留下了什麼。'
    const nextResultLines = [feeling, ...hiddenLines, closingLine]

    setResultLines(nextResultLines)
    setResultStamp((stamp) => stamp + 1)
    setCurrentEnding(getEndingState({ ...storeBefore, ...nextState }))
    setJournalEntries((entries) => [buildDiaryEntry(day, event.title, nextResultLines), ...entries].slice(0, 30))

    if ((totalEffect.trust ?? 0) <= -5) pushFloatingEcho('他把這件事記住了', 'warning')
    if ((totalEffect.trust ?? 0) >= 5) pushFloatingEcho('那份防備鬆了一點', 'calm')
    if ((totalEffect.resource ?? 0) > 0) pushFloatingEcho('今晚還不會立刻空掉', 'calm')
    if ((totalEffect.resource ?? 0) < 0) pushFloatingEcho('補給又薄了一層', 'warning')
    if ((totalEffect.stress ?? 0) >= 5) pushFloatingEcho('你的腦子變得更吵', 'danger')
    if ((totalEffect.suspicion ?? 0) >= 4) pushFloatingEcho('懷疑正在靠近', 'warning')
  }

  const continueFromResult = () => {
    const state = useProjectStore.getState()
    const shouldEnd = state.hp <= 0 || state.day >= 30 || !state.otherAlive || state.flags.includes('killed_companion') || state.flags.includes('accidental_killing') || state.flags.includes('mutual_ruin')
    if (shouldEnd) {
      setCurrentEnding(getEndingState(state))
      changePhase('ending')
      return
    }
    nextDay()
    refreshEnvironment(false)
    changePhase('encounter')
    rollEvent()
  }

  if (showCover) {
    return (
      <main className="relative min-h-[100dvh] overflow-hidden bg-black text-stone-100">
        <style>{sceneStyles}</style>
        {coverStage >= 3 && <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-100" style={{ backgroundImage: "url('/cover_mobile.jpg')" }} />}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/92 to-black/96" />
        <div className="absolute inset-0 opacity-30 [animation:driftPulse_6s_ease-in-out_infinite] [background-image:radial-gradient(rgba(255,255,255,0.08)_0.8px,transparent_0.8px)] [background-size:12px_12px]" />
        <div className="relative z-10 flex min-h-[100dvh] flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)]">
          <div className="flex-1" />
          <div className="mx-auto w-full max-w-[320px] space-y-5 text-center">
            <div className="min-h-[2rem] text-lg tracking-[0.2em] text-stone-300/84">{typedEllipsis}</div>
            <div className="min-h-[2rem] text-[1.5rem] font-semibold leading-tight tracking-[0.06em] text-stone-50">{typedAlive}</div>
            <div className="min-h-[3rem] text-[1.15rem] leading-8 text-stone-200/80">{typedNotAlone}</div>
          </div>
          <div className="flex-1" />
          {coverStage >= 4 && (
            <button
              type="button"
              onClick={async () => {
                const didUnlock = await unlock()
                if (didUnlock) setSeaLevel(0.4)
                refreshEnvironment(false)
                setShowCover(false)
                changePhase('encounter')
              }}
              className="mx-auto min-h-[56px] w-full max-w-[360px] rounded-[22px] border border-stone-600/80 bg-[linear-gradient(180deg,rgba(40,34,31,0.9),rgba(12,11,10,0.98))] px-6 py-4 text-base font-semibold tracking-[0.18em] text-stone-100 transition duration-300 hover:border-stone-400/85 hover:bg-[linear-gradient(180deg,rgba(52,45,42,0.94),rgba(16,14,13,0.98))]"
            >
              我醒了。
            </button>
          )}
        </div>
      </main>
    )
  }

  if (phase === 'ending' && currentEnding) {
    return (
      <main className="relative min-h-[100dvh] overflow-hidden bg-black text-stone-100">
        <style>{sceneStyles}</style>
        <div className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${backgroundVisible ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundImage: `url('${backgroundSrc}')` }} />
        <div className="absolute inset-0 bg-black/66" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/78 to-black" />
        <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)]">
          <header className="mx-auto w-full max-w-[360px]"><div className="text-[11px] uppercase tracking-[0.42em] text-stone-400/82">Day {day}</div></header>
          <div className="flex-1" />
          <article className="mx-auto w-full max-w-[320px] rounded-[28px] border border-stone-700/75 bg-[linear-gradient(180deg,rgba(18,16,14,0.92),rgba(6,5,4,0.98))] px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="text-[11px] uppercase tracking-[0.5em] text-stone-400/68">Ending</div>
            <h1 className="mt-4 text-[2rem] font-semibold leading-tight tracking-[0.08em] text-stone-50">{endings[currentEnding].title}</h1>
            <div className="mt-5 space-y-5 text-[1.08rem] leading-[2.05] text-stone-100/90">{endings[currentEnding].text.map((line) => <p key={line} className="[animation:driftFadeUp_.7s_ease-out_both]">{line}</p>)}</div>
          </article>
          <div className="mx-auto mt-4 w-full max-w-[360px]"><ChoiceButton text="重新開始" hoverHint="再活一次，看看這次你會先把什麼讓出去。" onClick={() => { void restartGame() }} /></div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-stone-100">
      <style>{sceneStyles}</style>
      <div className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${backgroundVisible ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundImage: `url('${sceneBackground}')` }} />
      <div className="absolute inset-0 bg-black/62" />
      <div className={`absolute inset-0 ${distortionLevel >= 2 ? 'bg-gradient-to-b from-black/90 via-rose-950/30 to-black' : 'bg-gradient-to-b from-black/88 via-black/72 to-black'}`} />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.07)_0.8px,transparent_0.8px)] [background-size:13px_13px] mix-blend-soft-light" />
      <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)]">
        <header className="mx-auto w-full max-w-[360px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.42em] text-stone-400/82">Day {day}</div>
              <div className="mt-2 text-xs leading-6 text-stone-300/64">{ambientLine}</div>
            </div>
            <button type="button" onClick={() => setShowJournal(true)} className="rounded-full border border-stone-700/70 bg-black/35 px-3 py-2 text-[11px] tracking-[0.28em] text-stone-200/74 transition hover:bg-black/55">日誌</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.28em] text-stone-300/62">
            <span>信任：{getTrustDescriptor(trust)}</span>
            <span>壓力：{getStressDescriptor(stress)}</span>
            <span>體力：{getStaminaDescriptor(stamina)}</span>
            <span>補給：{getResourceDescriptor(resource)}</span>
          </div>
        </header>
        <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top)+5.8rem)] z-20 space-y-2">{floatingEchoes.map((echo) => <div key={echo.id} className={`mx-auto max-w-[320px] rounded-full border px-3 py-2 text-center text-[11px] tracking-[0.22em] [animation:driftFadeUp_.4s_ease-out_both] ${echo.tone === 'danger' ? 'border-rose-500/28 bg-rose-500/18 text-rose-50' : echo.tone === 'warning' ? 'border-amber-500/28 bg-amber-500/14 text-amber-50' : 'border-emerald-500/24 bg-emerald-500/14 text-emerald-50'}`}>{echo.text}</div>)}</div>
        <section className="flex flex-1 flex-col justify-center px-1 py-6">
          <article className={`mx-auto w-full max-w-[320px] rounded-[28px] border px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl ${distortionLevel >= 2 ? 'border-rose-900/55 bg-[linear-gradient(180deg,rgba(26,14,14,0.92),rgba(7,5,5,0.98))]' : 'border-stone-700/75 bg-[linear-gradient(180deg,rgba(18,16,14,0.92),rgba(6,5,4,0.98))]'}`}>
            <div className="text-[11px] uppercase tracking-[0.48em] text-stone-400/64">{phase === 'encounter' ? 'Encounter' : 'Aftermath'}</div>
            <h1 className="mt-4 text-[clamp(1.9rem,7vw,2.45rem)] font-semibold leading-tight tracking-[0.08em] text-stone-50">{phase === 'result' ? '事情已經發生了' : currentEvent?.title ?? '海風還沒有給你答案'}</h1>
            <div className="mt-5 space-y-5 text-[1.08rem] leading-[2.05] tracking-[0.01em] text-stone-100/92">
              {phase === 'encounter' && visibleEventBlocks.map((line) => <p key={line} className="whitespace-pre-line [animation:driftFadeUp_.75s_ease-out_both]">{line}</p>)}
              {phase === 'result' && visibleResultBlocks.map((line) => <p key={line} className="whitespace-pre-line [animation:driftFadeUp_.75s_ease-out_both]">{line}</p>)}
              {phase === 'encounter' && !eventReady && <p className="text-base leading-8 text-stone-300/70">你還在等自己先把第一句話說出口。</p>}
            </div>
            {phase === 'encounter' && currentEvent?.unreliable && distortionLevel >= 1 && <div className="mt-6 border-l border-stone-600/45 pl-4 text-sm leading-7 text-stone-300/60">你不確定眼前這一幕，是事情本來就這樣，還是你的腦子已經先把它往別的地方推了一點。</div>}
          </article>
        </section>
        <footer className="mx-auto w-full max-w-[360px] space-y-3">
          {phase === 'encounter' && eventReady && currentEvent?.choices.slice(0, 3).map((choice, index) => <ChoiceButton key={`${currentEvent.id}-${choice.text}`} text={distortChoiceText(choice.text, distortionLevel, index)} hoverHint={choice.hoverHint} delayMs={index * 80} onClick={() => applyChoice(currentEvent, choice)} />)}
          {phase === 'result' && resultReady && <ChoiceButton text={day >= 30 || currentEnding ? '把這段路看完' : '帶著這個結果進入明天'} hoverHint={day >= 30 || currentEnding ? '現在只剩你怎麼記住這三十天。' : '你不知道明天會更好，還是只是更難。'} onClick={continueFromResult} />}
        </footer>
      </div>
      {showJournal && (
        <>
          <button type="button" aria-label="關閉日誌" onClick={() => setShowJournal(false)} className="absolute inset-0 z-30 bg-black/62" />
          <aside className="absolute right-0 top-0 z-40 flex h-full w-[86vw] max-w-sm flex-col border-l border-stone-700/70 bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(4,3,3,1))] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3"><div><div className="text-[11px] uppercase tracking-[0.42em] text-stone-400/68">Journal</div><h2 className="mt-2 text-xl font-semibold tracking-[0.08em] text-stone-50">日誌</h2></div><button type="button" onClick={() => setShowJournal(false)} className="rounded-full border border-stone-700/70 px-3 py-2 text-[11px] tracking-[0.25em] text-stone-200/72">關閉</button></div>
            <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">{(journalEntries.length > 0 ? journalEntries : ['Day 1\n你剛醒來。\n真正的問題現在才開始。']).map((entry) => <article key={entry} className="rounded-[22px] border border-stone-800/75 bg-black/35 px-4 py-4"><p className="whitespace-pre-line text-sm leading-7 text-stone-100/86">{entry}</p></article>)}</div>
          </aside>
        </>
      )}
    </main>
  )
}

