import { Pause, Play, RotateCcw, SkipBack, SkipForward, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Skater } from '../models'
import { formatTime } from '../models'

interface PlayerProps {
  skater?: Skater
  elapsed: number
  volume: number
  onVolume: (value: number) => void
}

export function Player({ skater, elapsed, volume, onVolume }: PlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(elapsed)

  useEffect(() => {
    setPosition(elapsed)
    setPlaying(false)
  }, [skater?.id, elapsed])

  useEffect(() => {
    if (!playing || !skater) return
    const timer = window.setInterval(() => setPosition(value => Math.min(skater.duration, value + 1)), 1000)
    return () => window.clearInterval(timer)
  }, [playing, skater])

  const duration = skater?.duration ?? 0

  return (
    <div className="player">
      <div className="timeline">
        <span>{formatTime(position)}</span>
        <input aria-label="Progreso" type="range" min="0" max={duration} value={position} onChange={event => setPosition(Number(event.target.value))} />
        <span className="remaining">-{formatTime(duration - position)}</span>
      </div>
      <div className="player-controls">
        <button className="icon-btn" title="Retroceder 5 segundos" onClick={() => setPosition(Math.max(0, position - 5))}><SkipBack /></button>
        <button className="play-btn" onClick={() => setPlaying(value => !value)}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}{playing ? 'PAUSA' : 'PLAY'}</button>
        <button className="icon-btn stop" title="Detener" onClick={() => { setPlaying(false); setPosition(0) }}><Square fill="currentColor" /></button>
        <button className="icon-btn" title="Avanzar 5 segundos" onClick={() => setPosition(Math.min(duration, position + 5))}><SkipForward /></button>
        <button className="icon-btn" title="Reiniciar" onClick={() => setPosition(0)}><RotateCcw /></button>
        <label className="volume">VOL <input aria-label="Volumen música" type="range" min="0" max="100" value={volume} onChange={event => onVolume(Number(event.target.value))} /><strong>{volume}%</strong></label>
      </div>
    </div>
  )
}
