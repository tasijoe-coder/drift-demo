export const readingDelay = (text: string, imageChanged = false) => 1200 + [...text].length * 120 + (imageChanged ? 800 : 0)
export const isReadingTap = (distance: number, duration: number) => distance < 10 && duration < 300
export const bonusChapterUnlocked = (order: number, completed: readonly number[]) => order >= 8 && order <= 10 && completed.includes(order - 1)
export function splitReadingText(text: string): string[] {
  return text.match(/[^。！？!?\n]+[。！？!?]+[」』”’]?|[^。！？!?\n]+(?:\n|$)/gu)?.map(line => line.trim()).filter(Boolean) ?? [text]
}
