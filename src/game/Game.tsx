import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BookOpen, Droplet, Flame, Heart, Trees, Utensils, Zap, Brain } from 'lucide-react'

import content from '../data/content.json'
import * as G from '../engine/game'
import type { GameState, LocationId, NightAction, SplitChoice, Truth } from '../engine/game'
import { useAmbientAudio } from '../hooks/useAmbientAudio'

// ---------- 存檔 ----------
const SAVE_KEY = 'drift.save.v2'
const RECORD_KEY = 'drift.record.v2'
type RunRecord = { endings: string[]; truths: string[]; runs: number }

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
const save = (key: string, value: unknown) => {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 無痕模式等情況下忽略 */
  }
}

// ---------- 共用元件 ----------
const panel = 'rounded-[22px] border border-stone-700/70 bg-[linear-gradient(180deg,rgba(18,15,14,0.92),rgba(6,5,5,0.96))] shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-md'

function Btn({ children, sub, onClick, disabled, tone = 'normal', small }: { children: ReactNode; sub?: ReactNode; onClick?: () => void; disabled?: boolean; tone?: 'normal' | 'warn' | 'ghost'; small?: boolean }) {
  const toneClass =
    tone === 'warn'
      ? 'border-rose-800/70 bg-[linear-gradient(180deg,rgba(45,14,14,0.92),rgba(14,6,6,0.97))]'
      : tone === 'ghost'
        ? 'border-stone-800 bg-black/40'
        : 'border-stone-700/80 bg-[linear-gradient(180deg,rgba(24,20,19,0.95),rgba(8,7,7,0.98))]'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'w-full rounded-[18px] border text-left transition active:scale-[0.98]',
        small ? 'px-3 py-2.5' : 'px-4 py-3.5',
        disabled ? 'cursor-not-allowed border-stone-800/80 bg-black/50 text-stone-500' : toneClass + ' text-stone-100',
      ].join(' ')}
    >
      <div className={small ? 'text-[0.95rem] font-semibold leading-6' : 'text-base font-semibold leading-6'}>{children}</div>
      {sub && <div className={'mt-0.5 text-[0.82rem] leading-5 ' + (disabled ? 'text-stone-600' : 'text-stone-400')}>{sub}</div>}
    </button>
  )
}

function Bar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800/80">
      <div className={'h-full rounded-full transition-all duration-500 ' + color} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  )
}

function Stat({ icon, label, value, bar }: { icon: ReactNode; label: string; value: number; bar?: { color: string; max?: number } }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-1 text-[11px] text-stone-400">
        {icon}
        <span>{label}</span>
        <span className="ml-auto font-semibold text-stone-100">{value}</span>
      </div>
      {bar && <Bar value={value} max={bar.max} color={bar.color} />}
    </div>
  )
}

function Background({ src, dim = 'bg-black/50' }: { src: string; dim?: string }) {
  return (
    <>
      <div key={src} className="absolute inset-0 animate-[fadein_0.9s_ease] bg-cover bg-center" style={{ backgroundImage: `url('${src}')` }} />
      <div className={'absolute inset-0 ' + dim} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/95" />
    </>
  )
}

