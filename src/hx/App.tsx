import { useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react'

import * as F from '../engine/fate'
import type { Life, State, Target } from '../engine/fate'
import { LIFE_MENU, lifeById } from '../data/lives'
import { sfx, unlock, isMuted, setMuted } from './sfx'

// ---------- 存檔 ----------
const KEY_SAVE = 'hx.save.v1'
const KEY_REC = 'hx.rec.v1'
const KEY_MEM = 'hx.mem.v1'
type Rec = { endings: Record<string, string[]>; runs: number }
const load = <T,>(k: string, fb: T): T => {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : fb
  } catch {
    return fb
  }
}
const store = (k: string, v: unknown) => {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* ignore */
  }
}

// ---------- 視覺 ----------
const ACT_BG: Record<string, string> = {
  garden: 'radial-gradient(120% 80% at 50% 10%, #3d4a3a 0%, #1d241c 55%, #0d100c 100%)',
  wedding: 'radial-gradient(120% 80% at 50% 20%, #5a1f22 0%, #2a0f12 55%, #120607 100%)',
  wall: 'radial-gradient(120% 80% at 50% 0%, #4a5160 0%, #23262f 55%, #0e0f13 100%)',
  fate: 'radial-gradient(120% 80% at 50% 30%, #4d3d1e 0%, #241c0e 55%, #0f0b05 100%)',
  home: 'radial-gradient(130% 90% at 50% 0%, #3a1a1d 0%, #1a0d0f 50%, #080405 100%)',
}
const RANK_COLOR: Record<string, string> = { S: '#f0c96a', A: '#e88c8c', B: '#a9c4e8', C: '#c9c1b3', D: '#8d877d', F: '#8f5c5c' }
const RANK_GOOD = ['S', 'A']

const Shell = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <main className="relative h-[100dvh] overflow-hidden text-[#f3ece0]" style={{ background: bg, fontFamily: '"Noto Serif TC","Songti TC","PMingLiU",serif' }}>
    <style>{`
      @keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      @keyframes fade{from{opacity:0}to{opacity:1}}
      @keyframes thrum{0%,100%{transform:translateX(0)}25%{transform:translateX(-1.2px)}75%{transform:translateX(1.2px)}}
      @keyframes glow{0%,100%{opacity:.55}50%{opacity:1}}
      .paper{background:linear-gradient(160deg,#f6eddc 0%,#ecdfc6 60%,#e2d1b2 100%);color:#2b1d14;box-shadow:0 20px 50px rgba(0,0,0,.55), inset 0 0 40px rgba(120,80,30,.18)}
    `}</style>
    <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(#fff 0.6px, transparent 0.6px)', backgroundSize: '3px 3px' }} />
    <div className="relative z-10 mx-auto flex h-[100dvh] max-w-[440px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)]">{children}</div>
  </main>
)

function Btn({ children, sub, onClick, tone = 'red', disabled, small }: { children: ReactNode; sub?: ReactNode; onClick?: () => void; tone?: 'red' | 'ghost' | 'gold'; disabled?: boolean; small?: boolean }) {
  const t =
    tone === 'red'
      ? 'border-[#c9474c]/80 bg-[linear-gradient(180deg,#7a1f24,#4a1014)]'
      : tone === 'gold'
        ? 'border-[#d9b45a]/70 bg-[linear-gradient(180deg,#4a3a18,#2a200c)]'
        : 'border-[#f3ece0]/20 bg-black/30'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        sfx.tap()
        onClick?.()
      }}
      className={['w-full rounded-[14px] border text-left transition active:scale-[0.98]', small ? 'px-3.5 py-2.5' : 'px-4 py-3.5', disabled ? 'border-white/10 bg-black/30 text-white/35' : t].join(' ')}
    >
      <div className={small ? 'text-[0.95rem] tracking-[0.08em]' : 'text-[1.05rem] tracking-[0.12em]'}>{children}</div>
      {sub && <div className={'mt-0.5 text-[0.78rem] leading-5 ' + (disabled ? 'text-white/30' : 'text-[#f3ece0]/60')}>{sub}</div>}
    </button>
  )
}

