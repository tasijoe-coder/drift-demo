export type NpcId = 'shore_figure' | 'late_survivor'

export type NpcPersonality = 'guarded' | 'calm' | 'opportunistic' | 'unstable'

export type NpcTag = 'injured' | 'lying' | 'hoarding' | 'unstable' | 'watchful'

export type NpcDefinition = {
  id: NpcId
  name: string
  role: string
  personalityPool: NpcPersonality[]
  baseTrust: number
  baseFear: number
  baseSuspicion: number
  baseAggression: number
  baseCooperation: number
  defaultTags?: NpcTag[]
}

export const npcDefinitions: NpcDefinition[] = [
  {
    id: 'shore_figure',
    name: '先醒來的人',
    role: '海灘上的陌生人',
    personalityPool: ['guarded', 'calm', 'opportunistic'],
    baseTrust: 38,
    baseFear: 28,
    baseSuspicion: 42,
    baseAggression: 24,
    baseCooperation: 48,
    defaultTags: ['watchful'],
  },
  {
    id: 'late_survivor',
    name: '後來出現的人',
    role: '晚一步被發現的倖存者',
    personalityPool: ['calm', 'opportunistic', 'unstable', 'guarded'],
    baseTrust: 34,
    baseFear: 42,
    baseSuspicion: 36,
    baseAggression: 18,
    baseCooperation: 44,
  },
]
