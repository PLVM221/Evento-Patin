import { Pause, Play, RotateCcw, SkipBack, SkipForward, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Skater } from '../models'
import { formatTime } from '../models'

interface PlayerProps {
  skater?: Skater
  elapsed: number
  volume: number
  onVolume: (value: number) => void
  disabled?: boolean
}

export function Player({ skater, elapsed, volume, onVolume, disabled = false }: PlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(elapsed)
  const audio = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    setPosition(elapsed)
    setPlaying(false)
  }, [skater?.id, elapsed])

  useEffect(() => {
    if (!playing || !skater || skater.audioUrl) return
    const timer = window.setInterval(() => setPosition(value => Math.min(skater.duration, value + 1)), 1000)
    return () => window.clearInterval(timer)
  }, [playing, skater])

  useEffect(() => {
    if (audio.current) audio.current.volume = volume / 100
  }, [volume])

  const seek = (value: number) => {
    setPosition(value)
    if (audio.current) audio.current.currentTime = value
  }

  const toggle = () => {
    const next = !playing
    setPlaying(next)
    if (audio.current) void (next ? audio.current.play() : audio.current.pause())
  }

  const duration = skater?.duration ?? 0

  return (
    <div className="player">
      <div className="timeline">
        <span>{formatTime(position)}</span>
        <input disabled={disabled} aria-label="Progreso" type="range" min="0" max={duration} value={position} onChange={event => seek(Number(event.target.value))} />
        <span className="remaining">-{formatTime(duration - position)}</span>
      </div>
      <div className="player-controls">
        <button disabled={disabled} className="icon-btn" title="Retroceder 5 segundos" onClick={() => seek(Math.max(0, position - 5))}><SkipBack /></button>
        <button disabled={disabled} className="play-btn" onClick={toggle}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}{playing ? 'PAUSA' : 'PLAY'}</button>
        <button disabled={disabled} className="icon-btn stop" title="Detener" onClick={() => { setPlaying(false); seek(0); audio.current?.pause() }}><Square fill="currentColor" /></button>
        <button disabled={disabled} className="icon-btn" title="Avanzar 5 segundos" onClick={() => seek(Math.min(duration, position + 5))}><SkipForward /></button>
        <button disabled={disabled} className="icon-btn" title="Reiniciar" onClick={() => seek(0)}><RotateCcw /></button>
        <label className="volume">VOL <input aria-label="Volumen música" type="range" min="0" max="100" value={volume} onChange={event => onVolume(Number(event.target.value))} /><strong>{volume}%</strong></label>
      </div>
      {skater?.audioUrl && <audio ref={audio} src={skater.audioUrl} preload="auto" onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onEnded={() => setPlaying(false)} />}
      {!skater?.audioUrl && <small className="no-audio">Sin archivo musical asociado · Administrar → Audios</small>}
    </div>
  )
}
