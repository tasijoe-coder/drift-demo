import { create } from 'zustand'

export type GamePhase = 'encounter' | 'result' | 'log' | 'ending'

export type Weather = 'sunny' | 'rain' | 'cloudy'

export type DayPhase = 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5'

export type BehaviorType = 'selfish' | 'honest' | 'cooperative' | 'aggressive'

export type SupplyFocus = 'food' | 'water' | 'mixed'

export type MetaVariables = {
  hour: number
  weather: Weather
  isNight: boolean
}

export type GameStateEffect = {
  stamina?: number
  water?: number
  food?: number
  trust?: number
  suspicion?: number
  stress?: number
  resource?: number
  hp?: number
  oddities?: number
}

export type AppliedEffectSummary = {
  delta: Required<GameStateEffect>
}

export type DayTransitionSummary = {
  previousDay: number
  nextDay: number
  delta: Required<GameStateEffect>
  notes: string[]
}

type GameStore = {
  day: number
  dayPhase: DayPhase
  phase: GamePhase
  stamina: number
  hp: number
  water: number
  food: number
  trust: number
  suspicion: number
  stress: number
  resource: number
  oddities: number
  otherAlive: boolean
  flags: string[]
  selfishCount: number
  honestCount: number
  cooperativeCount: number
  aggressiveCount: number
  metaVariables: MetaVariables
  nextDay: () => DayTransitionSummary
  setDay: (day: number) => void
  changePhase: (phase: GamePhase) => void
  setStamina: (value: number) => void
  modifyStamina: (value: number) => void
  setWater: (value: number) => void
  modifyWater: (value: number) => void
  setFood: (value: number) => void
  modifyFood: (value: number) => void
  setTrust: (value: number) => void
  modifyTrust: (value: number) => void
  setSuspicion: (value: number) => void
  modifySuspicion: (value: number) => void
  setStress: (value: number) => void
  modifyStress: (value: number) => void
  modifyHp: (value: number) => void
  modifyResource: (value: number) => void
  modifyOddities: (value: number) => void
  applyEffect: (effect?: GameStateEffect, supplyFocus?: SupplyFocus) => AppliedEffectSummary
  setOtherAlive: (value: boolean) => void
  setFlag: (flag: string) => void
  clearFlag: (flag: string) => void
  hasFlag: (flag: string) => boolean
  incrementBehavior: (behavior?: BehaviorType) => void
  setMetaVariables: (partialMeta: Partial<MetaVariables>) => void
  resetGame: () => void
}

const clampZeroToHundred = (value: number) => Math.max(0, Math.min(100, value))
const clampSupply = (value: number) => Math.max(0, value)
const syncResource = (water: number, food: number) => Math.max(0, water + food)

const distributeSupplyDelta = (water: number, food: number, delta: number, focus: SupplyFocus = 'mixed') => {
  let nextWater = water
  let nextFood = food

  if (delta === 0) {
    return { water: nextWater, food: nextFood }
  }

  const step = delta > 0 ? 1 : -1

  for (let index = 0; index < Math.abs(delta); index += 1) {
    if (step > 0) {
      if (focus === 'water') {
        nextWater += 1
      } else if (focus === 'food') {
        nextFood += 1
      } else if (nextWater <= nextFood) {
        nextWater += 1
      } else {
        nextFood += 1
      }
      continue
    }

    if (focus === 'water' && nextWater > 0) {
      nextWater -= 1
      continue
    }

    if (focus === 'food' && nextFood > 0) {
      nextFood -= 1
      continue
    }

    if (nextWater >= nextFood && nextWater > 0) {
      nextWater -= 1
      continue
    }

    if (nextFood > 0) {
      nextFood -= 1
      continue
    }

    if (nextWater > 0) {
      nextWater -= 1
    }
  }

  return {
    water: clampSupply(nextWater),
    food: clampSupply(nextFood),
  }
}