// ---------- 主程式 ----------
type Screen = { name: 'home' } | { name: 'scroll' } | { name: 'intro'; life: string; step: number } | { name: 'play' } | { name: 'gallery' }

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [state, setState] = useState<State | null>(() => load<State | null>(KEY_SAVE, null))
  const [rec, setRec] = useState<Rec>(() => load<Rec>(KEY_REC, { endings: {}, runs: 0 }))
  const [mem, setMem] = useState<Record<string, string>>(() => load(KEY_MEM, {}))
  const [muted, setMute] = useState(isMuted())

  useEffect(() => {
    document.title = '紅線千年'
  }, [])
  useEffect(() => {
    if (state && !state.ending) store(KEY_SAVE, state)
  }, [state])

  const life = state ? lifeById(state.lifeId) : undefined

  const begin = async (lifeId: string) => {
    await unlock()
    const l = lifeById(lifeId)!
    const seen = Object.values(rec.endings).flat().length > 0
    setState(F.start(l))
    setScreen(seen ? { name: 'play' } : { name: 'intro', life: lifeId, step: 0 })
    sfx.act()
  }

  const onEnd = (s: State) => {
    store(KEY_SAVE, null)
    setRec((prev) => {
      const list = prev.endings[s.lifeId] ?? []
      const next: Rec = { endings: { ...prev.endings, [s.lifeId]: list.includes(s.ending!) ? list : [...list, s.ending!] }, runs: prev.runs + 1 }
      store(KEY_REC, next)
      return next
    })
  }

  const remember = (lifeId: string, cardId: string, target: string, text: string) => {
    setMem((prev) => {
      const next = { ...prev, [`${lifeId}:${cardId}:${target}`]: text }
      store(KEY_MEM, next)
      return next
    })
  }

  if (screen.name === 'gallery') return <Gallery rec={rec} onBack={() => setScreen({ name: 'home' })} />
  if (screen.name === 'scroll') return <Scroll rec={rec} onPick={begin} onBack={() => setScreen({ name: 'home' })} />

  if (screen.name === 'intro') {
    const l = lifeById(screen.life)!
    const lines = l.intro
    return (
      <Shell bg={ACT_BG.home}>
        <div className="flex-1" />
        <div className="space-y-4 px-1 text-[1.04rem] leading-8">
          {lines.slice(0, screen.step + 1).map((t, i) => (
            <p key={i} style={{ animation: 'rise .8s ease' }} className={i === screen.step ? 'text-[#f3ece0]' : 'text-[#f3ece0]/45'}>
              {t}
            </p>
          ))}
        </div>
        <div className="flex-1" />
        <Btn onClick={() => (screen.step < lines.length - 1 ? setScreen({ ...screen, step: screen.step + 1 }) : setScreen({ name: 'play' }))}>{screen.step < lines.length - 1 ? '……' : '拿起紅線'}</Btn>
      </Shell>
    )
  }

  if (screen.name === 'play' && state && life) {
    return (
      <Play
        life={life}
        state={state}
        mem={mem}
        onChange={(s, target) => {
          const card = F.currentCard(life, state)
          if (card && s.last) remember(life.id, card.id, target, s.last.text)
          setState(s)
          if (s.ending) onEnd(s)
        }}
        rec={rec}
        onRetry={() => begin(life.id)}
        onHome={() => setScreen({ name: 'home' })}
      />
    )
  }

  // ---------- 標題 ----------
  const canResume = !!state && !state.ending && !!life
  const totalEndings = Object.values(rec.endings).flat().length
  return (
    <Shell bg={ACT_BG.home}>
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-full border border-white/15 px-3 py-1 text-[12px] text-white/60"
          onClick={() => {
            setMuted(!muted)
            setMute(!muted)
          }}
        >
          {muted ? '音效：關' : '音效：開'}
        </button>
      </div>
      <div className="flex-1" />
      <div className="text-center" style={{ animation: 'rise 1.4s ease' }}>
        <RedThread width={240} tension={0.5} />
        <h1 className="mt-4 text-[2.6rem] tracking-[0.35em] text-[#f6e7d0]">紅線千年</h1>
        <p className="mt-3 text-[0.98rem] leading-7 text-[#f3ece0]/70">
          玉帝說：配為夫妻，卻不許成婚。
          <br />
          你是月老。這一次，你想改寫。
        </p>
      </div>
      <div className="flex-1" />
      <div className="space-y-2.5">
        {canResume && (
          <Btn onClick={async () => { await unlock(); setScreen({ name: 'play' }) }} sub={`${life!.title}・繼續`}>
            繼續
          </Btn>
        )}
        <Btn tone={canResume ? 'ghost' : 'red'} onClick={() => setScreen({ name: 'scroll' })} sub="七世姻緣簿">
          翻開姻緣簿
        </Btn>
        <Btn tone="ghost" small onClick={() => setScreen({ name: 'gallery' })} sub={`已見證 ${totalEndings} 種結局`}>
          結局卷
        </Btn>
      </div>
    </Shell>
  )
}

