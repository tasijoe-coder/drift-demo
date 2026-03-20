import { useCallback, useMemo, useState } from 'react'

import type { NpcId } from '../data/npcs'
import {
  getOpeningOutcome,
  getOpeningScene,
  resolveOpeningChoice,
  type OpeningChoice,
  type OpeningOutcome,
  type OpeningOutcomeId,
  type OpeningScene,
  type OpeningSceneId,
} from '../systems/events'
import { useProjectStore } from '../store/useProjectStore'

export function useDynamicDayOne() {
  const day = useProjectStore((state) => state.day)
  const runSetup = useProjectStore((state) => state.runSetup)
  const npcs = useProjectStore((state) => state.npcs)
  const flags = useProjectStore((state) => state.flags)
  const trust = useProjectStore((state) => state.trust)
  const suspicion = useProjectStore((state) => state.suspicion)
  const stress = useProjectStore((state) => state.stress)
  const stamina = useProjectStore((state) => state.stamina)
  const water = useProjectStore((state) => state.water)
  const food = useProjectStore((state) => state.food)
  const initializeNpcRun = useProjectStore((state) => state.initializeNpcRun)
  const applyEffect = useProjectStore((state) => state.applyEffect)
  const applyNpcDelta = useProjectStore((state) => state.applyNpcDelta)
  const recordNpcMemory = useProjectStore((state) => state.recordNpcMemory)
  const setFlag = useProjectStore((state) => state.setFlag)

  const [sceneId, setSceneId] = useState<OpeningSceneId | null>(null)
  const [outcomeId, setOutcomeId] = useState<OpeningOutcomeId | null>(null)

  const context = useMemo(() => {
    if (!runSetup) return null
    return {
      player: {
        day,
        trust,
        suspicion,
        stress,
        stamina,
        water,
        food,
        flags,
      },
      run: runSetup,
      npcs,
    }
  }, [day, flags, food, npcs, runSetup, stamina, stress, suspicion, trust, water])

  const scene: OpeningScene | null = useMemo(() => {
    if (!context || !sceneId) return null
    return getOpeningScene(sceneId, context)
  }, [context, sceneId])

  const outcome: OpeningOutcome | null = useMemo(() => {
    if (!context || !outcomeId) return null
    return getOpeningOutcome(outcomeId, context)
  }, [context, outcomeId])

  const start = useCallback(() => {
    initializeNpcRun()
    setOutcomeId(null)
    setSceneId('beach_wake')
  }, [initializeNpcRun])

  const clear = useCallback(() => {
    setSceneId(null)
    setOutcomeId(null)
  }, [])

  const resolveChoice = useCallback((choice: OpeningChoice) => {
    if (!context || !sceneId) return null

    const resolved = resolveOpeningChoice(sceneId, choice.id, context)

    if (resolved.playerEffect) {
      applyEffect(resolved.playerEffect, 'mixed')
    }

    Object.entries(resolved.npcDeltas ?? {}).forEach(([npcId, delta]) => {
      if (delta) {
        applyNpcDelta(npcId as NpcId, delta)
      }
    })

    resolved.memoryWrites?.forEach((memory) => {
      recordNpcMemory(memory.npcId, memory.key, memory.amount)
    })

    resolved.flags?.forEach((flag) => {
      setFlag(flag)
    })

    return resolved
  }, [applyEffect, applyNpcDelta, context, recordNpcMemory, sceneId, setFlag])

  const advanceToScene = useCallback((nextSceneId: OpeningSceneId) => {
    setSceneId(nextSceneId)
  }, [])

  const openOutcome = useCallback((nextOutcomeId: OpeningOutcomeId) => {
    setSceneId(null)
    setOutcomeId(nextOutcomeId)
  }, [])

  return {
    isActive: day === 1 && !!sceneId,
    hasStarted: !!sceneId || !!outcomeId,
    scene,
    outcome,
    start,
    clear,
    resolveChoice,
    advanceToScene,
    openOutcome,
  }
}