const applyEffectToSnapshot = (
  current: Pick<GameStore, 'stamina' | 'hp' | 'water' | 'food' | 'trust' | 'suspicion' | 'stress' | 'resource' | 'oddities'>,
  effect: GameStateEffect = {},
  supplyFocus: SupplyFocus = 'mixed',
) => {
  let nextWater = clampSupply(current.water + (effect.water ?? 0))
  let nextFood = clampSupply(current.food + (effect.food ?? 0))

  if ((effect.resource ?? 0) !== 0) {
    const distributed = distributeSupplyDelta(nextWater, nextFood, effect.resource ?? 0, supplyFocus)
    nextWater = distributed.water
    nextFood = distributed.food
  }

  const nextState = {
    stamina: clampZeroToHundred(current.stamina + (effect.stamina ?? 0)),
    hp: clampZeroToHundred(current.hp + (effect.hp ?? 0)),
    water: nextWater,
    food: nextFood,
    trust: clampZeroToHundred(current.trust + (effect.trust ?? 0)),
    suspicion: clampZeroToHundred(current.suspicion + (effect.suspicion ?? 0)),
    stress: clampZeroToHundred(current.stress + (effect.stress ?? 0)),
    oddities: Math.max(0, current.oddities + (effect.oddities ?? 0)),
  }

  const nextResource = syncResource(nextState.water, nextState.food)

  return {
    nextState: {
      ...nextState,
      resource: nextResource,
    },
    delta: {
      stamina: nextState.stamina - current.stamina,
      hp: nextState.hp - current.hp,
      water: nextState.water - current.water,
      food: nextState.food - current.food,
      trust: nextState.trust - current.trust,
      suspicion: nextState.suspicion - current.suspicion,
      stress: nextState.stress - current.stress,
      oddities: nextState.oddities - current.oddities,
      resource: nextResource - current.resource,
    },
  }
}

const buildDayTransition = (
  current: Pick<GameStore, 'day' | 'stamina' | 'hp' | 'water' | 'food' | 'trust' | 'suspicion' | 'stress' | 'resource' | 'oddities' | 'metaVariables'>,
): DayTransitionSummary & {
  nextState: Pick<GameStore, 'day' | 'dayPhase' | 'stamina' | 'hp' | 'water' | 'food' | 'trust' | 'suspicion' | 'stress' | 'resource' | 'oddities'>
} => {
  const nextDayValue = Math.min(30, current.day + 1)
  const hadWater = current.water > 0
  const hadFood = current.food > 0
  const baseEffect: GameStateEffect = {
    water: hadWater ? -1 : 0,
    food: hadFood ? -1 : 0,
    stamina: hadWater && hadFood ? (current.day <= 10 ? 8 : current.day <= 20 ? 6 : 4) : 0,
    stress: hadWater && hadFood ? (current.day <= 10 ? -2 : -1) : 0,
  }

  const notes: string[] = []

  if (current.metaVariables.weather === 'rain') {
    baseEffect.stress = (baseEffect.stress ?? 0) + 1
    notes.push('???????????????????')
  }

  if (!hadWater) {
    baseEffect.stress = (baseEffect.stress ?? 0) + (current.day <= 10 ? 8 : current.day <= 20 ? 10 : 14)
    baseEffect.stamina = (baseEffect.stamina ?? 0) - (current.day <= 10 ? 8 : current.day <= 20 ? 10 : 14)
    baseEffect.suspicion = (baseEffect.suspicion ?? 0) + (current.day <= 12 ? 1 : 2)
    baseEffect.hp = (baseEffect.hp ?? 0) - (current.day <= 10 ? 2 : current.day <= 20 ? 4 : 6)
    notes.push('?????????????????????????')
  }

  if (!hadFood) {
    baseEffect.stress = (baseEffect.stress ?? 0) + (current.day <= 10 ? 6 : current.day <= 20 ? 8 : 12)
    baseEffect.stamina = (baseEffect.stamina ?? 0) - (current.day <= 10 ? 6 : current.day <= 20 ? 8 : 12)
    baseEffect.hp = (baseEffect.hp ?? 0) - (current.day <= 10 ? 1 : current.day <= 20 ? 3 : 5)
    notes.push('?????????????????????')
  }

  if (hadWater && hadFood) {
    notes.push('???????????????????????????????')
  }

  if (!hadWater && !hadFood) {
    baseEffect.trust = (baseEffect.trust ?? 0) - 2
    notes.push('??????????????????????')
  }

  const applied = applyEffectToSnapshot(current, baseEffect, 'mixed')

  return {
    previousDay: current.day,
    nextDay: nextDayValue,
    delta: applied.delta,
    notes,
    nextState: {
      day: nextDayValue,
      dayPhase: getDayPhase(nextDayValue),
      stamina: applied.nextState.stamina,
      hp: applied.nextState.hp,
      water: applied.nextState.water,
      food: applied.nextState.food,
      trust: applied.nextState.trust,
      suspicion: applied.nextState.suspicion,
      stress: applied.nextState.stress,
      resource: applied.nextState.resource,
      oddities: applied.nextState.oddities,
    },
  }
}

export const getDayPhase = (day: number): DayPhase => {
  if (day <= 5) {
    return 'phase1'
  }

  if (day <= 12) {
    return 'phase2'
  }

  if (day <= 20) {
    return 'phase3'
  }

  if (day <= 27) {
    return 'phase4'
  }

  return 'phase5'
}

const getInitialMeta = (): MetaVariables => {
  const hour = new Date().getHours()

  return {
    hour,
    weather: 'sunny',
    isNight: hour >= 23 || hour <= 5,
  }
}