// ---------- 紅線 ----------
function RedThread({ width, tension }: { width: number; tension: number }) {
  // tension 0~1：0 鬆垮虛線，1 緊繃發光
  const sag = 26 * (1 - tension)
  return (
    <svg width={width} height={40} viewBox={`0 0 ${width} 40`} className="mx-auto">
      <path d={`M4 20 Q ${width / 2} ${20 + sag} ${width - 4} 20`} stroke="#d8343c" strokeWidth={1 + tension * 2.5} fill="none" strokeDasharray={tension < 0.25 ? '4 5' : undefined} style={{ filter: tension > 0.75 ? 'drop-shadow(0 0 4px #ff4050)' : undefined }} />
    </svg>
  )
}

// ---------- 七世選單 ----------
function Scroll({ rec, onPick, onBack }: { rec: Rec; onPick: (id: string) => void; onBack: () => void }) {
  const [locked, setLocked] = useState<string | null>(null)
  return (
    <Shell bg={ACT_BG.home}>
      <h1 className="pt-3 text-center text-xl tracking-[0.4em]">姻緣簿</h1>
      <p className="pb-3 text-center text-[12px] text-white/45">同一對靈魂，一世又一世</p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-3 [scrollbar-width:none]">
        {LIFE_MENU.map((m) => {
          const has = !!lifeById(m.id)
          const got = rec.endings[m.id] ?? []
          const perfect = got.some((e) => lifeById(m.id)?.endings.find((x) => x.id === e)?.rank === 'S')
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => {
                sfx.tap()
                if (m.free && has) onPick(m.id)
                else setLocked(m.id)
              }}
              className={'flex w-full items-center gap-3 rounded-[14px] border px-3.5 py-3 text-left ' + (m.free ? 'border-[#c9474c]/60 bg-[#4a1014]/60' : 'border-white/10 bg-black/30')}
            >
              <div className={'flex h-11 w-11 flex-none items-center justify-center rounded-full border text-lg ' + (m.free ? 'border-[#d8343c] text-[#f6e7d0]' : 'border-white/20 text-white/40')}>{m.era}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[0.98rem] tracking-[0.08em]">
                  <span>第{'一二三四五六七八'[m.order - 1]}世</span>
                  <span className={m.free ? 'text-[#f3ece0]/80' : 'text-white/40'}>{m.lovers}</span>
                </div>
                <div className={'truncate text-[12px] ' + (m.free ? 'text-[#f3ece0]/60' : 'text-white/35')}>{m.tagline}</div>
              </div>
              <div className="flex-none text-[11px]">
                {m.free ? (perfect ? <span className="text-[#f0c96a]">圓滿</span> : got.length ? <span className="text-white/50">{got.length} 結局</span> : <span className="text-[#f3ece0]/70">免費</span>) : <span className="text-white/35">🔒</span>}
              </div>
            </button>
          )
        })}
      </div>
      <Btn tone="ghost" small onClick={onBack}>
        返回
      </Btn>
      {locked && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/70 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]" onClick={() => setLocked(null)}>
          <div className="mx-auto w-full max-w-[440px] rounded-[18px] border border-[#d9b45a]/40 bg-[#1a120a] px-5 py-5" onClick={(e) => e.stopPropagation()} style={{ animation: 'rise .3s ease' }}>
            <div className="text-lg tracking-[0.15em] text-[#f0c96a]">完整版</div>
            <p className="mt-2 text-[0.92rem] leading-7 text-white/75">第一世免費。一次買斷，解鎖第二世到第七世，以及之後所有延伸的世（現代八點檔篇……）。</p>
            <p className="mt-2 text-[0.82rem] text-white/45">製作中，敬請期待。</p>
            <div className="mt-4">
              <Btn tone="gold" onClick={() => setLocked(null)}>
                好
              </Btn>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}

