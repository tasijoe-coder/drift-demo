export type ResumeChapter = { id: string; unlocked: boolean; played: boolean }

/** Merely creating initial save keys must not create a fake continue card. */
export function selectResumeChapter(last: string, zeroPlayed: boolean, chapters: readonly ResumeChapter[]): string | null {
  if (last === 'zero' && zeroPlayed) return 'zero'
  const remembered = chapters.find(chapter => chapter.id === last && chapter.unlocked)
  if (remembered) return remembered.id
  return chapters.findLast(chapter => chapter.unlocked && chapter.played)?.id ?? (zeroPlayed ? 'zero' : null)
}
