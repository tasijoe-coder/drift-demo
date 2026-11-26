// 小說上方主圖。沒有專屬圖的故事沿用月老案前。
export type NovelArt = { src: string; alt: string; position?: string }

const FALLBACK: NovelArt = { src: '/art/zero/ledger.webp', alt: '月老在渡口的姻緣簿前。' }

const ART: Record<string, NovelArt> = {
  'qin-novel': { src: '/art/novel/qin.webp', alt: '秦代暮春的後院，翻牆而入的書生與杏花樹下拿著團扇的女子初次相望，遠方是長城。', position: '50% 38%' },
}

export const novelArt = (storyId: string): NovelArt => ART[storyId] ?? FALLBACK
