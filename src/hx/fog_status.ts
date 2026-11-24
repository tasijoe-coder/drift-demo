import type { Flags } from '../engine/novel'

/** Counts are reconstructed from route flags; no mutable counters are stored. */
export function fogResources(flags: Flags) {
  const goldUsed = 1 + Number(flags.goldExtra === true) + Number(flags.goldLast === true)
  const jadeUsed = 1 + Number(flags.jadeExtra === true) + Number(flags.jadeLast === true)
  return {
    goldUsed, jadeUsed,
    goldLeft: flags.powersSealed === true ? 0 : 3 - goldUsed,
    jadeLeft: flags.powersSealed === true ? 0 : 3 - jadeUsed,
    moonMarks: Number(flags.moonCover === true) + Number(flags.moonAid === true),
    sealed: flags.powersSealed === true, closed: flags.moonClosed === true,
  }
}
