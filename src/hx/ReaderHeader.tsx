import { useId, useRef } from 'react'
import { useReaderPreferences } from './reader_preferences'
import { useBgm } from './bgm'

export function ReaderHeader({ subtitle, onBack, backLabel = '返回首頁', leftNote, auto, onAutoChange, autoHint }: {
  subtitle: string; onBack?: () => void; backLabel?: string; leftNote?: string
  auto?: boolean; onAutoChange?: (enabled: boolean) => void
  autoHint?: string
}) {
  const { large, muted, toggleLarge, toggleSound } = useReaderPreferences()
  const music = useBgm()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const open = () => {
    onAutoChange?.(false)
    dialog.current?.showModal()
  }
  return <>
    <header className="zero-header reader-header">
      {onBack ? <button type="button" aria-label={backLabel} onClick={onBack}>← 返回</button> : <span className="reader-header-note">{leftNote}</span>}
      <div className="reader-brand">月老<small>{subtitle}</small></div>
      <div className="reader-header-actions">
        <button type="button" className={`reader-music-trigger${music.muted ? '' : ' music-enabled'}`} aria-label={music.muted ? '開啟音樂' : '靜音音樂'} aria-pressed={!music.muted} data-bgm-track={music.track} data-bgm-status={music.status} onClick={music.toggleMusic}>{music.muted ? '音樂關' : '音樂開'}</button>
        <button type="button" className={`reader-settings-trigger${auto ? " is-playing" : ""}`} aria-haspopup="dialog" onClick={open}>設定</button>
      </div>
    </header>
    <dialog ref={dialog} className="reader-settings" aria-labelledby={titleId} onClick={event => {
      if (event.target === dialog.current) {
        const rect = dialog.current.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current.close()
      }
    }}>
      <div className="reader-settings-heading"><h2 id={titleId}>閱讀設定</h2><button type="button" aria-label="關閉設定" onClick={() => dialog.current?.close()}>關閉 ✕</button></div>
      <div className="reader-setting-row"><span>音效<small>輕聲伴讀</small></span><button type="button" role="switch" aria-label="音效" aria-checked={!muted} onClick={toggleSound}>{muted ? '關閉' : '開啟'}</button></div>
      <div className="reader-setting-row"><span>背景音樂<small>隨劇情換曲，輕聲伴讀</small></span><button type="button" role="switch" aria-label="背景音樂" aria-checked={!music.muted} onClick={music.toggleMusic}>{music.muted ? '關閉' : '開啟'}</button></div>
      <div className="reader-setting-row"><span>字體大小<small>所有篇章共用</small></span><button type="button" role="switch" aria-label="大字模式" aria-checked={large} onClick={toggleLarge}>{large ? '大字' : '標準'}</button></div>
      <div className="reader-setting-row"><span>自動閱讀<small>{autoHint ?? (onAutoChange ? '逐句演出，依文字長度停留' : '本章由你翻頁與選擇')}</small></span><button type="button" role="switch" aria-label="自動閱讀" aria-checked={auto ?? false} disabled={!onAutoChange} onClick={() => {
        onAutoChange?.(!auto)
        dialog.current?.close()
      }}>{auto ? '播放中' : onAutoChange ? '開始' : '逐段閱讀'}</button></div>
      <p className="reader-settings-note">按 Esc 或點選面板外側即可關閉。</p>
    </dialog>
  </>
}
