import { Pause, Play, RotateCcw, SkipBack, SkipForward, Sparkles, Square } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import type { Skater } from '../models'
import { formatTime } from '../models'

interface PlayerProps {
  skater?: Skater
  elapsed: number
  volume: number
  enhanced: boolean
  onVolume: (value: number) => void
  onEnhanced: (value: boolean) => void
  disabled?: boolean
}

type AudioGraph = { context: AudioContext; dry: GainNode; wet: GainNode }

function PlayerComponent({ skater, elapsed, volume, enhanced, onVolume, onEnhanced, disabled = false }: PlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(elapsed)
  const [audioSource, setAudioSource] = useState(skater?.audioUrl ?? '')
  const audio = useRef<HTMLAudioElement>(null)
  const audioGraph = useRef<AudioGraph | undefined>(undefined)
  const entrySnapshot = useRef({ elapsed, audioUrl: skater?.audioUrl ?? '' })
  entrySnapshot.current = { elapsed, audioUrl: skater?.audioUrl ?? '' }

  useEffect(() => {
    audio.current?.pause()
    setPosition(entrySnapshot.current.elapsed)
    setPlaying(false)
    setAudioSource(entrySnapshot.current.audioUrl)
  }, [skater?.id])

  useEffect(() => {
    if (skater?.audioUrl) setAudioSource(current => current || skater.audioUrl || '')
  }, [skater?.audioUrl])

  useEffect(() => {
    if (!playing || !skater || skater.audioUrl) return
    const timer = window.setInterval(() => setPosition(value => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [playing, skater])

  useEffect(() => {
    if (audio.current) audio.current.volume = volume / 100
  }, [volume])

  useEffect(() => {
    const graph = audioGraph.current
    if (!graph) return
    const now = graph.context.currentTime
    graph.dry.gain.cancelScheduledValues(now)
    graph.wet.gain.cancelScheduledValues(now)
    graph.dry.gain.setTargetAtTime(enhanced ? 0 : 1, now, 0.035)
    graph.wet.gain.setTargetAtTime(enhanced ? 1 : 0, now, 0.035)
  }, [enhanced])

  useEffect(() => () => { void audioGraph.current?.context.close() }, [])

  const ensureAudioGraph = () => {
    if (audioGraph.current || !audio.current) return audioGraph.current
    if (typeof AudioContext === 'undefined') return undefined
    const context = new AudioContext({ latencyHint: 'interactive' })
    const source = context.createMediaElementSource(audio.current)
    const dry = context.createGain()
    const wet = context.createGain()
    const highPass = context.createBiquadFilter()
    const warmth = context.createBiquadFilter()
    const clarity = context.createBiquadFilter()
    const compressor = context.createDynamicsCompressor()
    const limiter = context.createDynamicsCompressor()
    highPass.type = 'highpass'; highPass.frequency.value = 28; highPass.Q.value = 0.7
    warmth.type = 'lowshelf'; warmth.frequency.value = 140; warmth.gain.value = 1
    clarity.type = 'peaking'; clarity.frequency.value = 3200; clarity.Q.value = 0.8; clarity.gain.value = 1.4
    compressor.threshold.value = -18; compressor.knee.value = 18; compressor.ratio.value = 2.4; compressor.attack.value = 0.012; compressor.release.value = 0.22
    limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.08
    dry.gain.value = enhanced ? 0 : 1
    wet.gain.value = enhanced ? 1 : 0
    source.connect(dry).connect(context.destination)
    source.connect(highPass).connect(warmth).connect(clarity).connect(compressor).connect(limiter).connect(wet).connect(context.destination)
    audioGraph.current = { context, dry, wet }
    return audioGraph.current
  }

  const seek = (value: number) => {
    setPosition(value)
    if (audio.current) audio.current.currentTime = value
  }

  const toggle = () => {
    const next = !playing
    const element = audio.current
    if (!element) { setPlaying(next); return }
    if (!next) { element.pause(); setPlaying(false); return }
    const graph = ensureAudioGraph()
    const ready = graph ? graph.context.resume() : Promise.resolve()
    void ready.then(() => element.play()).then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  const stopWithFade = () => {
    const element = audio.current
    setPlaying(false)
    if (!element) { seek(0); return }
    const initial = element.volume
    let step = 0
    const timer = window.setInterval(() => {
      step += 1
      element.volume = Math.max(0, initial * (1 - step / 8))
      if (step >= 8) {
        window.clearInterval(timer)
        element.pause()
        element.currentTime = 0
        element.volume = volume / 100
        setPosition(0)
      }
    }, 40)
  }

  const duration = skater?.duration ?? 0
  const timingProgress = duration ? Math.min(100, position / duration * 100) : 0
  const overtime = Math.max(0, position - duration)

  return (
    <div className="player">
      <div className={`player-timing${overtime ? ' overtime' : ''}`}><span><small>{overtime ? 'TIEMPO CUMPLIDO' : 'TIEMPO DE COREOGRAFÍA'}</small><strong>{overtime ? `+${formatTime(overtime)}` : `${Math.round(timingProgress)}%`}</strong></span><div><i style={{ width: `${timingProgress}%` }} /></div></div>
      <div className="timeline">
        <span>{formatTime(position)}</span>
        <input disabled={disabled} aria-label="Progreso" type="range" min="0" max={Math.max(duration, position)} value={position} onChange={event => seek(Number(event.target.value))} />
        <span className="remaining">-{formatTime(duration - position)}</span>
      </div>
      <div className="player-controls">
        <button disabled={disabled} className="icon-btn" title="Retroceder 5 segundos" onClick={() => seek(Math.max(0, position - 5))}><SkipBack /></button>
        <button disabled={disabled} className="play-btn" onClick={toggle}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}{playing ? 'PAUSA' : 'PLAY'}</button>
        <button disabled={disabled} className="icon-btn stop" title="Parada de emergencia con fade" onClick={stopWithFade}><Square fill="currentColor" /></button>
        <button disabled={disabled} className="icon-btn" title="Avanzar 5 segundos" onClick={() => seek(Math.min(duration, position + 5))}><SkipForward /></button>
        <button disabled={disabled} className="icon-btn" title="Reiniciar" onClick={() => seek(0)}><RotateCcw /></button>
        <button type="button" className={`enhance-audio${enhanced ? ' active' : ''}`} aria-pressed={enhanced} title="Ecualización, compresión y limitador en tiempo real" onClick={() => onEnhanced(!enhanced)}><Sparkles /><span><strong>MEJORA</strong><small>{enhanced ? 'ACTIVA' : 'NORMAL'}</small></span></button>
        <label className="volume">VOL <input aria-label="Volumen música" type="range" min="0" max="100" value={volume} onChange={event => onVolume(Number(event.target.value))} /><strong>{volume}%</strong></label>
      </div>
      <audio ref={audio} src={audioSource || undefined} preload="auto" onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onEnded={() => setPlaying(false)} onError={() => setPlaying(false)} />
      {!audioSource && <small className="no-audio">Sin archivo musical asociado · Administrar → Audios</small>}
    </div>
  )
}

export const Player = memo(PlayerComponent, (previous, next) => previous.skater?.id === next.skater?.id && previous.skater?.audioUrl === next.skater?.audioUrl && previous.skater?.duration === next.skater?.duration && previous.elapsed === next.elapsed && previous.volume === next.volume && previous.enhanced === next.enhanced && previous.disabled === next.disabled)
