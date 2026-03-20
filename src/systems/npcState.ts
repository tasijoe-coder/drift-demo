import type { NpcTag, NpcId, NpcPersonality } from '../data/npcs'
import type { NpcMemory } from './memory'

export type NpcMood = 'watchful' | 'measured' | 'tense' | 'cornered' | 'volatile'

export type NpcState = {
  id: NpcId
  name: string
  personality: NpcPersonality
  currentMood: NpcMood
  trustTowardPlayer: number
  fear: number
  suspicion: number
  aggression: number
  willingnessToCooperate: number
  hiddenTags: NpcTag[]
  memory: NpcMemory
}

export type NpcDelta = Partial<Pick<NpcState, 'trustTowardPlayer' | 'fear' | 'suspicion' | 'aggression' | 'willingnessToCooperate'>> & {
  currentMood?: NpcMood
  addTags?: NpcTag[]
  removeTags?: NpcTag[]
}

const clamp = (value: number) => Math.max(0, Math.min(100, value))

export const deriveNpcMood = (state: Pick<NpcState, 'personality' | 'fear' | 'suspicion' | 'aggression' | 'trustTowardPlayer' | 'hiddenTags'>): NpcMood => {
  if (state.hiddenTags.includes('unstable') || state.personality === 'unstable' || state.aggression >= 72 || state.fear >= 78) {
    return 'volatile'
  }

  if (state.suspicion >= 68 || state.aggression >= 54) {
    return 'cornered'
  }

  if (state.fear >= 52 || state.suspicion >= 48) {
    return 'tense'
  }

  if (state.trustTowardPlayer >= 58 && state.suspicion <= 38) {
    return 'measured'
  }

  return 'watchful'
}


export const applyNpcDelta = (state: NpcState, delta: NpcDelta): NpcState => {
  const nextTags = new Set(state.hiddenTags)
  delta.addTags?.forEach((tag) => nextTags.add(tag))
  delta.removeTags?.forEach((tag) => nextTags.delete(tag))

  const updated = {
    ...state,
    trustTowardPlayer: clamp(state.trustTowardPlayer + (delta.trustTowardPlayer ?? 0)),
    fear: clamp(state.fear + (delta.fear ?? 0)),
    suspicion: clamp(state.suspicion + (delta.suspicion ?? 0)),
    aggression: clamp(state.aggression + (delta.aggression ?? 0)),
    willingnessToCooperate: clamp(state.willingnessToCooperate + (delta.willingnessToCooperate ?? 0)),
    hiddenTags: Array.from(nextTags),
    currentMood: delta.currentMood ?? state.currentMood,
  }

  return {
    ...updated,
    currentMood: deriveNpcMood(updated),
  }
}

export const behaviorPressureOnNpc = (state: NpcState, behavior: {
  selfishCount: number
  honestCount: number
  cooperativeCount: number
  aggressiveCount: number
}) => {
  const selfishPressure = behavior.selfishCount >= 2 ? 4 + behavior.selfishCount : 0
  const honestRelief = behavior.honestCount >= 2 ? Math.min(behavior.honestCount * 2, 8) : 0
  const cooperativeLift = behavior.cooperativeCount >= 2 ? 3 + behavior.cooperativeCount : 0
  const aggressivePressure = behavior.aggressiveCount >= 1 ? 5 + behavior.aggressiveCount * 2 : 0

  return applyNpcDelta(state, {
    trustTowardPlayer: cooperativeLift + honestRelief - selfishPressure - Math.floor(aggressivePressure / 2),
    suspicion: selfishPressure + aggressivePressure - honestRelief,
    aggression: aggressivePressure - Math.floor(cooperativeLift / 2),
    willingnessToCooperate: cooperativeLift + honestRelief - Math.floor(selfishPressure / 2),
  })
}

