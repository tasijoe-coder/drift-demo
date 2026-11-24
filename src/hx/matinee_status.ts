import type { Flags } from '../engine/novel'
export function matineeResources(flags: Flags) {
  const goldUsed = Number(flags.mGoldFirst === true) + Number(flags.mGoldSecond === true) + Number(flags.mGoldLast === true)
  const jadeUsed = Number(flags.mJadeFirst === true) + Number(flags.mJadeSecond === true) + Number(flags.mJadeLast === true)
  return { goldUsed, jadeUsed, goldLeft: 3 - goldUsed, jadeLeft: 3 - jadeUsed,
    moonMarks: Number(flags.mMoonDoor === true) + Number(flags.mMoonAid === true) }
}
