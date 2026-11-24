import { useState } from 'react'
import { zeroStills } from './zero_story'

export function StageStill({ id, caption }: { id: string; caption: string }) {
  const [frame, setFrame] = useState({ id, previous: '', loaded: false })
  if (frame.id !== id) setFrame({ id, previous: frame.id, loaded: false })
  const still = zeroStills[id] ?? zeroStills.ledger
  return <figure className="zero-still stage-still" data-still={id}>
    {frame.previous && <img className="stage-previous" src={zeroStills[frame.previous]?.src} alt="" aria-hidden="true" />}
    <img key={id} className={frame.previous ? frame.loaded ? 'stage-enter' : 'stage-pending' : ''} src={still.src} alt={still.alt} width="1536" height="1024" onLoad={() => setFrame(current => current.id === id ? { ...current, loaded: true } : current)} onError={event => { event.currentTarget.style.visibility = 'hidden' }} />
    <figcaption>{caption}</figcaption>
  </figure>
}
