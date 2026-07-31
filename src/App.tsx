 'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronRight, Clock3, Maximize2, Mic2, Moon, QrCode, RefreshCcw, Search, Settings, Sparkles, Undo2, Users, Volume2 } from 'lucide-react'
import QRCode from 'qrcode'
import { Player } from './components/Player'
import { Queue } from './components/Queue'
import { AdminModal } from './components/AdminModal'
import { WeatherCard } from './components/WeatherCard'
import { useFestival } from './hooks/useFestival'
import { formatTime, fullName, type FestivalState, type Skater, type SkaterStatus, type StageNumber } from './models'

function App() {
  const { state, start, finishAndNext, move, moveToPosition, setStatus, setVolume, reset, completeStage, startNextStage, updateEvent, addSkater, updateSkater, renameClub, undo, canUndo } = useFestival()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Skater>()
  const [adminOpen, setAdminOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrImage, setQrImage] = useState('')
  const effectPlayer = useRef<HTMLAudioElement>(null)
  const customSoundInput = useRef<HTMLInputElement>(null)
  const [customSounds, setCustomSounds] = useState<Array<{ id: string; name: string; url: string }>>([])
  const [soundEditorOpen, setSoundEditorOpen] = useState(false)
  const [soundButtons, setSoundButtons] = useState([
    { id: 'applause', name: 'APLAUSOS', icon: '👏', file: 'aplausos.ogg', shortcut: 'F1', gain: .7 },
    { id: 'strong', name: 'APLAUSOS FUERTES', icon: '👏👏', file: 'aplausos.ogg', shortcut: 'F2', gain: 1 },
    { id: 'intro', name: 'PRESENTACIÓN', icon: '🎙️', file: 'locutor/presentacion.wav', shortcut: 'F3', gain: 1 },
    { id: 'next', name: 'PRÓXIMA', icon: '🔔', file: 'locutor/proxima.wav', shortcut: 'F4', gain: 1 },
    { id: 'congrats', name: 'FELICITACIONES', icon: '🎉', file: 'locutor/felicitaciones.wav', shortcut: 'F6', gain: 1 },
  ])
  const active = state.skaters.find(skater => skater.id === state.activeId)
  const waiting = state.skaters.filter(skater => skater.status === 'PENDING' || skater.status === 'POSTPONED')
  const next = waiting[0]
  const finished = state.skaters.filter(skater => skater.status === 'FINISHED').length
  const visible = useMemo(() => state.skaters.filter(skater => `${fullName(skater)} ${skater.club} ${skater.number}`.toLowerCase().includes(query.toLowerCase())), [state.skaters, query])
  const suggestions = query.trim().length ? visible.slice(0, 6) : []
  const stageName = `Etapa ${state.currentStage} de ${state.stageCount}`
  const hasNextStage = state.currentStage < state.stageCount
  const currentStageCompleted = state.completedStages.includes(state.currentStage)
  const publicUrl = `${window.location.origin}${window.location.pathname}?publico=1`

  useEffect(() => { void QRCode.toDataURL(publicUrl, { width: 280, margin: 1 }).then(setQrImage) }, [publicUrl])

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

  const playSoundButton = (button: typeof soundButtons[number]) => button.file.startsWith('blob:') ? playCustomSound(button.file) : playEffect(button.file, button.gain)

  const downloadEventList = () => {
    const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    const rows: Array<Array<string | number>> = [
      ['Evento', state.name],
      ['Club organizador', state.organizer],
      ['Cantidad de etapas', state.stageCount],
      [],
      ['Etapa', 'Orden', 'Número', 'Patinadora', 'Club', 'Coreografía / Canción'],
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

  if (new URLSearchParams(window.location.search).has('publico')) return <PublicView state={state} />

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
          <button title="QR para espectadores" aria-label="QR para espectadores" onClick={() => setQrOpen(true)}><QrCode /></button>
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

        <WeatherCard location={state.location} date={state.eventDate} time={state.startTime} countdownMinutes={state.countdownMinutes} />

        {!state.started && !currentStageCompleted && <button className="start-banner" onClick={() => window.confirm(`¿Iniciar etapa ${state.currentStage} desde la participante preparada?`) && start()}><span><PlayIcon /> INICIAR ETAPA {state.currentStage}</span><small>La música quedará preparada. No comenzará automáticamente.</small></button>}
        {!currentStageCompleted && <button className="stage-transition" onClick={() => window.confirm(`¿Finalizar etapa ${state.currentStage}? Se guardará el resultado de cada patinadora.`) && completeStage()}><Check /><span><strong>FINALIZAR ETAPA {state.currentStage}</strong><small>Guarda resultados de esta pasada sin iniciar la siguiente</small></span></button>}
        {currentStageCompleted && hasNextStage && <button className="stage-transition start-next-stage" onClick={() => window.confirm(`¿Preparar etapa ${state.currentStage + 1}?`) && startNextStage()}><RefreshCcw /><span><strong>INICIAR ETAPA {state.currentStage + 1}</strong><small>Podés iniciarla cuando quieras</small></span></button>}
        {state.completedStages.length > 0 && <div className="stage-complete"><Check /> {state.completedStages.map(stage => `Etapa ${stage} finalizada`).join(' · ')} · resultados guardados en el listado</div>}

        <div className="live-grid">
          <section className="now-card card">
            <div className="card-label"><span><i /> {active?.status === 'READY' ? 'PREPARADA' : 'PATINANDO AHORA'}</span><em>{active?.heat}</em></div>
            {active ? <>
              <div className="bib">Nº {active.number}</div>
              <h1>{active.firstName}<br /><strong>{active.lastName}</strong></h1>
              <p className="club">{active.club}</p>
              <div className="track"><span>♫</span><div><small>COREOGRAFÍA / CANCIÓN</small><strong>{active.track}</strong><em>{active.category}</em></div></div>
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
          <div className="sound-title"><span><Mic2 /> PANEL DEL LOCUTOR <button className="manage-sounds" onClick={() => setSoundEditorOpen(true)}>Administrar botones</button></span><label><Volume2 /><input type="range" min="0" max="100" value={state.effectsVolume} onChange={event => setVolume('effectsVolume', Number(event.target.value))} /><b>{state.effectsVolume}%</b></label></div>
          <div className="sound-buttons">
            {soundButtons.map(button => <button key={button.id} onClick={() => playSoundButton(button)}><span>{button.icon}</span><strong>{button.name}</strong><kbd>{button.shortcut}</kbd></button>)}
            {customSounds.map(sound => <button className="custom-sound" key={sound.id} onClick={() => playCustomSound(sound.url)}><Volume2 /><strong>{sound.name}</strong><span className="remove-sound" title="Eliminar" onClick={event => { event.stopPropagation(); URL.revokeObjectURL(sound.url); setCustomSounds(current => current.filter(item => item.id !== sound.id)) }}>×</span></button>)}
            <button className="add-sound" onClick={() => customSoundInput.current?.click()}>＋ Personalizar</button>
            <input ref={customSoundInput} className="hidden-file" type="file" accept="audio/*" onChange={event => { addCustomSound(event.target.files?.[0]); event.target.value = '' }} />
          </div>
        </section>

        <Queue skaters={visible} activeId={state.activeId} onMove={move} onSelect={setSelected} onStatus={setStatus} onDownload={downloadEventList} />
      </main>
      <audio ref={effectPlayer} preload="auto" />

      <footer><span><i /> Guardado automático</span><span>Último guardado: ahora</span><button onClick={undo} disabled={!canUndo}><Undo2 /> DESHACER ÚLTIMA ACCIÓN</button><span className="footer-time">JUE 30 JUL · 14:32</span></footer>

      {selected && <SkaterModal skater={selected} state={state} onClose={() => setSelected(undefined)} onStatus={setStatus} onMove={moveToPosition} />}
      {adminOpen && <AdminModal state={state} onClose={() => setAdminOpen(false)} onUpdateEvent={updateEvent} onAddSkater={addSkater} onUpdateSkater={updateSkater} onRenameClub={renameClub} />}
      {qrOpen && <div className="modal-backdrop" onMouseDown={() => setQrOpen(false)}><div className="modal qr-modal" onMouseDown={event => event.stopPropagation()}><button className="modal-close" onClick={() => setQrOpen(false)}>×</button><small>PANTALLA PARA ESPECTADORES</small><h2>Escaneá para seguir el evento</h2>{qrImage && <img src={qrImage} alt="QR pantalla pública" />}<a href={publicUrl} target="_blank">{publicUrl}</a></div></div>}
      {soundEditorOpen && <div className="modal-backdrop" onMouseDown={() => setSoundEditorOpen(false)}><div className="modal sound-editor" onMouseDown={event => event.stopPropagation()}><button className="modal-close" onClick={() => setSoundEditorOpen(false)}>×</button><small>PANEL DEL LOCUTOR</small><h2>Administrar botones</h2>{soundButtons.map(button => <div className="sound-edit-row" key={button.id}><input className="icon-input" aria-label="Icono" value={button.icon} onChange={event => setSoundButtons(items => items.map(item => item.id === button.id ? { ...item, icon: event.target.value } : item))} /><input aria-label="Nombre" value={button.name} onChange={event => setSoundButtons(items => items.map(item => item.id === button.id ? { ...item, name: event.target.value } : item))} /><label className="file-btn">Cambiar audio<input type="file" accept="audio/*" onChange={event => { const file = event.target.files?.[0]; if (file) setSoundButtons(items => items.map(item => item.id === button.id ? { ...item, file: URL.createObjectURL(file) } : item)) }} /></label></div>)}</div></div>}
    </div>
  )
}

function PlayIcon() {
  return <span className="play-triangle">▶</span>
}

function SkaterModal({ skater, state, onClose, onStatus, onMove }: { skater: Skater; state: FestivalState; onClose: () => void; onStatus: (id: string, status: SkaterStatus) => void; onMove: (id: string, stage: StageNumber, position: number) => void }) {
  const [stage, setStage] = useState<StageNumber>(state.currentStage)
  const [position, setPosition] = useState(state.skaters.findIndex(item => item.id === skater.id) + 1)
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={event => event.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><small>PARTICIPANTE Nº {skater.number}</small><h2>{fullName(skater)}</h2><p>{skater.club} · {skater.category}</p><div className="modal-track">♫ {skater.track} · {formatTime(skater.duration)}</div><div className="move-position"><label>Etapa<select value={stage} onChange={event => setStage(Number(event.target.value) as StageNumber)}>{Array.from({ length: state.stageCount }, (_, index) => <option key={index + 1} value={index + 1}>Etapa {index + 1}</option>)}</select></label><label>Posición<input type="number" min="1" max={state.skaters.length} value={position} onChange={event => setPosition(Number(event.target.value))} /></label><button onClick={() => { onMove(skater.id, stage, position); onClose() }}>Mover</button></div><div className="modal-actions">{skater.status === 'ABSENT' ? <button onClick={() => { onStatus(skater.id, 'PENDING'); onClose() }}>Reactivar</button> : <button onClick={() => { onStatus(skater.id, 'ABSENT'); onClose() }}>No se presenta</button>}<button onClick={() => { onStatus(skater.id, 'POSTPONED'); onClose() }}>Posponer</button></div></div></div>
}

function PublicView({ state }: { state: FestivalState }) {
  const active = state.skaters.find(skater => skater.id === state.activeId)
  const pending = state.skaters.filter(skater => skater.status === 'PENDING' || skater.status === 'READY')
  const eventAt = new Date(`${state.eventDate}T${state.startTime}:00`).getTime()
  const minutes = Math.max(0, Math.ceil((eventAt - Date.now()) / 60000))
  return <main className="public-view"><div className="public-brand"><Sparkles /> PISTA EN VIVO</div><h1>{state.name}</h1><p>{state.location} · Etapa {state.currentStage} de {state.stageCount}</p>{!state.started && <div className="public-countdown">Comienza en <strong>{minutes} minutos</strong></div>}<section><small>EN PISTA</small><h2>{active ? fullName(active) : 'En preparación'}</h2>{active && <p>{active.club} · {active.track}</p>}</section><div className="public-columns"><div><small>A CONTINUACIÓN</small><h3>{pending[0] ? fullName(pending[0]) : '—'}</h3><p>{pending[0]?.club}</p></div><div><small>YA PASARON</small><strong>{state.skaters.filter(skater => skater.status === 'FINISHED').length}</strong></div><div><small>RESTANTES</small><strong>{pending.length}</strong></div></div><h3 className="public-list-title">Próximas patinadoras</h3>{pending.slice(1, 8).map((skater, index) => <div className="public-row" key={skater.id}><b>{index + 2}</b><span>{fullName(skater)}<small>{skater.club}</small></span><em>{skater.track}</em></div>)}</main>
}

export default App
