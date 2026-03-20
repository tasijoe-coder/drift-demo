export type NpcMemoryKey =
  | 'approachedFirst'
  | 'searchedSuppliesFirst'
  | 'liedOrWithheld'
  | 'sharedResources'
  | 'helpedInDanger'
  | 'backedDownInConfrontation'

export type NpcMemory = Record<NpcMemoryKey, number>

export const createNpcMemory = (): NpcMemory => ({
  approachedFirst: 0,
  searchedSuppliesFirst: 0,
  liedOrWithheld: 0,
  sharedResources: 0,
  helpedInDanger: 0,
  backedDownInConfrontation: 0,
})

export const rememberNpcAction = (memory: NpcMemory, key: NpcMemoryKey, amount = 1): NpcMemory => ({
  ...memory,
  [key]: Math.max(0, memory[key] + amount),
})

export const memoryDeltaForKey = (key: NpcMemoryKey, amount = 1) => {
  switch (key) {
    case 'approachedFirst':
      return {
        trustTowardPlayer: 2 * amount,
        suspicion: -1 * amount,
        willingnessToCooperate: 2 * amount,
      }
    case 'searchedSuppliesFirst':
      return {
        trustTowardPlayer: -2 * amount,
        suspicion: 4 * amount,
        aggression: 1 * amount,
      }
    case 'liedOrWithheld':
      return {
        trustTowardPlayer: -6 * amount,
        suspicion: 7 * amount,
        aggression: 2 * amount,
        willingnessToCooperate: -3 * amount,
      }
    case 'sharedResources':
      return {
        trustTowardPlayer: 6 * amount,
        suspicion: -3 * amount,
        willingnessToCooperate: 4 * amount,
      }
    case 'helpedInDanger':
      return {
        trustTowardPlayer: 8 * amount,
        fear: -3 * amount,
        suspicion: -2 * amount,
        willingnessToCooperate: 5 * amount,
      }
    case 'backedDownInConfrontation':
      return {
        aggression: -2 * amount,
        suspicion: 1 * amount,
      }
  }
}
