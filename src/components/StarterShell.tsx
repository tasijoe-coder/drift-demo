import { useEffect, useMemo, useRef, useState } from 'react'

import { useAmbientAudio } from '../hooks/useAmbientAudio'
import { useEncounter } from '../hooks/useEncounter'
import { useMetaVariables } from '../hooks/useMetaVariables'
import { useProjectStore, type AppliedEffectSummary, type DailyGoalKey, type Weather } from '../store/useProjectStore'
import {
  buildDiaryEntry,
  buildShiftNarrative,
  dayActions,
  distortLine,
  endings,
  getAmbientLine,
  getDailyGoal,
  getDistortionLevel,
  getEndingState,
  getFoodDescriptor,
  getGoalCompletionLine,
  getGoalFailureLine,
  getStaminaDescriptor,
  getStressDescriptor,
  getTrustDescriptor,
  getWaterDescriptor,
  isGoalCompletedByAction,
  phaseBackgrounds,
  resolveDayAction,
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
  subtitle?: string
  hoverHint?: string
  onClick: () => void
  disabled?: boolean
  disabledReason?: string
  delayMs?: number
}

type HudStatProps = {
  label: string
  value: number
  descriptor: string
}

function ChoiceButton({ text, subtitle, hoverHint, onClick, disabled = false, disabledReason, delayMs = 0 }: ChoiceButtonProps) {
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
      {subtitle && <div className="mt-1 text-sm leading-6 text-stone-300/72">{subtitle}</div>}
      {disabled && disabledReason && <div className="mt-2 text-sm leading-6 text-stone-500">{disabledReason}</div>}
      {hoverHint && !disabled && (
        <div className="mt-2 max-h-0 overflow-hidden text-sm leading-6 text-stone-300/58 opacity-0 transition-all duration-300 group-hover:max-h-20 group-hover:opacity-100 group-focus-visible:max-h-20 group-focus-visible:opacity-100">
          {hoverHint}
        </div>
      )}
    </button>
  )
}

function HudStat({ label, value, descriptor }: HudStatProps) {
  return (
    <div className="rounded-2xl border border-stone-800/80 bg-black/28 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.28em] text-stone-400/60">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="text-sm font-semibold tracking-[0.03em] text-stone-100">{value}</span>
        <span className="text-[11px] text-stone-300/72">{descriptor}</span>
      </div>
    </div>
  )
}

const formatSignedValue = (value: number) => (value > 0 ? `+${value}` : `${value}`)

const getEchoTone = (value: number, inverted = false): EchoTone => {
  if (value === 0) return 'calm'
  if (inverted) return value > 0 ? 'danger' : 'calm'
  return value > 0 ? 'calm' : 'warning'
}