const Shell = ({ bg, children, dim }: { bg: string; children: ReactNode; dim?: string }) => (
  <main className="relative h-[100dvh] overflow-hidden bg-black text-stone-100">
    <style>{`@keyframes fadein{from{opacity:0}to{opacity:1}} @keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    <Background src={bg} dim={dim} />
    <div className="relative z-10 mx-auto flex h-[100dvh] max-w-[420px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)]">{children}</div>
  </main>
)

// ---------- 主元件 ----------
type Screen = 'cover' | 'intro' | 'game' | 'collection'

export function Game() {
  const [screen, setScreen] = useState<Screen>('cover')
  const [state, setState] = useState<GameState | null>(() => load<GameState | null>(SAVE_KEY, null))
  const [record, setRecord] = useState<RunRecord>(() => load<RunRecord>(RECORD_KEY, { endings: [], truths: [], runs: 0 }))
  const [introStep, setIntroStep] = useState(0)
  const audio = useAmbientAudio()

  useEffect(() => {
    document.title = '漂流者：信任臨界'
  }, [])

  // 自動存檔
  useEffect(() => {
    if (state && state.stage !== 'ended') save(SAVE_KEY, state)
  }, [state])

  // 心跳隨壓力變化
  const stress = state?.you.stress ?? 0
  useEffect(() => {
    if (!audio.ready) return
    audio.setHeartbeatLevel(stress >= 7 ? (stress - 6) / 4 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stress, audio.ready])

  // 結局時寫入紀錄
  useEffect(() => {
    if (state?.stage !== 'ended' || !state.ending) return
    save(SAVE_KEY, null)
    setRecord((prev) => {
      const next: RunRecord = {
        endings: prev.endings.includes(state.ending!) ? prev.endings : [...prev.endings, state.ending!],
        truths: prev.truths.includes(state.truth) ? prev.truths : [...prev.truths, state.truth],
        runs: prev.runs + 1,
      }
      save(RECORD_KEY, next)
      return next
    })
  }, [state?.stage, state?.ending, state?.truth])

  const start = async (resume: boolean) => {
    const ok = await audio.unlock()
    if (ok) audio.setSeaLevel(0.22)
    if (resume && state && state.stage !== 'ended') {
      setScreen('game')
      return
    }
    setState(G.newGame())
    setIntroStep(0)
    setScreen(record.runs > 0 ? 'game' : 'intro')
  }

  if (screen === 'collection') return <Collection record={record} onBack={() => setScreen('cover')} />

  if (screen === 'cover' || !state) {
    const canResume = !!state && state.stage !== 'ended'
    return (
      <Shell bg="/cover_mobile.jpg" dim="bg-black/55">
        <div className="flex-1" />
        <div className="text-center" style={{ animation: 'rise 1.2s ease' }}>
          <div className="text-[11px] tracking-[0.5em] text-stone-400">DRIFT</div>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-[0.12em]">漂流者：信任臨界</h1>
          <p className="mt-3 text-[1.05rem] leading-8 text-stone-300">十四天。一座島。一個陌生人。<br />你能相信他嗎？</p>
        </div>
        <div className="flex-1" />
        <div className="flex flex-col gap-2.5">
          {canResume && (
            <Btn onClick={() => start(true)} sub={`第 ${state!.day} 天・繼續上次的進度`}>
              繼續
            </Btn>
          )}
          <Btn onClick={() => start(false)} sub={record.runs ? `已經漂流 ${record.runs} 次` : '每一輪，他的真相都不一樣'}>
            {canResume ? '重新開始' : '開始'}
          </Btn>
          <Btn tone="ghost" small onClick={() => setScreen('collection')} sub={`結局 ${record.endings.length} / ${G.ENDING_IDS.length}・看過的真相 ${record.truths.length} / 4`}>
            結局收集
          </Btn>
        </div>
      </Shell>
    )
  }

  if (screen === 'intro') {
    const lines = content.intro
    return (
      <Shell bg="/bg_phase1.jpg" dim="bg-black/70">
        <div className="flex-1" />
        <div className={panel + ' space-y-4 px-5 py-6 text-[1.02rem] leading-8'}>
          {lines.slice(0, introStep + 1).map((line, i) => (
            <p key={i} style={{ animation: 'rise 0.8s ease' }} className={i === introStep ? 'text-stone-50' : 'text-stone-400'}>
              {line}
            </p>
          ))}
        </div>
        <div className="mt-3">
          <Btn onClick={() => (introStep < lines.length - 1 ? setIntroStep(introStep + 1) : setScreen('game'))}>{introStep < lines.length - 1 ? '……' : '開始第一天'}</Btn>
        </div>
      </Shell>
    )
  }

  return (
    <Play
      state={state}
      setState={setState}
      record={record}
      onRestart={() => {
        setState(G.newGame())
        setScreen('game')
      }}
      onHome={() => setScreen('cover')}
      onCollection={() => setScreen('collection')}
    />
  )
}

// ---------- 遊戲畫面 ----------
const LOCS: LocationId[] = ['shore', 'forest', 'wreck', 'reef', 'signal', 'rest']
const locInfo = content.locations as { [k: string]: { name: string; desc: string; cost: number; bg: string } }

function Play({ state: s, setState, record, onRestart, onHome, onCollection }: { state: GameState; setState: (s: GameState) => void; record: RunRecord; onRestart: () => void; onHome: () => void; onCollection: () => void }) {
  const [together, setTogether] = useState(true)
  const [showNotes, setShowNotes] = useState(false)
  const [confronting, setConfronting] = useState(false)
  const clues = useMemo(() => G.visibleClues(s), [s])

  if (s.stage === 'ended') return <Ending s={s} record={record} onRestart={onRestart} onHome={onHome} onCollection={onCollection} />

  const event = s.stage === 'event' && s.pendingEvent ? G.eventById(s.pendingEvent.id) : null
  const bg = event?.bg ?? s.log.bg ?? '/bg_phase2.jpg'
  const alone = !G.himCanAct(s)
  const haulTotal = s.haul.water + s.haul.food

  return (
    <Shell bg={s.stage === 'night' ? '/bg_phase4.jpg' : bg}>
      {/* 頂部狀態 */}
      <header className={panel + ' flex-none px-3.5 py-3'}>
        <div className="flex items-center justify-between">
          <div className="text-[13px] tracking-[0.2em] text-stone-200">
            第 <span className="text-lg font-semibold text-stone-50">{s.day}</span> / {G.DAYS} 天
            <span className="ml-2 text-[11px] text-stone-400">{s.stage === 'day' || s.stage === 'event' ? `行動 ${s.actionsLeft}` : s.stage === 'evening' ? '傍晚' : s.stage === 'night' ? '夜晚' : ''}</span>
          </div>
          <button type="button" onClick={() => setShowNotes(true)} className="flex items-center gap-1.5 rounded-full border border-stone-600/80 bg-black/50 px-3 py-1.5 text-[12px] text-stone-200">
            <BookOpen size={14} /> 筆記 {clues.length}
          </button>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-x-3 gap-y-2">
          <Stat icon={<Heart size={12} />} label="生命" value={s.you.hp} bar={{ color: s.you.hp <= 3 ? 'bg-rose-500' : 'bg-rose-300/80' }} />
          <Stat icon={<Zap size={12} />} label="體力" value={s.you.stamina} bar={{ color: 'bg-amber-300/80' }} />
          <Stat icon={<Brain size={12} />} label="壓力" value={s.you.stress} bar={{ color: s.you.stress >= 7 ? 'bg-fuchsia-500' : 'bg-stone-400' }} />
          <Stat icon={<Droplet size={12} />} label="水" value={s.you.water} />
          <Stat icon={<Utensils size={12} />} label="食物" value={s.you.food} />
          <Stat icon={<Trees size={12} />} label="木頭" value={s.wood} />
        </div>
        <div className="mt-2.5">
          <div className="mb-1 flex items-center gap-1 text-[11px] text-stone-400">
            <Flame size={12} /> 訊號火堆
            <span className="ml-auto font-semibold text-stone-100">
              {s.signal} / {G.SIGNAL_GOAL}
            </span>
          </div>
          <Bar value={s.signal} max={G.SIGNAL_GOAL} color={s.signal >= G.SIGNAL_GOAL ? 'bg-emerald-400' : 'bg-orange-400/90'} />
        </div>
        <div className="mt-2.5 border-t border-stone-800 pt-2 text-[13px] leading-5 text-stone-300">
          <span className="text-stone-500">他・</span>
          {G.moodLine(s)}
          {G.himCanAct(s) && s.him.hp <= 4 && <span className="text-rose-300/90"> 他看起來很虛弱。</span>}
        </div>
      </header>

      {/* 敘事卡 */}
      <section className="flex min-h-0 flex-1 flex-col justify-end py-2.5">
        <article key={s.log.title + s.day + s.stage + s.actionsLeft} className={panel + ' flex max-h-full min-h-0 flex-col px-4 py-4'} style={{ animation: 'rise 0.5s ease' }}>
          <h2 className="text-[1.25rem] font-semibold tracking-[0.06em] text-stone-50">{event ? event.title : s.log.title}</h2>
          <div className="mt-2.5 min-h-0 flex-1 space-y-2.5 overflow-y-auto text-[0.98rem] leading-7 text-stone-200 [scrollbar-width:none]">
            {event ? (
              <>
                {s.log.lines.length > 0 && <div className="space-y-1.5 text-[0.9rem] leading-6 text-stone-400">{s.log.lines.map((l, i) => <p key={i}>{l}</p>)}</div>}
                <p>{event.text}</p>
              </>
            ) : (
              s.log.lines.map((l, i) => <p key={i}>{l}</p>)
            )}
            {s.stage === 'evening' && (
              <p className="rounded-xl border border-stone-700/70 bg-black/40 px-3 py-2 text-[0.92rem] text-stone-300">
                今天一起帶回：水 {s.haul.water}・食物 {s.haul.food}
                {s.haul.mine > 0 && !alone && <span className="text-stone-500">（其中 {s.haul.mine} 份是你自己找到的）</span>}
              </p>
            )}
          </div>
        </article>
      </section>

      {/* 操作區 */}
      <footer className="flex-none space-y-2">
        {s.stage === 'day' && (
          <>
            {!alone && (
              <div className="grid grid-cols-2 gap-1 rounded-[16px] border border-stone-700/70 bg-black/55 p-1 text-[13px]">
                {[true, false].map((t) => (
                  <button key={String(t)} type="button" onClick={() => setTogether(t)} className={'rounded-[12px] py-2 transition ' + (together === t ? 'bg-stone-200 font-semibold text-stone-900' : 'text-stone-300')}>
                    {t ? '跟他一起去' : '分頭行動'}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {LOCS.map((loc) => {
                const c = G.checkAction(s, loc)
                const info = locInfo[loc]
                const tipped = s.tip?.location === loc
                const togetherNote = together && !alone && !c.togetherOk && c.togetherReason ? `（${c.togetherReason}）` : ''
                return (
                  <Btn key={loc} small disabled={!c.ok} onClick={() => setState(G.doAction(s, loc, together))} sub={c.ok ? (togetherNote || `${info.desc}`) : c.reason}>
                    <span>{info.name}</span>
                    <span className="ml-1.5 text-[11px] font-normal text-stone-400">{info.cost > 0 ? `體力 -${info.cost}` : '體力 +4'}</span>
                    {tipped && <span className="ml-1.5 rounded-full bg-amber-200/15 px-1.5 py-0.5 text-[10px] font-normal text-amber-200">他建議</span>}
                  </Btn>
                )
              })}
            </div>
            <p className="px-1 text-center text-[11px] leading-4 text-stone-500">一起去：收穫多一份、比較安全。分頭：他自己也會帶東西回來，但你看不到他做了什麼。</p>
          </>
        )}

        {s.stage === 'event' &&
          event &&
          event.choices.map((c, i) => (
            <Btn key={i} onClick={() => setState(G.chooseEvent(s, i))}>
              {c.text}
            </Btn>
          ))}

        {s.stage === 'evening' && (
          <>
            {alone ? (
              <Btn onClick={() => setState(G.split(s, 'fair'))}>收起今天的東西</Btn>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['fair', '平分', '他會記得你是公平的'],
                    ['take', '自己多拿', '你多拿，他會記住'],
                    ['give', '讓給他', '你少拿，他會信任你'],
                    ['hide', '偷藏一份', G.canHide(s) ? '先藏一份再平分，可能被發現' : '只有分頭時自己找到的能藏'],
                  ] as [SplitChoice, string, string][]
                ).map(([id, name, sub]) => (
                  <Btn key={id} small disabled={(id === 'hide' && !G.canHide(s)) || (haulTotal === 0 && id !== 'fair')} onClick={() => setState(G.split(s, id))} sub={sub}>
                    {name}
                  </Btn>
                ))}
              </div>
            )}
            {G.canConfront(s) && (
              <Btn tone="warn" small onClick={() => setConfronting(true)} sub="整輪只有一次機會。說對了會改變一切，說錯了……">
                攤牌
              </Btn>
            )}
            {!s.confronted && G.himCanAct(s) && !G.canConfront(s) && <p className="text-center text-[11px] text-stone-500">筆記裡至少要有 2 條線索，才能跟他攤牌。</p>}
          </>
        )}

        {s.stage === 'night' && (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['sleep', '睡覺', '體力 +4，壓力下降（他不信任你時睡不好）'],
                ['watch', '守夜觀察', '體力 +1，可能看到什麼'],
                ['search', '翻他的東西', '線索最確實，被抓到會很糟'],
                ['talk', '跟他聊聊', '體力 +3，拉近距離，他可能說溜嘴'],
              ] as [NightAction, string, string][]
            ).map(([id, name, sub]) => (
              <Btn key={id} small disabled={alone && id !== 'sleep'} tone={id === 'search' ? 'warn' : 'normal'} onClick={() => setState(G.night(s, id))} sub={alone && id !== 'sleep' ? '只剩你一個人' : sub}>
                {name}
              </Btn>
            ))}
          </div>
        )}

        {s.stage === 'finale' &&
          G.finaleOptions(s).map((o) => (
            <Btn key={o} tone={o === 'alone' ? 'warn' : 'normal'} onClick={() => setState(G.finale(s, o))}>
              {o === 'together' ? content.finale.choiceTogether : o === 'alone' ? content.finale.choiceAlone : content.finale.choiceNoShip}
            </Btn>
          ))}
      </footer>

      {showNotes && <Notes s={s} onClose={() => setShowNotes(false)} />}
      {confronting && (
        <Overlay onClose={() => setConfronting(false)} title="攤牌">
          <p className="mb-3 text-[0.95rem] leading-7 text-stone-300">{content.confront.prompt}</p>
          <div className="space-y-2">
            {(Object.keys(content.confront.options) as Truth[]).map((t) => (
              <Btn
                key={t}
                small
                onClick={() => {
                  setState(G.confront(s, t))
                  setConfronting(false)
                }}
              >
                {(content.confront.options as { [k: string]: string })[t]}
              </Btn>
            ))}
            <Btn small tone="ghost" onClick={() => setConfronting(false)}>
              再想想
            </Btn>
          </div>
        </Overlay>
      )}
    </Shell>
  )
}

function Overlay({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/70 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-sm" onClick={onClose}>
      <div className={panel + ' mx-auto max-h-[80dvh] w-full max-w-[420px] overflow-y-auto px-4 py-4'} onClick={(e) => e.stopPropagation()} style={{ animation: 'rise 0.3s ease' }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-[0.08em]">{title}</h3>
          <button type="button" onClick={onClose} className="px-2 text-stone-400">
            關閉
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Notes({ s, onClose }: { s: GameState; onClose: () => void }) {
  const list = G.visibleClues(s)
  return (
    <Overlay title="筆記" onClose={onClose}>
      <p className="mb-3 text-[12px] leading-5 text-stone-500">你看到的不一定是真的。壓力太高的時候，你更容易看錯。</p>
      {list.length === 0 ? (
        <p className="text-[0.95rem] text-stone-400">還沒有記下任何事情。晚上守夜、翻他的東西、或跟他聊聊，都可能發現什麼。</p>
      ) : (
        <ol className="space-y-2">
          {list.map((c, i) => (
            <li key={c.id} className="rounded-xl border border-stone-800 bg-black/40 px-3 py-2 text-[0.92rem] leading-6 text-stone-200">
              <span className="mr-2 text-stone-500">{i + 1}.</span>
              {c.note}
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 rounded-xl border border-stone-800 px-3 py-2 text-[12px] leading-5 text-stone-400">
        他可能在：囤積東西、說謊、隱瞞傷勢——或者，他什麼都沒藏。
        {s.confronted && <div className="mt-1 text-stone-300">你已經攤牌過了：{(content.confront.options as { [k: string]: string })[s.confronted.guess]}</div>}
      </div>
    </Overlay>
  )
}

// ---------- 結局 ----------
const rankColor: { [k: string]: string } = { S: 'text-amber-200', A: 'text-emerald-300', B: 'text-sky-300', C: 'text-stone-300', D: 'text-stone-400', F: 'text-rose-400' }

function Ending({ s, record, onRestart, onHome, onCollection }: { s: GameState; record: RunRecord; onRestart: () => void; onHome: () => void; onCollection: () => void }) {
  const ending = content.endings[s.ending!]
  const truth = content.truths[s.truth]
  const fresh = record.runs > 0
  return (
    <Shell bg={s.ending === 'truth_together' || s.ending === 'together' ? '/bg_phase5.jpg' : s.ending === 'you_died' || s.ending === 'breakdown' ? '/event_paranoia.jpg' : '/event_silence.jpg'} dim="bg-black/72">
      <div className="min-h-0 flex-1 overflow-y-auto pb-3 pt-4 [scrollbar-width:none]">
        <div className="text-center" style={{ animation: 'rise 1s ease' }}>
          <div className={'text-[11px] tracking-[0.5em] ' + rankColor[ending.rank]}>結局・{ending.rank}</div>
          <h1 className="mt-2 text-[1.9rem] font-semibold tracking-[0.12em]">{ending.title}</h1>
          <div className="mt-1 text-[12px] text-stone-500">撐到第 {s.day} 天</div>
        </div>
        <div className={panel + ' mt-5 space-y-3 px-4 py-4 text-[1rem] leading-8 text-stone-200'}>
          {ending.text.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
        <div className={panel + ' mt-3 px-4 py-4'}>
          <div className="text-[11px] tracking-[0.3em] text-stone-500">他的真相</div>
          <div className="mt-1 text-lg font-semibold text-stone-50">{truth.name}</div>
          <p className="mt-1.5 text-[0.95rem] leading-7 text-stone-300">{truth.reveal}</p>
          <div className="mt-3 grid grid-cols-2 gap-y-1 text-[12px] text-stone-400">
            <span>攤牌：{s.confronted ? (s.confronted.correct ? '說對了' : '說錯了') : '沒有'}</span>
            <span>線索：{G.visibleClues(s).length} 條</span>
            <span>一起行動：{s.stats.together} 次</span>
            <span>分頭行動：{s.stats.apart} 次</span>
            <span>多拿 / 偷藏：{s.stats.taken + s.stats.hidden} 次</span>
            <span>翻他東西：{s.stats.searched} 次{s.stats.caught ? `（被抓 ${s.stats.caught}）` : ''}</span>
          </div>
        </div>
        {fresh && (
          <p className="mt-3 text-center text-[12px] text-stone-500">
            已收集結局 {record.endings.length} / {G.ENDING_IDS.length}・看過的真相 {record.truths.length} / 4
          </p>
        )}
      </div>
      <div className="flex-none space-y-2">
        <Btn onClick={onRestart} sub="下一輪，他會是另一個人">
          再漂流一次
        </Btn>
        <div className="grid grid-cols-2 gap-2">
          <Btn small tone="ghost" onClick={onCollection}>
            結局收集
          </Btn>
          <Btn small tone="ghost" onClick={onHome}>
            回到標題
          </Btn>
        </div>
      </div>
    </Shell>
  )
}

function Collection({ record, onBack }: { record: RunRecord; onBack: () => void }) {
  return (
    <Shell bg="/event_silence.jpg" dim="bg-black/78">
      <h1 className="flex-none pt-3 text-center text-xl font-semibold tracking-[0.2em]">結局收集</h1>
      <p className="flex-none pb-3 text-center text-[12px] text-stone-500">
        {record.endings.length} / {G.ENDING_IDS.length}・漂流 {record.runs} 次
      </p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-3 [scrollbar-width:none]">
        {G.ENDING_IDS.map((id) => {
          const e = content.endings[id]
          const got = record.endings.includes(id)
          return (
            <div key={id} className={panel + ' flex items-center gap-3 px-4 py-3'}>
              <span className={'w-5 text-center text-sm font-semibold ' + (got ? rankColor[e.rank] : 'text-stone-700')}>{got ? e.rank : '?'}</span>
              <span className={got ? 'text-stone-100' : 'text-stone-600'}>{got ? e.title : '？？？'}</span>
            </div>
          )
        })}
        <div className={panel + ' mt-3 px-4 py-3'}>
          <div className="mb-2 text-[11px] tracking-[0.3em] text-stone-500">看過的真相</div>
          {(Object.keys(content.truths) as Truth[]).map((t) => (
            <div key={t} className={'py-0.5 text-[0.95rem] ' + (record.truths.includes(t) ? 'text-stone-200' : 'text-stone-600')}>
              {record.truths.includes(t) ? content.truths[t].name : '？？？'}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-none">
        <Btn onClick={onBack}>返回</Btn>
      </div>
    </Shell>
  )
}
