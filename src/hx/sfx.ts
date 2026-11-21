// 程式合成音效（不需要音檔）。第一次互動時呼叫 unlock()。

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false

try {
  muted = localStorage.getItem('hx.muted') === '1'
} catch {
  /* ignore */
}

export const unlock = async () => {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!C) return
    ctx = new C()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.55
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') await ctx.resume()
}

export const isMuted = () => muted
export const setMuted = (m: boolean) => {
  muted = m
  try {
    localStorage.setItem('hx.muted', m ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (master) master.gain.value = m ? 0 : 0.55
}

const env = (g: GainNode, t: number, a: number, peak: number, d: number) => {
  g.gain.cancelScheduledValues(t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
}

/** 撥弦（古琴／古箏感）：Karplus-Strong 簡化版，用多個泛音近似 */
const pluck = (freq: number, when = 0, vol = 0.25, decay = 1.6) => {
  if (!ctx || !master) return
  const t = ctx.currentTime + when
  ;[1, 2, 3, 4.2].forEach((h, i) => {
    const o = ctx!.createOscillator()
    const g = ctx!.createGain()
    o.type = i === 0 ? 'triangle' : 'sine'
    o.frequency.value = freq * h
    env(g, t, 0.004, vol / (i + 1) ** 1.3, decay / (i * 0.6 + 1))
    o.connect(g).connect(master!)
    o.start(t)
    o.stop(t + decay + 0.1)
  })
}

/** 鈴／磬 */
const bell = (freq: number, when = 0, vol = 0.18, decay = 2.4) => {
  if (!ctx || !master) return
  const t = ctx.currentTime + when
  ;[1, 2.76, 5.4].forEach((h, i) => {
    const o = ctx!.createOscillator()
    const g = ctx!.createGain()
    o.type = 'sine'
    o.frequency.value = freq * h
    env(g, t, 0.002, vol / (i * 1.5 + 1), decay / (i + 1))
    o.connect(g).connect(master!)
    o.start(t)
    o.stop(t + decay + 0.1)
  })
}

/** 噪音（風、紙） */
const noise = (dur: number, freq: number, q: number, vol: number, when = 0, type: BiquadFilterType = 'bandpass') => {
  if (!ctx || !master) return
  const t = ctx.currentTime + when
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  env(g, t, dur * 0.3, vol, dur * 0.7)
  src.connect(f).connect(g).connect(master)
  src.start(t)
}

/** 低沉的鼓 */
const drum = (freq = 70, when = 0, vol = 0.5) => {
  if (!ctx || !master) return
  const t = ctx.currentTime + when
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq * 1.8, t)
  o.frequency.exponentialRampToValueAtTime(freq, t + 0.12)
  env(g, t, 0.005, vol, 0.5)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + 0.6)
}

// 五聲音階（宮商角徵羽）
const PENTA = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3]

export const sfx = {
  /** 按鈕 */
  tap: () => pluck(PENTA[5], 0, 0.12, 0.5),
  /** 翻開新卡 */
  card: () => {
    noise(0.25, 2400, 0.8, 0.06)
    pluck(PENTA[2], 0.05, 0.1, 0.8)
  },
  /** 拖到某人身上（依方向不同音） */
  hover: (i: number) => pluck(PENTA[[4, 0, 2, 3][i] ?? 1], 0, 0.1, 0.5),
  /** 天意落下 */
  drop: () => {
    noise(0.5, 900, 0.6, 0.08, 0, 'lowpass')
    bell(PENTA[3], 0.02, 0.16, 2)
  },
  /** 紅線上升／下降 */
  bondUp: () => {
    pluck(PENTA[4], 0, 0.14)
    pluck(PENTA[6], 0.09, 0.12)
  },
  bondDown: () => {
    pluck(PENTA[2], 0, 0.14)
    pluck(PENTA[0] * 0.75, 0.1, 0.12, 2)
  },
  /** 數值進入危險區 */
  warn: () => {
    drum(60, 0, 0.35)
    drum(60, 0.32, 0.25)
  },
  /** 天規上升（天庭的鐘） */
  heaven: () => bell(PENTA[0] * 2, 0, 0.08, 3),
  /** 新的一幕 */
  act: () => {
    drum(55, 0, 0.4)
    bell(PENTA[0], 0.1, 0.12, 3)
  },
  /** 好結局 */
  good: () => [0, 2, 4, 5, 7].forEach((n, i) => pluck(PENTA[n], i * 0.16, 0.16, 2.2)),
  /** 壞結局 */
  bad: () => {
    drum(45, 0, 0.5)
    ;[4, 2, 1, 0].forEach((n, i) => pluck(PENTA[n] * 0.5, 0.3 + i * 0.35, 0.14, 2.5))
  },
  /** 紅線斷掉 */
  snap: () => {
    pluck(PENTA[7] * 2, 0, 0.2, 0.3)
    noise(0.15, 5000, 2, 0.12)
  },
}