export function StarterShell() {
  useMetaVariables()

  const { ready: audioReady, unlock, setSeaLevel, setWindLevel, setHeartbeatLevel } = useAmbientAudio()
  const { currentEvent, rollEvent } = useEncounter()

  const day = useProjectStore((state) => state.day)
  const dayPhase = useProjectStore((state) => state.dayPhase)
  const phase = useProjectStore((state) => state.phase)
  const stamina = useProjectStore((state) => state.stamina)
  const water = useProjectStore((state) => state.water)
  const food = useProjectStore((state) => state.food)
  const trust = useProjectStore((state) => state.trust)
  const suspicion = useProjectStore((state) => state.suspicion)
  const stress = useProjectStore((state) => state.stress)
  const oddities = useProjectStore((state) => state.oddities)
  const remainingActions = useProjectStore((state) => state.remainingActions)
  const dayGoalKey = useProjectStore((state) => state.dayGoalKey)
  const goalCompleted = useProjectStore((state) => state.goalCompleted)
  const metaVariables = useProjectStore((state) => state.metaVariables)
  const nextDay = useProjectStore((state) => state.nextDay)
  const changePhase = useProjectStore((state) => state.changePhase)
  const setMetaVariables = useProjectStore((state) => state.setMetaVariables)
  const resetGame = useProjectStore((state) => state.resetGame)
  const applyEffect = useProjectStore((state) => state.applyEffect)
  const setFlag = useProjectStore((state) => state.setFlag)
  const incrementBehavior = useProjectStore((state) => state.incrementBehavior)
  const setOtherAlive = useProjectStore((state) => state.setOtherAlive)
  const consumeAction = useProjectStore((state) => state.consumeAction)
  const setGoalCompleted = useProjectStore((state) => state.setGoalCompleted)
  const setDayGoalKey = useProjectStore((state) => state.setDayGoalKey)

  const [showCover, setShowCover] = useState(true)
  const [coverStage, setCoverStage] = useState(0)
  const [resultTitle, setResultTitle] = useState('')
  const [resultLines, setResultLines] = useState<string[]>([])
  const [resultStamp, setResultStamp] = useState(0)
  const [journalEntries, setJournalEntries] = useState<string[]>([])
  const [showJournal, setShowJournal] = useState(false)
  const [floatingEchoes, setFloatingEchoes] = useState<FloatingEcho[]>([])
  const [backgroundSrc, setBackgroundSrc] = useState(phaseBackgrounds.phase1)
  const [backgroundVisible, setBackgroundVisible] = useState(true)
  const [currentEnding, setCurrentEnding] = useState<keyof typeof endings | null>(null)
  const [endDayAfterResult, setEndDayAfterResult] = useState(false)
  const echoIdRef = useRef(0)

  const typedEllipsis = useTypewriterText('??', coverStage >= 1, 240)
  const typedAlive = useTypewriterText('?????', coverStage >= 2, 76)
  const typedNotAlone = useTypewriterText('??????????', coverStage >= 3, 72)
  const distortionLevel = getDistortionLevel(stress, suspicion, oddities)

  const dailyGoal = useMemo(
    () => getDailyGoal({ day, water, food, trust, suspicion, stress, resource: water + food }),
    [day, food, stress, suspicion, trust, water],
  )
  const currentGoalKey = dailyGoal.key

  const ambientLine = getAmbientLine(day, metaVariables.weather, metaVariables.isNight, water, food)

  useEffect(() => {
    if (currentGoalKey !== dayGoalKey) {
      setDayGoalKey(currentGoalKey as DailyGoalKey)
    }
  }, [currentGoalKey, dayGoalKey, setDayGoalKey])

  const promptLines = useMemo(() => {
    if (currentEvent?.text?.length) {
      return currentEvent.text
    }

    return [
      '??????????????????',
      '??????????????????',
    ]
  }, [currentEvent])

  const distortedPromptLines = useMemo(
    () => promptLines.map((line, index) => distortLine(line, distortionLevel, currentEvent?.unreliable, index)),
    [currentEvent?.unreliable, distortionLevel, promptLines],
  )

  const distortedResultLines = useMemo(
    () => resultLines.map((line, index) => distortLine(line, distortionLevel >= 2 ? distortionLevel : 0, false, index)),
    [distortionLevel, resultLines],
  )

  const { blocks: visiblePromptBlocks, complete: promptReady } = useRevealBlocks(
    distortedPromptLines,
    currentEvent ? `${day}-${currentEvent.id}-${phase}` : `${day}-${phase}`,
    !showCover && phase === 'encounter',
    240,
    860,
  )
  const { blocks: visibleResultBlocks, complete: resultReady } = useRevealBlocks(
    distortedResultLines,
    `${day}-${resultStamp}-result`,
    !showCover && phase === 'result',
    220,
    760,
  )

  useEffect(() => {
    if (!showCover) return
    if (coverStage === 0) {
      const timer = window.setTimeout(() => setCoverStage(1), 500)
      return () => window.clearTimeout(timer)
    }
    if (coverStage === 1 && typedEllipsis.length === '??'.length) {
      const timer = window.setTimeout(() => setCoverStage(2), 800)
      return () => window.clearTimeout(timer)
    }
    if (coverStage === 2 && typedAlive.length === '?????'.length) {
      const timer = window.setTimeout(() => setCoverStage(3), 1200)
      return () => window.clearTimeout(timer)
    }
    if (coverStage === 3 && typedNotAlone.length === '??????????'.length) {
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

    const fadeTimer = window.setTimeout(() => setBackgroundVisible(false), 0)
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

  const emitEffectSummary = (summary: AppliedEffectSummary['delta']) => {
    const entries: Array<{ label: string; value: number; tone: EchoTone }> = []

    if (summary.stamina !== 0) entries.push({ label: '??', value: summary.stamina, tone: getEchoTone(summary.stamina) })
    if (summary.water !== 0) entries.push({ label: '??', value: summary.water, tone: getEchoTone(summary.water) })
    if (summary.food !== 0) entries.push({ label: '??', value: summary.food, tone: getEchoTone(summary.food) })
    if (summary.trust !== 0) entries.push({ label: '??', value: summary.trust, tone: getEchoTone(summary.trust) })
    if (summary.suspicion !== 0) entries.push({ label: '??', value: summary.suspicion, tone: getEchoTone(summary.suspicion, true) })
    if (summary.stress !== 0) entries.push({ label: '??', value: summary.stress, tone: getEchoTone(summary.stress, true) })

    entries.slice(0, 4).forEach((entry) => {
      pushFloatingEcho(`${entry.label} ${formatSignedValue(entry.value)}`, entry.tone)
    })
  }

  const buildStatusSummary = (extraLines: string[] = []) => {
    return [
      `?????????? ${water}?`,
      `???? ${food}?`,
      trust >= 50 ? '???????????????????????????' : '????????????????',
      suspicion >= 60 ? '???????????????' : '?????????????????',
      stress >= 70 ? '????????????????????' : '???????????????????',
      ...extraLines,
    ]
  }

  const refreshEnvironment = (night: boolean) => {
    const state = useProjectStore.getState()
    const weather = weatherPool[(state.day + state.suspicion + state.stress + (night ? 1 : 0)) % weatherPool.length] as Weather
    const hour = night ? 23 : 8 + ((state.day + state.trust + state.water + state.food) % 9)
    setMetaVariables({ weather, hour, isNight: night })
  }

  const restartGame = async () => {
    resetGame()
    setCurrentEnding(null)
    setResultTitle('')
    setResultLines([])
    setResultStamp(0)
    setJournalEntries([])
    setShowJournal(false)
    setEndDayAfterResult(false)
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

  const getActionAvailability = (actionId: string) => {
    if (remainingActions <= 0) {
      return { disabled: true, reason: '?????????????' }
    }

    if (actionId !== 'rest' && stamina <= 0) {
      return { disabled: true, reason: '???????' }
    }

    return { disabled: false, reason: undefined }
  }

  const applyDayAction = (actionId: typeof dayActions[number]['id']) => {
    const availability = getActionAvailability(actionId)
    if (availability.disabled) {
      pushFloatingEcho(availability.reason ?? '???????', 'warning')
      return
    }

    const before = useProjectStore.getState()
    const actionResult = resolveDayAction(actionId, before, dailyGoal, currentEvent)

    const summary = applyEffect(actionResult.effect, actionResult.supplyFocus)
    consumeAction(1)
    incrementBehavior(actionResult.behavior)
    actionResult.flags?.forEach((flag) => setFlag(flag))
    setOtherAlive(!(actionResult.flags ?? []).some((flag) => ['killed_companion', 'accidental_killing', 'other_left_behind', 'they_walked_away'].includes(flag)))

    const after = useProjectStore.getState()
    const completedGoal = isGoalCompletedByAction(dailyGoal, actionResult)
    if (completedGoal) {
      setGoalCompleted(true)
      pushFloatingEcho('????????', 'calm')
    }

    const shiftLines = buildShiftNarrative(
      {
        trust: before.trust,
        suspicion: before.suspicion,
        stress: before.stress,
        stamina: before.stamina,
        hp: before.hp,
        water: before.water,
        food: before.food,
      },
      {
        trust: after.trust,
        suspicion: after.suspicion,
        stress: after.stress,
        stamina: after.stamina,
        hp: after.hp,
        water: after.water,
        food: after.food,
      },
    )

    const narrativeLines = [
      ...actionResult.lines,
      ...shiftLines,
      completedGoal ? getGoalCompletionLine(dailyGoal) : '',
    ].filter(Boolean)

    setResultTitle(`${actionResult.title} ? ${actionResult.tier === 'success' ? '??' : actionResult.tier === 'normal' ? '????' : '??'}`)
    setResultLines([actionResult.feeling, ...narrativeLines])
    setResultStamp((stamp) => stamp + 1)
    setEndDayAfterResult(actionResult.endsDay || after.remainingActions <= 0)
    changePhase('result')
    emitEffectSummary(summary.delta)

    if (summary.delta.trust <= -5) pushFloatingEcho('????????', 'warning')
    if (summary.delta.suspicion >= 4) pushFloatingEcho('??????', 'warning')
    if (summary.delta.stress >= 5) pushFloatingEcho('????????', 'danger')
  }

  const continueFromResult = () => {
    const stateBefore = useProjectStore.getState()
    const shouldEndNow = stateBefore.hp <= 0 || stateBefore.day >= 30 || !stateBefore.otherAlive || stateBefore.flags.includes('killed_companion') || stateBefore.flags.includes('accidental_killing') || stateBefore.flags.includes('mutual_ruin')

    if (shouldEndNow) {
      setJournalEntries((entries) => [
        buildDiaryEntry(stateBefore.day, resultTitle || '??', resultLines, buildStatusSummary()),
        ...entries,
      ].slice(0, 30))
      setCurrentEnding(getEndingState(stateBefore))
      changePhase('ending')
      return
    }

    if (!endDayAfterResult) {
      changePhase('encounter')
      rollEvent()
      return
    }

    const goalMissed = !stateBefore.goalCompleted
    const missLines = goalMissed ? [getGoalFailureLine(dailyGoal)] : [getGoalCompletionLine(dailyGoal)]
    const daySummary = nextDay()
    const stateAfter = useProjectStore.getState()

    setJournalEntries((entries) => [
      buildDiaryEntry(daySummary.previousDay, `?????${dailyGoal.title}`, [...resultLines, ...missLines], buildStatusSummary(daySummary.notes)),
      ...entries,
    ].slice(0, 30))

    emitEffectSummary(daySummary.delta)
    if (goalMissed) {
      pushFloatingEcho('???????????', 'danger')
    }
    daySummary.notes.slice(0, 2).forEach((line) => pushFloatingEcho(line, line.includes('??') || line.includes('?') || line.includes('?') ? 'warning' : 'calm'))

    if (stateAfter.hp <= 0 || !stateAfter.otherAlive || stateAfter.flags.includes('mutual_ruin')) {
      setCurrentEnding(getEndingState(stateAfter))
      changePhase('ending')
      return
    }

    refreshEnvironment(false)
    setResultTitle('')
    setCurrentEnding(null)
    setEndDayAfterResult(false)
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
              ????
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
          <div className="mx-auto mt-4 w-full max-w-[360px]"><ChoiceButton text="????" hoverHint="?????????????????????" onClick={() => { void restartGame() }} /></div>
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
        <header className="mx-auto w-full max-w-[360px] rounded-[24px] border border-stone-800/80 bg-black/26 px-3 py-3 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.42em] text-stone-400/82">Day {day} / 30</div>
              <div className="mt-2 text-xs leading-6 text-stone-300/64">{ambientLine}</div>
            </div>
            <button type="button" onClick={() => setShowJournal(true)} className="rounded-full border border-stone-700/70 bg-black/35 px-3 py-2 text-[11px] tracking-[0.28em] text-stone-200/74 transition hover:bg-black/55">??</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <HudStat label="??" value={stamina} descriptor={getStaminaDescriptor(stamina)} />
            <HudStat label="??" value={water} descriptor={getWaterDescriptor(water)} />
            <HudStat label="??" value={food} descriptor={getFoodDescriptor(food)} />
            <HudStat label="??" value={trust} descriptor={getTrustDescriptor(trust)} />
            <HudStat label="??" value={suspicion} descriptor={suspicion >= 70 ? '??' : suspicion >= 35 ? '??' : '?'} />
            <HudStat label="??" value={stress} descriptor={getStressDescriptor(stress)} />
          </div>
          <div className="mt-3 flex items-start justify-between gap-3 rounded-2xl border border-stone-800/70 bg-black/25 px-3 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-stone-400/60">????</div>
              <div className="mt-1 text-sm font-semibold text-stone-100">{dailyGoal.title}</div>
              <div className="mt-1 text-xs leading-6 text-stone-300/70">{dailyGoal.summary}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] uppercase tracking-[0.28em] text-stone-400/60">????</div>
              <div className="mt-1 text-lg font-semibold text-stone-50">{remainingActions}</div>
              <div className="mt-1 text-[11px] text-stone-300/62">{goalCompleted ? '?????' : '??????'}</div>
            </div>
          </div>
        </header>

        <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top)+13.5rem)] z-20 space-y-2">
          {floatingEchoes.map((echo) => (
            <div key={echo.id} className={`mx-auto max-w-[320px] rounded-full border px-3 py-2 text-center text-[11px] tracking-[0.22em] [animation:driftFadeUp_.4s_ease-out_both] ${echo.tone === 'danger' ? 'border-rose-500/28 bg-rose-500/18 text-rose-50' : echo.tone === 'warning' ? 'border-amber-500/28 bg-amber-500/14 text-amber-50' : 'border-emerald-500/24 bg-emerald-500/14 text-emerald-50'}`}>
              {echo.text}
            </div>
          ))}
        </div>

        <section className="flex flex-1 flex-col justify-center px-1 py-6">
          <article className={`mx-auto w-full max-w-[320px] rounded-[28px] border px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl ${distortionLevel >= 2 ? 'border-rose-900/55 bg-[linear-gradient(180deg,rgba(26,14,14,0.92),rgba(7,5,5,0.98))]' : 'border-stone-700/75 bg-[linear-gradient(180deg,rgba(18,16,14,0.92),rgba(6,5,4,0.98))]'}`}>
            <div className="text-[11px] uppercase tracking-[0.48em] text-stone-400/64">{phase === 'encounter' ? 'Today' : 'Aftermath'}</div>
            <h1 className="mt-4 text-[clamp(1.8rem,6.8vw,2.3rem)] font-semibold leading-tight tracking-[0.08em] text-stone-50">
              {phase === 'result' ? resultTitle || '???????' : currentEvent?.title ?? dailyGoal.title}
            </h1>
            <div className="mt-5 space-y-5 text-[1.04rem] leading-[2.0] tracking-[0.01em] text-stone-100/92">
              {phase === 'encounter' && visiblePromptBlocks.map((line) => <p key={line} className="whitespace-pre-line [animation:driftFadeUp_.75s_ease-out_both]">{line}</p>)}
              {phase === 'result' && visibleResultBlocks.map((line) => <p key={line} className="whitespace-pre-line [animation:driftFadeUp_.75s_ease-out_both]">{line}</p>)}
              {phase === 'encounter' && !promptReady && <p className="text-base leading-8 text-stone-300/70">???????????????????????????????</p>}
            </div>
          </article>
        </section>

        <footer className="mx-auto w-full max-w-[360px] space-y-3">
          {phase === 'encounter' && promptReady && dayActions.map((action, index) => {
            const availability = getActionAvailability(action.id)
            return (
              <ChoiceButton
                key={action.id}
                text={action.title}
                subtitle={action.summary}
                hoverHint={action.hoverHint}
                disabled={availability.disabled}
                disabledReason={availability.reason}
                delayMs={index * 50}
                onClick={() => applyDayAction(action.id)}
              />
            )
          })}
          {phase === 'result' && resultReady && (
            <ChoiceButton
              text={endDayAfterResult ? '?????' : '??????????'}
              subtitle={endDayAfterResult ? '????????????????' : '?????????????????????'}
              hoverHint={endDayAfterResult ? '??????????????????????' : '?????????????????'}
              onClick={continueFromResult}
            />
          )}
        </footer>
      </div>

      {showJournal && (
        <>
          <button type="button" aria-label="????" onClick={() => setShowJournal(false)} className="absolute inset-0 z-30 bg-black/62" />
          <aside className="absolute right-0 top-0 z-40 flex h-full w-[86vw] max-w-sm flex-col border-l border-stone-700/70 bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(4,3,3,1))] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.42em] text-stone-400/68">Journal</div>
                <h2 className="mt-2 text-xl font-semibold tracking-[0.08em] text-stone-50">??</h2>
              </div>
              <button type="button" onClick={() => setShowJournal(false)} className="rounded-full border border-stone-700/70 px-3 py-2 text-[11px] tracking-[0.25em] text-stone-200/72">??</button>
            </div>
            <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
              {(journalEntries.length > 0 ? journalEntries : ['Day 1\n????????\n????????????????']).map((entry) => (
                <article key={entry} className="rounded-[22px] border border-stone-800/75 bg-black/35 px-4 py-4">
                  <p className="whitespace-pre-line text-sm leading-7 text-stone-100/86">{entry}</p>
                </article>
              ))}
            </div>
          </aside>
        </>
      )}
    </main>
  )
}
