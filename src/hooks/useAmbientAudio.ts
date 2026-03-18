import { useEffect, useRef, useState } from 'react'

const NOISE_DURATION_SECONDS = 2

const rampGain = (gainNode: GainNode | null, value: number, duration = 0.6) => {
  if (!gainNode) {
    return
  }

  const now = gainNode.context.currentTime
  gainNode.gain.cancelScheduledValues(now)
  gainNode.gain.setValueAtTime(gainNode.gain.value, now)
  gainNode.gain.linearRampToValueAtTime(value, now + duration)
}

const createNoiseBuffer = (context: AudioContext, tint: 'brown' | 'white') => {
  const frameCount = context.sampleRate * NOISE_DURATION_SECONDS
  const buffer = context.createBuffer(1, frameCount, context.sampleRate)
  const channel = buffer.getChannelData(0)

  if (tint === 'white') {
    for (let index = 0; index < frameCount; index += 1) {
      channel[index] = Math.random() * 2 - 1
    }

    return buffer
  }

  let last = 0
  for (let index = 0; index < frameCount; index += 1) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    channel[index] = last * 3.5
  }

  return buffer
}

const startLoopingNoise = (
  context: AudioContext,
  buffer: AudioBuffer,
  setup: (source: AudioBufferSourceNode, filter: BiquadFilterNode, gain: GainNode) => void,
) => {
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  gain.gain.value = 0

  setup(source, filter, gain)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(context.destination)
  source.start()

  return { source, gain }
}

export function useAmbientAudio() {
  const contextRef = useRef<AudioContext | null>(null)
  const seaGainRef = useRef<GainNode | null>(null)
  const windGainRef = useRef<GainNode | null>(null)
  const heartbeatGainRef = useRef<GainNode | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)
  const heartbeatOscillatorRef = useRef<OscillatorNode | null>(null)
  const [ready, setReady] = useState(false)

  const clearHeartbeatLoop = () => {
    if (heartbeatIntervalRef.current !== null) {
      window.clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }

  const pulseHeartbeat = (intensity: number) => {
    const gainNode = heartbeatGainRef.current
    const context = contextRef.current
    if (!gainNode || !context) {
      return
    }

    const base = Math.max(0, Math.min(0.25, intensity * 0.25))
    const now = context.currentTime
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(base, now + 0.02)
    gainNode.gain.linearRampToValueAtTime(0, now + 0.16)
    gainNode.gain.linearRampToValueAtTime(base * 0.7, now + 0.22)
    gainNode.gain.linearRampToValueAtTime(0, now + 0.38)
  }

  const setHeartbeatLevel = (intensity: number) => {
    const safeIntensity = Math.max(0, Math.min(1, intensity))
    const context = contextRef.current

    if (!context || !heartbeatGainRef.current) {
      return
    }

    if (safeIntensity <= 0.01) {
      clearHeartbeatLoop()
      rampGain(heartbeatGainRef.current, 0, 0.25)
      return
    }

    const interval = Math.max(560, 1180 - safeIntensity * 420)

    clearHeartbeatLoop()
    pulseHeartbeat(safeIntensity)
    heartbeatIntervalRef.current = window.setInterval(() => {
      pulseHeartbeat(safeIntensity)
    }, interval)
  }

  const unlock = async () => {
    if (!contextRef.current) {
      const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextConstructor) {
        return false
      }

      const context = new AudioContextConstructor()
      const brownNoise = createNoiseBuffer(context, 'brown')
      const whiteNoise = createNoiseBuffer(context, 'white')

      const sea = startLoopingNoise(context, brownNoise, (_source, filter) => {
        filter.type = 'lowpass'
        filter.frequency.value = 420
        filter.Q.value = 0.2
      })
      seaGainRef.current = sea.gain

      const wind = startLoopingNoise(context, whiteNoise, (_source, filter) => {
        filter.type = 'bandpass'
        filter.frequency.value = 680
        filter.Q.value = 0.35
      })
      windGainRef.current = wind.gain

      const heartbeatOscillator = context.createOscillator()
      heartbeatOscillator.type = 'sine'
      heartbeatOscillator.frequency.value = 58
      const heartbeatFilter = context.createBiquadFilter()
      heartbeatFilter.type = 'lowpass'
      heartbeatFilter.frequency.value = 140
      const heartbeatGain = context.createGain()
      heartbeatGain.gain.value = 0
      heartbeatOscillator.connect(heartbeatFilter)
      heartbeatFilter.connect(heartbeatGain)
      heartbeatGain.connect(context.destination)
      heartbeatOscillator.start()

      heartbeatOscillatorRef.current = heartbeatOscillator
      heartbeatGainRef.current = heartbeatGain
      contextRef.current = context
    }

    if (contextRef.current.state === 'suspended') {
      await contextRef.current.resume()
    }

    setReady(true)
    return true
  }

  const setSeaLevel = (value: number) => {
    rampGain(seaGainRef.current, value, 1.2)
  }

  const setWindLevel = (value: number) => {
    rampGain(windGainRef.current, value, 1)
  }

  useEffect(() => {
    return () => {
      clearHeartbeatLoop()
      heartbeatOscillatorRef.current?.stop()
      contextRef.current?.close().catch(() => undefined)
    }
  }, [])

  return {
    ready,
    unlock,
    setSeaLevel,
    setWindLevel,
    setHeartbeatLevel,
  }
}
