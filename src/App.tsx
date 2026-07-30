 'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Check, ChevronRight, Clock3, Maximize2, Mic2, Moon, RefreshCcw, Search, Settings, Sparkles, Undo2, Users, Volume2 } from 'lucide-react'
import { Player } from './components/Player'
import { Queue } from './components/Queue'
import { AdminModal } from './components/AdminModal'
import { useFestival } from './hooks/useFestival'
import { formatTime, fullName, type Skater } from './models'

function App() {
  const { state, start, finishAndNext, move, setStatus, setVolume, reset, completeStage, updateEvent, addSkater, updateSkater, renameClub, undo, canUndo } = useFestival()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Skater>()
  const [adminOpen, setAdminOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const effectPlayer = useRef<HTMLAudioElement>(null)
  const customSoundInput = useRef<HTMLInputElement>(null)
  const [customSounds, setCustomSounds] = useState<Array<{ id: string; name: string; url: string }>>([])
  const active = state.skaters.find(skater => skater.id === state.activeId)
  const waiting = state.skaters.filter(skater => skater.status === 'PENDING' || skater.status === 'POSTPONED')
  const next = waiting[0]
  const finished = state.skaters.filter(skater => skater.status === 'FINISHED').length
  const visible = useMemo(() => state.skaters.filter(skater => `${fullName(skater)} ${skater.club} ${skater.number}`.toLowerCase().includes(query.toLowerCase())), [state.skaters, query])
  const suggestions = query.trim().length ? visible.slice(0, 6) : []
  const stageName = `Etapa ${state.currentStage} de ${state.stageCount}`
  const hasNextStage = state.currentStage < state.stageCount
  const currentStageCompleted = state.completedStages.includes(state.currentStage)

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

  const addCustomSound = (file?: File) => {
    if (!file) return
    const suggested = file.name.replace(/\.[^.]+$/, '')
    const name = window.prompt('Nombre del botón de audio:', suggested)?.trim()
    if (!name) return
    setCustomSounds(current => [...current, { id: crypto.randomUUID(), name, url: URL.createObjectURL(file) }])
  }

  const playCustomSound = (url: string) => {
    const player = effectPlayer.current
    if (!player) return
    player.pause()
    player.src = url
    player.currentTime = 0
    player.volume = state.effectsVolume / 100
    void player.play()
  }

  const downloadEventList = () => {
    const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    const rows: Array<Array<string | number>> = [
      ['Evento', state.name],
      ['Club organizador', state.organizer],
      ['Cantidad de etapas', state.stageCount],
      [],
      ['Etapa', 'Orden', 'Número', 'Patinadora', 'Club', 'Canción / Nombre del baile'],
    ]
    for (let stage = 1; stage <= state.stageCount; stage += 1) {
      const savedOrder = state.stageOrders[stage as 1 | 2 | 3]
      const ordered = savedOrder
        ? savedOrder.map(id => state.skaters.find(skater => skater.id === id)).filter((skater): skater is Skater => Boolean(skater))
        : state.skaters
      ordered.forEach((skater, index) => rows.push([`Etapa ${stage}`, index + 1, skater.number, fullName(skater), skater.club, skater.track]))
    }
    const csv = `\uFEFF${rows.map(row => row.map(quote).join(';')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${state.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-orden-de-pasada.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`app-shell ${dark ? 'dark' : ''}`}>
      <header>
        <div className="brand"><div className="brand-mark"><Sparkles /></div><div><strong>PISTA</strong><span>Gestión de eventos</span></div></div>
        <div className="event-name"><span>EVENTO ACTUAL · {stageName.toUpperCase()}</span><strong>{state.name}</strong><small>Organiza: {state.organizer}</small></div>
        <div className="header-actions">
          <div className="live-state"><i /> {state.started ? 'EN VIVO' : 'PREPARACIÓN'}</div>
          <button title="Pantalla completa" aria-label="Pantalla completa" onClick={() => void document.documentElement.requestFullscreen()}><Maximize2 /></button>
          <button title="Cambiar tema claro/oscuro" aria-label="Cambiar tema" onClick={() => setDark(value => !value)}><Moon /></button>
          <button title="Administrar evento, patinadoras, clubes y audios" aria-label="Administrar" onClick={() => setAdminOpen(true)}><Settings /></button>
          <button className="reset-header" title="Reiniciar festival" onClick={() => window.confirm('¿Reiniciar todo el festival? Las finalizadas volverán a pendiente.') && reset()}><RefreshCcw /><span>REINICIAR</span></button>
        </div>
      </header>

      <main>
        <section className="stats">
          <div><Users /><span><small>PARTICIPANTES</small><strong>{state.skaters.length}</strong></span></div>
          <div><Check /><span><small>FINALIZADAS</small><strong>{finished}</strong></span></div>
          <div><Clock3 /><span><small>RESTANTES</small><strong>{state.skaters.length - finished}</strong></span></div>
          <div className="stage-stat"><span><small>ETAPA ACTUAL</small><strong>{state.currentStage} / {state.stageCount}</strong></span></div>
          <div className="estimate"><span><small>FINAL ESTIMADO</small><strong>18:42</strong></span><em>En horario</em></div>
          <div className="search-wrap">
            <label className="search"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre, club o número..." /></label>
            {suggestions.length > 0 && <div className="search-results">{suggestions.map(skater => <button key={skater.id} onClick={() => { setSelected(skater); setQuery('') }}><span><strong>{fullName(skater)}</strong><small>{skater.club} · Nº {skater.number}</small></span><em>{skater.status === 'ABSENT' ? 'Ausente' : skater.heat}</em></button>)}</div>}
            {query.trim() && suggestions.length === 0 && <div className="search-results empty-search">Sin coincidencias</div>}
          </div>
        </section>

        {!state.started && !currentStageCompleted && <button className="start-banner" onClick={() => window.confirm(`¿Iniciar etapa ${state.currentStage} desde la participante preparada?`) && start()}><span><PlayIcon /> INICIAR ETAPA {state.currentStage}</span><small>La música quedará preparada. No comenzará automáticamente.</small></button>}
        {!currentStageCompleted && <button className="stage-transition" onClick={() => window.confirm(`¿Finalizar etapa ${state.currentStage}${hasNextStage ? ` e iniciar etapa ${state.currentStage + 1}` : ' y cerrar todas las pasadas'}? Se guardará el resultado de cada patinadora.`) && completeStage()}><RefreshCcw /><span><strong>{hasNextStage ? `FINALIZAR ETAPA ${state.currentStage} E INICIAR ETAPA ${state.currentStage + 1}` : `FINALIZAR ETAPA ${state.currentStage}`}</strong><small>Guarda resultados de esta pasada {hasNextStage ? 'y prepara la siguiente' : 'y cierra el festival'}</small></span></button>}
        {state.completedStages.length > 0 && <div className="stage-complete"><Check /> {state.completedStages.map(stage => `Etapa ${stage} finalizada`).join(' · ')} · resultados guardados en el listado</div>}

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
            {customSounds.map(sound => <button className="custom-sound" key={sound.id} onClick={() => playCustomSound(sound.url)}><Volume2 /><strong>{sound.name}</strong><span className="remove-sound" title="Eliminar" onClick={event => { event.stopPropagation(); URL.revokeObjectURL(sound.url); setCustomSounds(current => current.filter(item => item.id !== sound.id)) }}>×</span></button>)}
            <button className="add-sound" onClick={() => customSoundInput.current?.click()}>＋ Personalizar</button>
            <input ref={customSoundInput} className="hidden-file" type="file" accept="audio/*" onChange={event => { addCustomSound(event.target.files?.[0]); event.target.value = '' }} />
          </div>
        </section>

        <Queue skaters={visible} activeId={state.activeId} onMove={move} onSelect={setSelected} onStatus={setStatus} onDownload={downloadEventList} />
      </main>
      <audio ref={effectPlayer} preload="auto" />

      <footer><span><i /> Guardado automático</span><span>Último guardado: ahora</span><button onClick={undo} disabled={!canUndo}><Undo2 /> DESHACER ÚLTIMA ACCIÓN</button><span className="footer-time">JUE 30 JUL · 14:32</span></footer>

      {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(undefined)}><div className="modal" onMouseDown={event => event.stopPropagation()}><button className="modal-close" onClick={() => setSelected(undefined)}>×</button><small>PARTICIPANTE Nº {selected.number}</small><h2>{fullName(selected)}</h2><p>{selected.club} · {selected.category}</p><div className="modal-track">♫ {selected.track} · {formatTime(selected.duration)}</div><div className="modal-actions">{selected.status === 'ABSENT' ? <button onClick={() => { setStatus(selected.id, 'PENDING'); setSelected(undefined) }}>Reactivar</button> : <button onClick={() => { setStatus(selected.id, 'ABSENT'); setSelected(undefined) }}>No se presenta</button>}<button onClick={() => { setStatus(selected.id, 'POSTPONED'); setSelected(undefined) }}>Posponer</button></div></div></div>}
      {adminOpen && <AdminModal state={state} onClose={() => setAdminOpen(false)} onUpdateEvent={updateEvent} onAddSkater={addSkater} onUpdateSkater={updateSkater} onRenameClub={renameClub} />}
    </div>
  )
}

function PlayIcon() {
  return <span className="play-triangle">▶</span>
}

export default App