// ---------- 結局卷 ----------
function Gallery({ rec, onBack }: { rec: Rec; onBack: () => void }) {
  return (
    <Shell bg={ACT_BG.home}>
      <h1 className="pt-3 text-center text-xl tracking-[0.4em]">結局卷</h1>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3 [scrollbar-width:none]">
        {LIFE_MENU.map((m) => {
          const l = lifeById(m.id)
          if (!l) return null
          const got = rec.endings[m.id] ?? []
          return (
            <div key={m.id}>
              <div className="mb-2 text-[13px] tracking-[0.2em] text-white/60">
                {l.title}・{got.length}/{l.endings.length}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {l.endings.map((e) => {
                  const ok = got.includes(e.id)
                  return (
                    <div key={e.id} className="rounded-[12px] border border-white/10 bg-black/30 px-3 py-2.5">
                      <span className="mr-2 text-sm" style={{ color: ok ? RANK_COLOR[e.rank] : '#444' }}>
                        {ok ? e.rank : '？'}
                      </span>
                      <span className={ok ? 'text-[0.92rem]' : 'text-[0.92rem] text-white/25'}>{ok ? e.title : '？？？'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <Btn tone="ghost" small onClick={onBack}>
        返回
      </Btn>
    </Shell>
  )
}

// ---------- 遊玩 ----------

function Play({ life, state: s, mem, onChange, rec, onRetry, onHome }: { life: Life; state: State; mem: Record<string, string>; onChange: (s: State, target: string) => void; rec: Rec; onRetry: () => void; onHome: () => void }) {
  const card = F.currentCard(life, s)
  const [result, setResult] = useState<State | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const lastHover = useRef<string | null>(null)
  const prevAct = useRef(s.act)

  const valid = useMemo(() => (card ? life.targets.filter((t) => F.resolveOutcome(card, t.id, s)).map((t) => t.id) : []), [card, life, s])
  const targetByPos = (pos: string) => life.targets.find((t) => t.pos === pos)

  // 拖曳方向 → 對象
  const hoverTarget = useMemo(() => {
    if (!drag) return sel
    const dist = Math.hypot(drag.x, drag.y)
    if (dist < 28) return null
    const pos = Math.abs(drag.x) > Math.abs(drag.y) ? (drag.x > 0 ? 'right' : 'left') : drag.y > 0 ? 'bottom' : 'top'
    const t = targetByPos(pos)
    return t && valid.includes(t.id) ? t.id : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, sel, valid])

  useEffect(() => {
    if (hoverTarget && hoverTarget !== lastHover.current) {
      const idx = life.targets.findIndex((t) => t.id === hoverTarget)
      sfx.hover(idx)
    }
    lastHover.current = hoverTarget
  }, [hoverTarget, life.targets])

  useEffect(() => {
    if (s.act !== prevAct.current) {
      prevAct.current = s.act
      if (!s.ending) sfx.act()
    }
  }, [s.act, s.ending])

  const affected = hoverTarget ? F.preview(life, s, hoverTarget) : []

  const commit = (target: string) => {
    if (!valid.includes(target)) return
    const next = F.choose(life, s, target)
    sfx.drop()
    const d = next.last?.delta ?? {}
    setTimeout(() => {
      if ((d.bond ?? 0) > 0) sfx.bondUp()
      else if ((d.bond ?? 0) < 0) sfx.bondDown()
      if ((d.rule ?? 0) > 0) sfx.heaven()
      const danger = life.meters.some((m) => (m.high && next.meters[m.id] >= 8) || (m.low && next.meters[m.id] <= 2))
      if (danger) sfx.warn()
    }, 350)
    setSel(null)
    setDrag(null)
    setResult(next)
  }

  const onDown = (e: RPointerEvent) => {
    if (result) return
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    start.current = { x: e.clientX, y: e.clientY }
    setDrag({ x: 0, y: 0 })
  }
  const onMove = (e: RPointerEvent) => {
    if (!start.current) return
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })
  }
  const onUp = () => {
    if (!start.current) return
    const d = drag
    start.current = null
    if (d && Math.hypot(d.x, d.y) > 85 && hoverTarget) commit(hoverTarget)
    else setDrag(null)
  }

  // 結果畫面 → 繼續
  const proceed = () => {
    if (!result) return
    const t = result.last?.target ?? ''
    onChange(result, t)
    setResult(null)
    if (result.ending) {
      const rank = life.endings.find((e) => e.id === result.ending)?.rank ?? 'F'
      if (result.ending === 'yuanjin') sfx.snap()
      setTimeout(() => (RANK_GOOD.includes(rank) ? sfx.good() : sfx.bad()), 150)
    } else sfx.card()
  }

  if (s.ending && !result) return <EndScreen life={life} s={s} rec={rec} onRetry={onRetry} onHome={onHome} />

  const shown = result ?? s
  const act = life.acts[Math.min(s.act, life.acts.length - 1)]
  const prog = F.progress(life, s)
  const bond = shown.meters.bond ?? 5
  const tension = bond / 10

  return (
    <Shell bg={ACT_BG[act?.bg ?? 'home'] ?? ACT_BG.home}>
      {/* 頂部 */}
      <header className="flex-none">
        <div className="flex items-center justify-between text-[12px] tracking-[0.15em] text-white/60">
          <button type="button" onClick={onHome} className="py-1 pr-3">
            ← 姻緣簿
          </button>
          <span>{life.title}</span>
          <span>
            {prog.done}/{prog.total}
          </span>
        </div>
        <div className="mt-1 text-center text-[13px] tracking-[0.3em] text-[#f6e7d0]/80">{act?.title}</div>
        <div className="mt-2.5 grid grid-cols-3 gap-3">
          {life.meters.map((m) => {
            const v = shown.meters[m.id]
            const hit = affected.includes(m.id)
            const d = result?.last?.delta[m.id]
            const danger = (m.high && v >= 8) || (m.low && v <= 2)
            return (
              <div key={m.id}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]" style={{ background: m.color, color: '#1a0d0f' }}>
                      {m.icon}
                    </span>
                    <span className={danger ? 'text-[#ff8a8a]' : 'text-white/75'}>{m.name}</span>
                  </span>
                  <span className="h-2 w-2 rounded-full" style={{ background: hit ? '#fff' : 'transparent', animation: hit ? 'glow 1s infinite' : undefined }} />
                  {d ? <span className={d > 0 ? 'text-[#ffd0a0]' : 'text-[#a0c8ff]'}>{d > 0 ? `+${d}` : d}</span> : null}
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v * 10}%`, background: m.color, opacity: danger ? 1 : 0.8 }} />
                  {m.low && <div className="absolute inset-y-0 left-[20%] w-px bg-white/30" />}
                  {m.high && <div className="absolute inset-y-0 left-[80%] w-px bg-white/30" />}
                </div>
              </div>
            )
          })}
        </div>
      </header>

      {/* 舞台 */}
      <section className="relative mt-2 min-h-0 flex-1 touch-none select-none">
        {/* 紅線：上（女）到下（男） */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path
            d={`M50 9 C ${50 + 18 * (1 - tension)} 35, ${50 - 18 * (1 - tension)} 65, 50 91`}
            stroke="#d8343c"
            strokeWidth={0.4 + tension * 1.2}
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeDasharray={bond <= 2 ? '3 4' : undefined}
            style={{ filter: bond >= 8 ? 'drop-shadow(0 0 3px #ff3040)' : undefined, animation: bond >= 8 ? 'thrum .15s infinite' : undefined }}
          />
        </svg>
        {life.targets.map((t) => (
          <Portrait key={t.id} t={t} active={hoverTarget === t.id} disabled={!result && !!card && !valid.includes(t.id)} memory={card ? mem[`${life.id}:${card.id}:${t.id}`] : undefined} onTap={() => !result && valid.includes(t.id) && (sel === t.id ? commit(t.id) : setSel(t.id))} />
        ))}

        {/* 卡片 */}
        {!result && card && (
          <div className="absolute left-1/2 top-1/2 w-[64%] -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 5 }}>
            <div
              key={card.id}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className="paper cursor-grab touch-none rounded-[16px] px-4 py-4"
              style={{
                transform: drag ? `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x * 0.06}deg)` : undefined,
                transition: drag && start.current ? 'none' : 'transform .25s ease',
                animation: 'rise .4s ease',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-sm bg-[#b3242b] px-1.5 py-0.5 text-[11px] tracking-[0.2em] text-[#f6e7d0]">天意</span>
                <span className="text-[0.95rem] font-semibold tracking-[0.15em] text-[#7a1f24]">{card.omen}</span>
              </div>
              <p className="mt-2.5 text-[0.92rem] leading-[1.75]">{card.text}</p>
              <p className="mt-2 text-center text-[10px] tracking-[0.2em] text-[#2b1d14]/45">{sel ? `再點一次「${life.targets.find((x) => x.id === sel)?.name}」降下天意` : '拖向一個人，或點選他'}</p>
            </div>
          </div>
        )}

        {/* 結果 */}
        {result && result.last && (
          <div className="absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 6 }}>
            <div className="paper rounded-[16px] px-4 py-4" style={{ animation: 'rise .45s ease' }}>
              <div className="text-[11px] tracking-[0.25em] text-[#7a1f24]">天意落在・{life.targets.find((t) => t.id === result.last!.target)?.name}</div>
              <p className="mt-2 text-[0.95rem] leading-[1.8]">{result.last.text}</p>
            </div>
          </div>
        )}
      </section>

      <footer className="flex-none pt-1">
        {result ? (
          <Btn onClick={proceed}>{result.ending ? '這一世……' : '繼續'}</Btn>
        ) : (
          <p className="pb-1 text-center text-[11px] leading-5 text-white/40">白點＝這個選擇會影響的數值。紅線太鬆會斷，太緊會殉情。</p>
        )}
      </footer>
    </Shell>
  )
}

function Portrait({ t, active, disabled, memory, onTap }: { t: Target; active: boolean; disabled: boolean; memory?: string; onTap: () => void }) {
  const pos: Record<string, string> = {
    top: 'left-1/2 top-0 -translate-x-1/2 flex-col',
    bottom: 'left-1/2 bottom-0 -translate-x-1/2 flex-col-reverse',
    left: 'left-0 top-1/2 -translate-y-1/2 flex-col',
    right: 'right-0 top-1/2 -translate-y-1/2 flex-col',
  }
  const big = t.pos === 'top' || t.pos === 'bottom'
  return (
    <button type="button" onClick={onTap} className={'absolute flex items-center gap-1 transition ' + pos[t.pos]} style={{ opacity: disabled ? 0.28 : 1, zIndex: 4 }}>
      <div
        className="flex items-center justify-center rounded-full border-2 transition-all duration-200"
        style={{
          width: big ? 60 : 52,
          height: big ? 60 : 52,
          borderColor: active ? '#fff' : t.color,
          background: `radial-gradient(circle at 35% 30%, ${t.color}55, #00000088)`,
          boxShadow: active ? `0 0 22px ${t.color}` : 'none',
          transform: active ? 'scale(1.15)' : 'none',
          fontSize: big ? 24 : 20,
          color: '#f6e7d0',
        }}
      >
        {t.glyph}
      </div>
      <div className="text-center leading-tight">
        <div className="text-[12px] tracking-[0.1em] text-[#f6e7d0]">{t.name}</div>
        <div className="text-[9.5px] text-white/45">{t.role}</div>
      </div>
      {memory && active && (
        <div className="absolute z-10 w-[150px] rounded-[10px] border border-[#d9b45a]/40 bg-black/85 px-2 py-1.5 text-left text-[10.5px] leading-4 text-[#f0dca0]" style={{ [t.pos === 'bottom' ? 'bottom' : 'top']: big ? 0 : 70, left: t.pos === 'right' ? -110 : t.pos === 'left' ? 0 : 70 }}>
          前世記憶：{memory.slice(0, 34)}{memory.length > 34 ? '…' : ''}
        </div>
      )}
    </button>
  )
}

function EndScreen({ life, s, rec, onRetry, onHome }: { life: Life; s: State; rec: Rec; onRetry: () => void; onHome: () => void }) {
  const e = life.endings.find((x) => x.id === s.ending)!
  const got = rec.endings[life.id] ?? []
  return (
    <Shell bg={RANK_GOOD.includes(e.rank) ? ACT_BG.fate : ACT_BG.home}>
      <div className="min-h-0 flex-1 overflow-y-auto py-4 [scrollbar-width:none]">
        <div className="text-center" style={{ animation: 'rise 1s ease' }}>
          <div className="text-[12px] tracking-[0.5em]" style={{ color: RANK_COLOR[e.rank] }}>
            {life.title}・{e.rank}
          </div>
          <h1 className="mt-2 text-[2.1rem] tracking-[0.3em]">{e.title}</h1>
          {e.legend && <div className="mt-1 text-[12px] text-white/45">（傳說的原本結局）</div>}
        </div>
        <div className="paper mt-5 space-y-3 rounded-[16px] px-5 py-5 text-[1rem] leading-8" style={{ animation: 'fade 1.6s ease' }}>
          {e.text.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
        {s.karma.length > 0 && (
          <div className="mt-3 rounded-[14px] border border-[#d9b45a]/30 bg-black/30 px-4 py-3">
            <div className="text-[11px] tracking-[0.3em] text-[#f0c96a]">因果簿</div>
            {s.karma.map((k, i) => (
              <div key={i} className="mt-1 text-[0.9rem] text-white/75">
                ・{k}
              </div>
            ))}
            <div className="mt-1 text-[11px] text-white/40">這些因果，下一世會回來找你。</div>
          </div>
        )}
        <p className="mt-3 text-center text-[12px] text-white/45">
          這一世已見證 {got.length} / {life.endings.length} 種結局
          {e.rank !== 'S' && '・你記住了這一世的選擇，再入輪迴時會想起來'}
        </p>
      </div>
      <div className="flex-none space-y-2">
        <Btn onClick={onRetry} sub={e.rank === 'S' ? '換個方式，再看一次' : '帶著前世記憶，重新來過'}>
          再入輪迴
        </Btn>
        <Btn tone="ghost" small onClick={onHome}>
          回到姻緣簿
        </Btn>
      </div>
    </Shell>
  )
}
