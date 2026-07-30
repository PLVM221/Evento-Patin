 'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Check, ChevronRight, Clock3, Maximize2, Mic2, Moon, Search, Settings, Sparkles, Undo2, Users, Volume2 } from 'lucide-react'
import { Player } from './components/Player'
import { Queue } from './components/Queue'
import { useFestival } from './hooks/useFestival'
import { formatTime, fullName, type Skater } from './models'

function App() {
  const { state, start, finishAndNext, move, setStatus, setVolume, undo, canUndo } = useFestival()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Skater>()
  const effectPlayer = useRef<HTMLAudioElement>(null)
  const active = state.skaters.find(skater => skater.id === state.activeId)
  const waiting = state.skaters.filter(skater => skater.status === 'PENDING' || skater.status === 'POSTPONED')
  const next = waiting[0]
  const finished = state.skaters.filter(skater => skater.status === 'FINISHED').length
  const visible = useMemo(() => state.skaters.filter(skater => `${fullName(skater)} ${skater.club} ${skater.number}`.toLowerCase().includes(query.toLowerCase())), [state.skaters, query])

  const finalize = () => {
    if (active && window.confirm(`¿Finalizar participación de ${fullName(active)}?`)) finishAndNext()
  }

  const playEffect = useCallback((file: string, gain = 1) => {
    const player = effectPlayer.current
    if (!player) return
    player.pause()
    player.src = `${import.meta.env.BASE_URL}audio/${file}`
    player.currentTime = 0
    player.volume = Math.min(1, (state.effectsVolume / 100) * gain)
    void player.play()
  }, [state.effectsVolume])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === 'F1') { event.preventDefault(); playEffect('aplausos.ogg', .7) }
      if (event.key === 'F2') { event.preventDefault(); playEffect('aplausos.ogg') }
      if (event.key === 'F3') { event.preventDefault(); playEffect('locutor/presentacion.wav') }
      if (event.key === 'F4') { event.preventDefault(); playEffect('locutor/proxima.wav') }
      if (event.key === 'F6') { event.preventDefault(); playEffect('locutor/felicitaciones.wav') }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [playEffect])

  return (
    <div className="app-shell">
      <header>
        <div className="brand"><div className="brand-mark"><Sparkles /></div><div><strong>PISTA</strong><span>Gestión de eventos</span></div></div>
        <div className="event-name"><span>EVENTO ACTUAL</span><strong>{state.name}</strong></div>
        <div className="header-actions">
          <div className="live-state"><i /> {state.started ? 'EN VIVO' : 'PREPARACIÓN'}</div>
          <button title="Pantalla pública"><Maximize2 /></button><button title="Tema"><Moon /></button><button title="Configuración"><Settings /></button>
        </div>
      </header>

      <main>
        <section className="stats">
          <div><Users /><span><small>PARTICIPANTES</small><strong>{state.skaters.length}</strong></span></div>
          <div><Check /><span><small>FINALIZADAS</small><strong>{finished}</strong></span></div>
          <div><Clock3 /><span><small>RESTANTES</small><strong>{state.skaters.length - finished}</strong></span></div>
          <div className="estimate"><span><small>FINAL ESTIMADO</small><strong>18:42</strong></span><em>En horario</em></div>
          <label className="search"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar participante..." /></label>
        </section>

        {!state.started && <button className="start-banner" onClick={() => window.confirm('¿Iniciar festival desde la participante preparada?') && start()}><span><PlayIcon /> INICIAR FESTIVAL</span><small>La música quedará preparada. No comenzará automáticamente.</small></button>}

        <div className="live-grid">
          <section className="now-card card">
            <div className="card-label"><span><i /> {active?.status === 'READY' ? 'PREPARADA' : 'PATINANDO AHORA'}</span><em>{active?.heat}</em></div>
            {active ? <>
              <div className="bib">Nº {active.number}</div>
              <h1>{active.firstName}<br /><strong>{active.lastName}</strong></h1>
              <p className="club">{active.club}</p>
              <div className="track"><span>♫</span><div><small>TEMA MUSICAL</small><strong>{active.track}</strong><em>{active.category}</em></div></div>
              <Player skater={active} elapsed={state.elapsed} volume={state.musicVolume} onVolume={value => setVolume('musicVolume', value)} />
              <div className="critical-actions">
                <button className="finish" onClick={finalize}><Check /> FINALIZAR</button>
                <button className="next" onClick={finalize}>SIGUIENTE <ChevronRight /></button>
              </div>
            </> : <div className="empty">Festival finalizado</div>}
          </section>

          <aside className="up-next card">
            <div className="aside-title"><span>A CONTINUACIÓN</span><em>{waiting.length} restantes</em></div>
            {next && <div className="next-person"><div className="avatar">{next.firstName[0]}{next.lastName[0]}</div><div><small>PRÓXIMA PATINADORA · Nº {next.number}</small><h2>{fullName(next)}</h2><p>{next.club}</p><span>♫ {next.track} · {formatTime(next.duration)}</span></div></div>}
            <div className="waiting-title">EN ESPERA</div>
            {waiting.slice(1, 5).map((skater, index) => <div className="waiting-row" key={skater.id}><b>{index + 2}</b><div><strong>{fullName(skater)}</strong><small>{skater.club}</small></div><span>{skater.number}</span></div>)}
          </aside>
        </div>

        <section className="soundboard">
          <div className="sound-title"><span><Mic2 /> PANEL DEL LOCUTOR</span><label><Volume2 /><input type="range" min="0" max="100" value={state.effectsVolume} onChange={event => setVolume('effectsVolume', Number(event.target.value))} /><b>{state.effectsVolume}%</b></label></div>
          <div className="sound-buttons">
            <button onClick={() => playEffect('aplausos.ogg', .7)}><span>👏</span><strong>APLAUSOS</strong><kbd>F1</kbd></button>
            <button onClick={() => playEffect('aplausos.ogg')}><span>👏👏</span><strong>APLAUSOS FUERTES</strong><kbd>F2</kbd></button>
            <button onClick={() => playEffect('locutor/presentacion.wav')}><Mic2 /><strong>PRESENTACIÓN</strong><kbd>F3</kbd></button>
            <button onClick={() => playEffect('locutor/proxima.wav')}><Bell /><strong>PRÓXIMA</strong><kbd>F4</kbd></button>
            <button onClick={() => playEffect('locutor/felicitaciones.wav')}><span>🎉</span><strong>FELICITACIONES</strong><kbd>F6</kbd></button>
            <button className="add-sound">＋ Personalizar</button>
          </div>
        </section>

        <Queue skaters={visible} activeId={state.activeId} onMove={move} onSelect={setSelected} />
      </main>
      <audio ref={effectPlayer} preload="auto" />

      <footer><span><i /> Guardado automático</span><span>Último guardado: ahora</span><button onClick={undo} disabled={!canUndo}><Undo2 /> DESHACER ÚLTIMA ACCIÓN</button><span className="footer-time">JUE 30 JUL · 14:32</span></footer>

      {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(undefined)}><div className="modal" onMouseDown={event => event.stopPropagation()}><button className="modal-close" onClick={() => setSelected(undefined)}>×</button><small>PARTICIPANTE Nº {selected.number}</small><h2>{fullName(selected)}</h2><p>{selected.club} · {selected.category}</p><div className="modal-track">♫ {selected.track} · {formatTime(selected.duration)}</div><div className="modal-actions"><button onClick={() => { setStatus(selected.id, 'ABSENT'); setSelected(undefined) }}>Marcar ausente</button><button onClick={() => { setStatus(selected.id, 'POSTPONED'); setSelected(undefined) }}>Posponer</button></div></div></div>}
    </div>
  )
}

function PlayIcon() {
  return <span className="play-triangle">▶</span>
}

export default App
