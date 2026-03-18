import { create } from 'zustand'

export type GamePhase = 'encounter' | 'result' | 'log' | 'ending'

export type Weather = 'sunny' | 'rain' | 'cloudy'

export type DayPhase = 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5'

export type BehaviorType = 'selfish' | 'honest' | 'cooperative' | 'aggressive'

export type MetaVariables = {
  hour: number
  weather: Weather
  isNight: boolean
}

type GameStore = {
  day: number
  dayPhase: DayPhase
  phase: GamePhase
  stamina: number
  hp: number
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
  nextDay: () => void
  setDay: (day: number) => void
  changePhase: (phase: GamePhase) => void
  modifyStamina: (value: number) => void
  modifyHp: (value: number) => void
  modifyTrust: (value: number) => void
  modifySuspicion: (value: number) => void
  modifyStress: (value: number) => void
  modifyResource: (value: number) => void
  modifyOddities: (value: number) => void
  setOtherAlive: (value: boolean) => void
  setFlag: (flag: string) => void
  clearFlag: (flag: string) => void
  hasFlag: (flag: string) => boolean
  incrementBehavior: (behavior?: BehaviorType) => void
  setMetaVariables: (partialMeta: Partial<MetaVariables>) => void
  resetGame: () => void
}

const clampZeroToHundred = (value: number) => Math.max(0, Math.min(100, value))
const clampResource = (value: number) => Math.max(0, Math.min(12, value))
const clampOddities = (value: number) => Math.max(0, Math.min(8, value))

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

const getInitialState = () => ({
  day: 1,
  dayPhase: getDayPhase(1),
  phase: 'encounter' as GamePhase,
  stamina: 78,
  hp: 100,
  trust: 46,
  suspicion: 18,
  stress: 26,
  resource: 5,
  oddities: 0,
  otherAlive: true,
  flags: [] as string[],
  selfishCount: 0,
  honestCount: 0,
  cooperativeCount: 0,
  aggressiveCount: 0,
  metaVariables: getInitialMeta(),
})

export const useProjectStore = create<GameStore>((set, get) => ({
  ...getInitialState(),
  nextDay: () => {
    set((state) => {
      const nextDay = Math.min(30, state.day + 1)

      return {
        day: nextDay,
        dayPhase: getDayPhase(nextDay),
      }
    })
  },
  setDay: (day) => {
    const nextDay = Math.max(1, Math.min(30, day))

    set({
      day: nextDay,
      dayPhase: getDayPhase(nextDay),
    })
  },
  changePhase: (phase) => {
    set({ phase })
  },
  modifyStamina: (value) => {
    set((state) => ({ stamina: clampZeroToHundred(state.stamina + value) }))
  },
  modifyHp: (value) => {
    set((state) => ({ hp: clampZeroToHundred(state.hp + value) }))
  },
  modifyTrust: (value) => {
    set((state) => ({ trust: clampZeroToHundred(state.trust + value) }))
  },
  modifySuspicion: (value) => {
    set((state) => ({ suspicion: clampZeroToHundred(state.suspicion + value) }))
  },
  modifyStress: (value) => {
    set((state) => ({ stress: clampZeroToHundred(state.stress + value) }))
  },
  modifyResource: (value) => {
    set((state) => ({ resource: clampResource(state.resource + value) }))
  },
  modifyOddities: (value) => {
    set((state) => ({ oddities: clampOddities(state.oddities + value) }))
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