const getInitialState = () => {
  const water = 3
  const food = 2

  return {
    day: 1,
    dayPhase: getDayPhase(1),
    phase: 'encounter' as GamePhase,
    stamina: 70,
    hp: 100,
    water,
    food,
    trust: 50,
    suspicion: 10,
    stress: 15,
    resource: syncResource(water, food),
    oddities: 0,
    otherAlive: true,
    flags: [] as string[],
    selfishCount: 0,
    honestCount: 0,
    cooperativeCount: 0,
    aggressiveCount: 0,
    metaVariables: getInitialMeta(),
  }
}

export const useProjectStore = create<GameStore>((set, get) => ({
  ...getInitialState(),
  nextDay: () => {
    const transition = buildDayTransition(get())

    set(transition.nextState)

    return {
      previousDay: transition.previousDay,
      nextDay: transition.nextDay,
      delta: transition.delta,
      notes: transition.notes,
    }
  },
  setDay: (day) => {
    const nextDayValue = Math.max(1, Math.min(30, day))

    set({
      day: nextDayValue,
      dayPhase: getDayPhase(nextDayValue),
    })
  },
  changePhase: (phase) => {
    set({ phase })
  },
  setStamina: (value) => {
    set({ stamina: clampZeroToHundred(value) })
  },
  modifyStamina: (value) => {
    set((state) => ({ stamina: clampZeroToHundred(state.stamina + value) }))
  },
  setWater: (value) => {
    set((state) => {
      const water = clampSupply(value)
      return {
        water,
        resource: syncResource(water, state.food),
      }
    })
  },
  modifyWater: (value) => {
    set((state) => {
      const water = clampSupply(state.water + value)
      return {
        water,
        resource: syncResource(water, state.food),
      }
    })
  },
  setFood: (value) => {
    set((state) => {
      const food = clampSupply(value)
      return {
        food,
        resource: syncResource(state.water, food),
      }
    })
  },
  modifyFood: (value) => {
    set((state) => {
      const food = clampSupply(state.food + value)
      return {
        food,
        resource: syncResource(state.water, food),
      }
    })
  },
  setTrust: (value) => {
    set({ trust: clampZeroToHundred(value) })
  },
  modifyTrust: (value) => {
    set((state) => ({ trust: clampZeroToHundred(state.trust + value) }))
  },
  setSuspicion: (value) => {
    set({ suspicion: clampZeroToHundred(value) })
  },
  modifySuspicion: (value) => {
    set((state) => ({ suspicion: clampZeroToHundred(state.suspicion + value) }))
  },
  setStress: (value) => {
    set({ stress: clampZeroToHundred(value) })
  },
  modifyStress: (value) => {
    set((state) => ({ stress: clampZeroToHundred(state.stress + value) }))
  },
  modifyHp: (value) => {
    set((state) => ({ hp: clampZeroToHundred(state.hp + value) }))
  },
  modifyResource: (value) => {
    set((state) => {
      const distributed = distributeSupplyDelta(state.water, state.food, value, 'mixed')
      return {
        water: distributed.water,
        food: distributed.food,
        resource: syncResource(distributed.water, distributed.food),
      }
    })
  },
  modifyOddities: (value) => {
    set((state) => ({ oddities: Math.max(0, state.oddities + value) }))
  },
  applyEffect: (effect = {}, supplyFocus = 'mixed') => {
    const applied = applyEffectToSnapshot(get(), effect, supplyFocus)

    set(applied.nextState)

    return {
      delta: applied.delta,
    }
  },
  setOtherAlive: (value) => {
    set({ otherAlive: value })
  },
  setFlag: (flag) => {
    set((state) => ({
      flags: state.flags.includes(flag) ? state.flags : [...state.flags, flag],
    }))
  },
  clearFlag: (flag) => {
    set((state) => ({
      flags: state.flags.filter((currentFlag) => currentFlag !== flag),
    }))
  },
  hasFlag: (flag) => get().flags.includes(flag),
  incrementBehavior: (behavior) => {
    if (!behavior) {
      return
    }

    set((state) => ({
      selfishCount: behavior === 'selfish' ? state.selfishCount + 1 : state.selfishCount,
      honestCount: behavior === 'honest' ? state.honestCount + 1 : state.honestCount,
      cooperativeCount: behavior === 'cooperative' ? state.cooperativeCount + 1 : state.cooperativeCount,
      aggressiveCount: behavior === 'aggressive' ? state.aggressiveCount + 1 : state.aggressiveCount,
    }))
  },
  setMetaVariables: (partialMeta) => {
    set((state) => ({
      metaVariables: {
        ...state.metaVariables,
        ...partialMeta,
      },
    }))
  },
  resetGame: () => {
    set(getInitialState())
  },
}))
