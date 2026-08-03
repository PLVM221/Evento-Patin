'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Clock3, Maximize2, Mic2, Moon, QrCode, RefreshCcw, Search, Settings, ShoppingBasket, Sparkles, Trophy, Undo2, Users, Volume2 } from 'lucide-react'
import QRCode from 'qrcode'
import { Player } from './components/Player'
import { Queue } from './components/Queue'
import { AdminModal } from './components/AdminModal'
import { WeatherCard } from './components/WeatherCard'
import { AuthGate } from './components/AuthGate'
import { useFestival } from './hooks/useFestival'
import { audioPreflight, estimateFinish } from './lib/operations.mjs'
import { supabase } from './lib/supabase'
import { createId } from './lib/id'
import { formatTime, fullName, type FestivalState, type Skater, type SkaterStatus, type StageNumber, type Teacher } from './models'

function useCountdown(eventDate: string, startTime: string) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const eventAt = new Date(`${eventDate}T${startTime}:00`).getTime()
  const remaining = Math.max(0, eventAt - now)
  const totalSeconds = Math.floor(remaining / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function useRemainingUntil(target?: string) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  if (!target) return '00:00:00'
  const totalSeconds = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000))
  return `${String(Math.floor(totalSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`
}

function OperatorApp({ userId }: { userId: string }) {
  const { state, databaseStatus, saveNow, resolveConflict, offlineEnabled, setOfflineMode, savedEvents, saveEvent, restoreEvent, deleteSavedEvent, start, finishAndNext, move, moveToPosition, setStatus, setVolume, reset, completeStage, startNextStage, startBreak, finishBreak, updateEvent, addSkater, importSkaters, importEvent, updateSkater, removeSkater, renameClub, addClub, removeClub, updateClubLogo, addTeacher, removeTeacher, addBuffetItem, updateBuffetItem, removeBuffetItem, setPublicSectionVisibility, setRaffleTicketPrice, addRafflePrice, removeRafflePrice, addRafflePrize, updateRafflePrize, removeRafflePrize, clearFestival, undo, canUndo } = useFestival(userId)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Skater>()
  const [adminOpen, setAdminOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrImage, setQrImage] = useState('')
  const [relayState, setRelayState] = useState<Partial<PublicState>>({})
  const [publicConnected, setPublicConnected] = useState(false)
  const [liveChannel] = useState(() => {
    if (userId !== 'public') return `pista-${userId}`
    return new URLSearchParams(window.location.search).get('publico') ?? `pista-${createId()}`
  })
  const effectPlayer = useRef<HTMLAudioElement>(null)
  const customSoundInput = useRef<HTMLInputElement>(null)
  const [customSounds, setCustomSounds] = useState<Array<{ id: string; name: string; url: string }>>([])
  const [soundEditorOpen, setSoundEditorOpen] = useState(false)
  const [soundButtons, setSoundButtons] = useState([
    {
      id: 'applause',
      name: 'APLAUSOS',
      icon: '👏',
      file: 'aplausos.ogg',
      shortcut: 'F1',
      gain: 0.7,
    },
    {
      id: 'strong',
      name: 'APLAUSOS FUERTES',
      icon: '👏👏',
      file: 'aplausos.ogg',
      shortcut: 'F2',
      gain: 1,
    },
    {
      id: 'intro',
      name: 'PRESENTACIÓN',
      icon: '🎙️',
      file: 'locutor/presentacion.wav',
      shortcut: 'F3',
      gain: 1,
    },
    {
      id: 'next',
      name: 'PRÓXIMA',
      icon: '🔔',
      file: 'locutor/proxima.wav',
      shortcut: 'F4',
      gain: 1,
    },
    {
      id: 'congrats',
      name: 'FELICITACIONES',
      icon: '🎉',
      file: 'locutor/felicitaciones.wav',
      shortcut: 'F6',
      gain: 1,
    },
  ])
  const stageSkaters = state.skaters.filter((skater) => skater.stageNumber === state.currentStage && skater.status !== 'ABSENT' && (state.showSkaters ? skater.entryType !== 'club' : skater.entryType === 'club'))
  const active = stageSkaters.find((skater) => skater.id === state.activeId)
  const activeTeachers = active ? state.teachers.filter((teacher) => teacher.club === active.club) : []
  const waiting = stageSkaters.filter((skater) => skater.status === 'PENDING' || skater.status === 'POSTPONED')
  const next = waiting[0]
  const finished = stageSkaters.filter((skater) => skater.status === 'FINISHED').length
  const visible = useMemo(() => stageSkaters.filter((skater) => `${fullName(skater)} ${skater.club} ${skater.number}`.toLowerCase().includes(query.toLowerCase())), [stageSkaters, query])
  const suggestions = query.trim().length ? visible.slice(0, 6) : []
  const stageName = `Etapa ${state.currentStage} de ${state.stageCount}`
  const currentStageCompleted = state.completedStages.includes(state.currentStage)
  const countdown = useCountdown(state.eventDate, state.startTime)
  const breakCountdown = useRemainingUntil(state.breakEndsAt)
  const estimatedFinish = estimateFinish(state)
  const preflight = audioPreflight(state)
  const publicChannel = new URLSearchParams(window.location.search).get('publico')
  const publicUrl = `${window.location.origin}${window.location.pathname}?publico=${liveChannel}`

  useEffect(() => {
    void QRCode.toDataURL(publicUrl, { width: 280, margin: 1 }).then(setQrImage)
  }, [publicUrl])

  useEffect(() => {
    if (!state.started) return
    let lock: { release: () => Promise<void> } | undefined
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
    void wakeLock?.request('screen').then(value => { lock = value }).catch(() => undefined)
    return () => { void lock?.release() }
  }, [state.started])

  useEffect(() => {
    if (publicChannel) return
    const snapshot = {
      name: state.name,
      organizer: state.organizer,
      location: state.location,
      eventDate: state.eventDate,
      startTime: state.startTime,
      stageCount: state.stageCount,
      currentStage: state.currentStage,
      completedStages: state.completedStages,
      started: state.started,
      actualStartedAt: state.actualStartedAt,
      activeBreakAfter: state.activeBreakAfter,
      breakEndsAt: state.breakEndsAt,
      breakDurationMinutes: state.breakDurationMinutes,
      showSkaters: state.showSkaters,
      showBuffet: state.showBuffet,
      showRaffle: state.showRaffle,
      useFrameOnBuffet: state.useFrameOnBuffet,
      useFrameOnRaffle: state.useFrameOnRaffle,
      raffleTicketPrice: state.raffleTicketPrice,
      rafflePrices: state.rafflePrices,
      rafflePrizes: state.rafflePrizes,
      clubs: state.clubs,
      teachers: state.teachers,
      activeId: state.activeId,
      stageOrders: Object.fromEntries(
        Array.from({ length: state.stageCount }, (_, index) => {
          const stage = (index + 1) as StageNumber
          return [stage, state.stageOrders[stage] ?? state.skaters.filter((skater) => skater.stageNumber === stage).map((skater) => skater.id)]
        }),
      ),
      skaters: state.skaters.filter(({ status, entryType }) => status !== 'ABSENT' && (state.showSkaters ? entryType !== 'club' : entryType === 'club')).map(({ id, number, firstName, lastName, club, track, status, stageNumber }) => ({
        id,
        number,
        firstName,
        lastName,
        club,
        track,
        status,
        stageNumber,
      })),
    }
    const publicSnapshot = { ...snapshot, buffetItems: state.buffetItems, organizerLogo: state.organizerLogo, publicFrame: state.publicFrame, clubLogos: state.clubLogos }
    const publish = () => { void supabase.rpc('publish_event_snapshot', { p_channel: liveChannel, p_data: publicSnapshot }) }
    const timer = window.setTimeout(publish, 350)
    return () => {
      window.clearTimeout(timer)
    }
  }, [state, liveChannel, publicChannel])

  useEffect(() => {
    if (!publicChannel) return
    let active = true
    const refresh = () => void supabase.from('public_event_state').select('data').eq('channel', publicChannel).maybeSingle().then(({ data, error }) => {
      if (!active) return
      setPublicConnected(!error)
      if (data?.data) setRelayState(data.data as Partial<PublicState>)
    })
    refresh()
    const refreshTimer = window.setInterval(refresh, 5000)
    const channel = supabase.channel(`public-event-${publicChannel}`).on('postgres_changes', { event: '*', schema: 'public', table: 'public_event_state', filter: `channel=eq.${publicChannel}` }, (payload) => {
      const row = payload.new as { data?: Partial<PublicState> }
      if (row.data) setRelayState(row.data)
    }).subscribe(status => setPublicConnected(status === 'SUBSCRIBED'))
    return () => { active = false; window.clearInterval(refreshTimer); void supabase.removeChannel(channel) }
  }, [publicChannel])

  const finalize = () => {
    if (active && window.confirm(`¿Finalizar participación de ${fullName(active)}?`)) finishAndNext()
  }

  const playEffect = useCallback(
    (file: string, gain = 1) => {
      const player = effectPlayer.current
      if (!player) return
      player.pause()
      player.src = `${import.meta.env.BASE_URL}audio/${file}`
      player.currentTime = 0
      player.volume = Math.min(1, (state.effectsVolume / 100) * gain)
      void player.play()
    },
    [state.effectsVolume],
  )

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === 'F1') {
        event.preventDefault()
        playEffect('aplausos.ogg', 0.7)
      }
      if (event.key === 'F2') {
        event.preventDefault()
        playEffect('aplausos.ogg')
      }
      if (event.key === 'F3') {
        event.preventDefault()
        playEffect('locutor/presentacion.wav')
      }
      if (event.key === 'F4') {
        event.preventDefault()
        playEffect('locutor/proxima.wav')
      }
      if (event.key === 'F6') {
        event.preventDefault()
        playEffect('locutor/felicitaciones.wav')
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [playEffect])

  const addCustomSound = (file?: File) => {
    if (!file) return
    const suggested = file.name.replace(/\.[^.]+$/, '')
    const name = window.prompt('Nombre del botón de audio:', suggested)?.trim()
    if (!name) return
    setCustomSounds((current) => [...current, { id: createId(), name, url: URL.createObjectURL(file) }])
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

  const playSoundButton = (button: (typeof soundButtons)[number]) => (button.file.startsWith('blob:') ? playCustomSound(button.file) : playEffect(button.file, button.gain))

  const downloadEventList = () => {
    const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    const rows: Array<Array<string | number>> = [['Evento', state.name], ['Club organizador', state.organizer], ['Cantidad de etapas', state.stageCount], [], ['Etapa', 'Orden', 'Número', 'Patinadora', 'Club', 'Coreografía / Canción']]
    for (let stage = 1; stage <= state.stageCount; stage += 1) {
      const savedOrder = state.stageOrders[stage as 1 | 2 | 3]
      const ordered = savedOrder ? savedOrder.map((id) => state.skaters.find((skater) => skater.id === id)).filter((skater): skater is Skater => Boolean(skater)) : state.skaters.filter((skater) => skater.stageNumber === stage)
      ordered.forEach((skater, index) => rows.push([`Etapa ${stage}`, index + 1, skater.number, fullName(skater), skater.club, skater.track]))
    }
    const csv = `\uFEFF${rows.map((row) => row.map(quote).join(';')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${state.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-orden-de-pasada.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (publicChannel) return <PublicView state={{ ...state, ...relayState }} connected={publicConnected} />

  return (
    <div className={`app-shell ${dark ? 'dark' : ''}`}>
      <header>
        <div className="brand">
          <div className="brand-mark">
            <Sparkles />
          </div>
          <div>
            <strong>PISTA</strong>
            <span>Gestión de eventos</span>
            <small className="brand-developer">Desarrollado por <b>PLVM Soft</b></small>
          </div>
        </div>
        <div className="event-name">
          <div className="header-organizer-logo">{state.organizerLogo ? <img src={state.organizerLogo} alt={`Escudo de ${state.organizer}`} /> : state.organizer.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()}</div>
          <div><span>EVENTO ACTUAL · {stageName.toUpperCase()}</span><strong>{state.name}</strong><small>Organiza: {state.organizer}</small></div>
        </div>
        <div className="header-actions">
          <div className="live-state">
            <i /> {state.started ? 'EN VIVO' : 'PREPARACIÓN'}
          </div>
          <button title="Pantalla completa" aria-label="Pantalla completa" onClick={() => void document.documentElement.requestFullscreen()}>
            <Maximize2 />
          </button>
          <button title="Cambiar tema claro/oscuro" aria-label="Cambiar tema" onClick={() => setDark((value) => !value)}>
            <Moon />
          </button>
          <button title="Administrar evento, patinadoras, clubes y audios" aria-label="Administrar" onClick={() => setAdminOpen(true)}>
            <Settings />
          </button>
          <button title="QR para espectadores" aria-label="QR para espectadores" onClick={() => setQrOpen(true)}>
            <QrCode />
          </button>
          <button className="logout-header" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={() => void supabase.auth.signOut()}>SALIR</button>
          <button className="reset-header" title="Reiniciar festival" onClick={() => window.confirm('¿Reiniciar todo el festival? Las finalizadas volverán a pendiente.') && reset()}>
            <RefreshCcw />
            <span>REINICIAR</span>
          </button>
        </div>
      </header>

      <main>
        <section className="stats">
          {state.showSkaters && <div>
            <Users />
            <span>
              <small>PARTICIPANTES ETAPA</small>
              <strong>{stageSkaters.length}</strong>
            </span>
          </div>}
          {state.showSkaters && <div>
            <Check />
            <span>
              <small>FINALIZADAS</small>
              <strong>{finished}</strong>
            </span>
          </div>}
          {state.showSkaters && <div>
            <Clock3 />
            <span>
              <small>RESTANTES</small>
              <strong>{stageSkaters.length - finished}</strong>
            </span>
          </div>}
          <div className="stage-stat">
            <span>
              <small>ETAPA ACTUAL</small>
              <strong>
                {state.currentStage} / {state.stageCount}
              </strong>
            </span>
          </div>
          <div className="estimate">
            <span>
              <small>FINAL ESTIMADO</small>
              <strong>{estimatedFinish.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23' })}</strong>
            </span>
            <em>45 s entre pasadas</em>
          </div>
          {state.showSkaters && <div className="search-wrap">
            <label className="search">
              <Search />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, club o número..." />
            </label>
            {suggestions.length > 0 && (
              <div className="search-results">
                {suggestions.map((skater) => (
                  <button
                    key={skater.id}
                    onClick={() => {
                      setSelected(skater)
                      setQuery('')
                    }}
                  >
                    <span>
                      <strong>{fullName(skater)}</strong>
                      <small>
                        {skater.club} · Nº {skater.number}
                      </small>
                    </span>
                    <em>{skater.status === 'ABSENT' ? 'Ausente' : skater.heat}</em>
                  </button>
                ))}
              </div>
            )}
            {query.trim() && suggestions.length === 0 && <div className="search-results empty-search">Sin coincidencias</div>}
          </div>}
        </section>

        <section className={`audio-preflight ${preflight.complete ? 'complete' : ''}`}><strong>CONTROL DE AUDIOS · {preflight.ready}/{preflight.total}</strong><span>{preflight.complete ? 'Todas las canciones pendientes están disponibles en este equipo.' : `Faltan ${preflight.total - preflight.ready} canciones. Revisalas en Administrar → Audios antes de comenzar.`}</span></section>
        <WeatherCard location={state.location} date={state.eventDate} time={state.startTime} countdownMinutes={state.countdownMinutes} />
        {!state.actualStartedAt && state.completedStages.length === 0 && (
          <div className="operator-countdown">
            <span>EL EVENTO COMIENZA EN</span>
            <strong>{countdown}</strong>
            <small>HORAS · MINUTOS · SEGUNDOS</small>
          </div>
        )}
        {state.actualStartedAt && <div className="operator-started">TORNEO INICIADO · {new Date(state.actualStartedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>}

        <div className="stage-controls">
          {Array.from({ length: state.stageCount }, (_, index) => {
            const stage = (index + 1) as StageNumber
            const completed = state.completedStages.includes(stage)
            const isCurrent = stage === state.currentStage
            const canStartNext = stage === state.currentStage + 1 && currentStageCompleted && !state.activeBreakAfter
            const hasPending = isCurrent && (waiting.length > 0 || Boolean(active))
            const label = completed && hasPending ? `REABRIR ETAPA ${stage}` : completed ? `ETAPA ${stage} FINALIZADA` : isCurrent ? (state.started ? `FINALIZAR ETAPA ${stage}` : `INICIAR ETAPA ${stage}`) : canStartNext ? `INICIAR ETAPA ${stage}` : `ETAPA ${stage} PENDIENTE`
            const action = () => {
              if (canStartNext) {
                if (window.confirm(`¿Iniciar etapa ${stage}?`)) startNextStage()
                return
              }
              if (completed && hasPending) { start(); return }
              if (!isCurrent || completed) return
              if (state.started) {
                if (waiting.length > 0 || active) window.alert(`Todavía quedan ${(waiting.length + (active ? 1 : 0))} pasadas en la etapa ${stage}. Finalizalas antes de cerrar la etapa.`)
                else if (window.confirm(`¿Finalizar etapa ${stage}?`)) completeStage()
              } else if (stageSkaters.length === 0) {
                window.alert(state.showSkaters ? 'No hay patinadoras habilitadas en esta etapa.' : 'No hay pasadas de clubes cargadas en esta etapa. Cargalas en Administrar → Pasadas.')
              } else if (window.confirm(`¿Iniciar etapa ${stage}?`)) start()
            }
            const breakActive = state.activeBreakAfter === stage
            const breakEnabled = completed && isCurrent
            return (
              <div className="stage-block" key={stage}>
                <button className={`stage-control ${completed ? 'completed' : ''} ${state.started && isCurrent ? 'running' : ''}`} disabled={(!isCurrent && !canStartNext) || (completed && !hasPending)} onClick={action}>
                  {completed ? <Check /> : state.started && isCurrent ? <Check /> : <PlayIcon />}
                  <span>
                    <strong>{label}</strong>
                    <small>{completed ? 'Resultados guardados' : isCurrent && state.started ? 'Cierra esta pasada sin iniciar la siguiente' : canStartNext || isCurrent ? 'La música no comienza automáticamente' : 'Disponible al finalizar etapa anterior'}</small>
                  </span>
                </button>
                {stage < state.stageCount && (
                  <button className={`break-control ${breakActive ? 'running' : ''}`} disabled={!breakEnabled} onClick={() => (breakActive ? finishBreak() : startBreak(stage))}>
                    <Clock3 />
                    <span>
                      <strong>{breakActive ? 'FINALIZAR RECESO' : `INICIAR RECESO · ${state.breakDurationMinutes} MIN`}</strong>
                      <small>{breakActive ? `${breakCountdown} · Finaliza ${new Date(state.breakEndsAt!).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : breakEnabled ? 'Comenzar cuenta regresiva del intervalo' : `Disponible al finalizar etapa ${stage}`}</small>
                    </span>
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {state.activeBreakAfter && (
          <div className="break-banner">
            <span>RECESO EN CURSO</span>
            <strong>{breakCountdown}</strong>
            <small>
              Finaliza a las{' '}
              {new Date(state.breakEndsAt!).toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </small>
          </div>
        )}

        <div className="live-grid">
          <section className="now-card card">
            <div className="card-label">
              <span>
                <i /> {active?.status === 'READY' ? 'PREPARADA' : 'PATINANDO AHORA'}
              </span>
              <em>{active?.heat}</em>
            </div>
            {active ? (
              <>
                {state.showSkaters && <div className="bib">Nº {active.number}</div>}
                <div className="active-identity"><div className="active-club-logo">{state.clubLogos[active.club] ? <img src={state.clubLogos[active.club]} alt={`Escudo de ${active.club}`} /> : active.club.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</div><div><small>CLUB</small><h1>{active.club}</h1>{state.showSkaters && <p className="active-skater-name">Patinadora: {fullName(active)}</p>}</div></div>
                <div className="track">
                  <span>♫</span>
                  <div>
                    <small>COREOGRAFÍA / CANCIÓN</small>
                    <strong>{active.track}</strong>
                    <em>{active.category}</em>
                  </div>
                </div>
                <div className="active-teacher"><small>SEÑO</small><strong>{activeTeachers.length ? activeTeachers.map((teacher) => teacher.name).join(' · ') : 'Pendiente de asignación'}</strong></div>
                <Player disabled={!state.started} skater={active} elapsed={state.elapsed} volume={state.musicVolume} onVolume={(value) => setVolume('musicVolume', value)} />
                <div className="critical-actions">
                  <button disabled={!state.started} className="finish" onClick={finalize}>
                    <Check /> FINALIZAR
                  </button>
                  <button disabled={!state.started} className="next" onClick={finalize}>
                    SIGUIENTE <ChevronRight />
                  </button>
                </div>
              </>
            ) : (
              <div className="empty">{state.started ? 'Etapa sin pasada activa' : currentStageCompleted ? 'Etapa finalizada' : 'Iniciá la etapa para cargar el primer club'}</div>
            )}
          </section>

          <aside className="up-next card">
            <div className="aside-title">
              <span>A CONTINUACIÓN</span>
              <em>{waiting.length} restantes</em>
            </div>
            {next && (
              <div className="next-person">
                <div className="avatar">
                  {next.firstName[0]}
                  {next.lastName[0]}
                </div>
                <div>
                  <small>{state.showSkaters ? `PRÓXIMA PATINADORA · Nº ${next.number}` : 'PRÓXIMA COREOGRAFÍA'}</small>
                  <h2>{state.showSkaters ? fullName(next) : next.club}</h2>
                  {state.showSkaters && <p>{next.club}</p>}
                  <span>
                    ♫ {next.track} · {formatTime(next.duration)}
                  </span>
                </div>
              </div>
            )}
            <div className="waiting-title">EN ESPERA</div>
            {waiting.slice(1, 5).map((skater, index) => (
              <div className="waiting-row" key={skater.id}>
                <b>{index + 2}</b>
                <div>
                  <strong>{state.showSkaters ? fullName(skater) : skater.club}</strong>
                  <small>{state.showSkaters ? skater.club : skater.track}</small>
                </div>
                {state.showSkaters && <span>{skater.number}</span>}
              </div>
            ))}
          </aside>
        </div>

        <section className="soundboard">
          <div className="sound-title">
            <span>
              <Mic2 /> PANEL DEL LOCUTOR{' '}
              <button className="manage-sounds" onClick={() => setSoundEditorOpen(true)}>
                Administrar botones
              </button>
            </span>
            <label>
              <Volume2 />
              <input type="range" min="0" max="100" value={state.effectsVolume} onChange={(event) => setVolume('effectsVolume', Number(event.target.value))} />
              <b>{state.effectsVolume}%</b>
            </label>
          </div>
          <div className="sound-buttons">
            {soundButtons.map((button) => (
              <button key={button.id} onClick={() => playSoundButton(button)}>
                <span>{button.icon}</span>
                <strong>{button.name}</strong>
                <kbd>{button.shortcut}</kbd>
              </button>
            ))}
            {customSounds.map((sound) => (
              <button className="custom-sound" key={sound.id} onClick={() => playCustomSound(sound.url)}>
                <Volume2 />
                <strong>{sound.name}</strong>
                <span
                  className="remove-sound"
                  title="Eliminar"
                  onClick={(event) => {
                    event.stopPropagation()
                    URL.revokeObjectURL(sound.url)
                    setCustomSounds((current) => current.filter((item) => item.id !== sound.id))
                  }}
                >
                  ×
                </span>
              </button>
            ))}
            <button className="add-sound" onClick={() => customSoundInput.current?.click()}>
              ＋ Personalizar
            </button>
            <input
              ref={customSoundInput}
              className="hidden-file"
              type="file"
              accept="audio/*"
              onChange={(event) => {
                addCustomSound(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </div>
        </section>

        {state.showSkaters && <Queue skaters={visible} activeId={state.activeId} onMove={move} onSelect={setSelected} onStatus={setStatus} onDownload={downloadEventList} />}
        <ParticipatingClubs organizer={state.organizer} clubs={state.clubs} clubLogos={state.clubLogos} teachers={state.teachers} skaters={state.skaters} showSkaters={state.showSkaters} />
      </main>
      <audio ref={effectPlayer} preload="auto" />

      <footer>
        <span>
          <i /> Guardado automático
        </span>
        <span>Último guardado: ahora</span>
        <span className={`database-status ${databaseStatus}`}><i />{databaseStatus === 'saved' ? 'Guardado en base de datos' : databaseStatus === 'saving' ? 'Guardando en base de datos…' : databaseStatus === 'offline' ? 'Trabajando localmente · se sincronizará al volver Internet' : databaseStatus === 'conflict' ? 'Conflicto detectado · conservamos la copia local, revisá antes de continuar' : databaseStatus === 'error' ? 'Error al guardar en base de datos' : 'Conectando con base de datos…'}</span>
        {databaseStatus === 'conflict' && <span className="conflict-actions"><button onClick={() => void resolveConflict('local')}>Conservar este equipo</button><button onClick={() => window.confirm('¿Descartar los cambios locales y cargar la versión de la nube?') && void resolveConflict('remote')}>Usar versión de la nube</button></span>}
        <span className="plvm-credit">
          Desarrollado por <strong>PLVM Soft</strong>
        </span>
        <button onClick={undo} disabled={!canUndo}>
          <Undo2 /> DESHACER ÚLTIMA ACCIÓN
        </button>
        <span className="footer-time">JUE 30 JUL · 14:32</span>
      </footer>

      {state.showSkaters && selected && <SkaterModal skater={selected} state={state} onClose={() => setSelected(undefined)} onStatus={setStatus} onMove={moveToPosition} />}
      {adminOpen && <AdminModal state={state} onClose={() => setAdminOpen(false)} onUpdateEvent={updateEvent} onAddSkater={addSkater} onImportSkaters={importSkaters} onImportEvent={importEvent} onUpdateSkater={updateSkater} onRemoveSkater={removeSkater} onRenameClub={renameClub} onAddClub={addClub} onRemoveClub={removeClub} onUpdateClubLogo={updateClubLogo} onAddTeacher={addTeacher} onRemoveTeacher={removeTeacher} onAddBuffetItem={addBuffetItem} onUpdateBuffetItem={updateBuffetItem} onRemoveBuffetItem={removeBuffetItem} onSetPublicSectionVisibility={setPublicSectionVisibility} onSetRaffleTicketPrice={setRaffleTicketPrice} onAddRafflePrice={addRafflePrice} onRemoveRafflePrice={removeRafflePrice} onAddRafflePrize={addRafflePrize} onUpdateRafflePrize={updateRafflePrize} onRemoveRafflePrize={removeRafflePrize} savedEvents={savedEvents} onSaveEvent={saveEvent} onSaveChanges={saveNow} onRestoreEvent={restoreEvent} onDeleteSavedEvent={deleteSavedEvent} offlineEnabled={offlineEnabled} onSetOfflineMode={setOfflineMode} onClearAll={() => { clearFestival(); setAdminOpen(false) }} />}
      {qrOpen && (
        <div className="modal-backdrop" onMouseDown={() => setQrOpen(false)}>
          <div className="modal qr-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setQrOpen(false)}>
              ×
            </button>
            <small>PANTALLA PARA ESPECTADORES</small>
            <h2>Escaneá para seguir el evento</h2>
            {qrImage && <img src={qrImage} alt="QR pantalla pública" />}
            <a href={publicUrl} target="_blank">
              {publicUrl}
            </a>
          </div>
        </div>
      )}
      {soundEditorOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSoundEditorOpen(false)}>
          <div className="modal sound-editor" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSoundEditorOpen(false)}>
              ×
            </button>
            <small>PANEL DEL LOCUTOR</small>
            <h2>Administrar botones</h2>
            {soundButtons.map((button) => (
              <div className="sound-edit-row" key={button.id}>
                <input className="icon-input" aria-label="Icono" value={button.icon} onChange={(event) => setSoundButtons((items) => items.map((item) => (item.id === button.id ? { ...item, icon: event.target.value } : item)))} />
                <input aria-label="Nombre" value={button.name} onChange={(event) => setSoundButtons((items) => items.map((item) => (item.id === button.id ? { ...item, name: event.target.value } : item)))} />
                <label className="file-btn">
                  Cambiar audio
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) setSoundButtons((items) => items.map((item) => (item.id === button.id ? { ...item, file: URL.createObjectURL(file) } : item)))
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ParticipatingClubs({ organizer, clubs, clubLogos, teachers, skaters, showSkaters, onSelect }: { organizer: string; clubs: string[]; clubLogos: Record<string, string>; teachers: Teacher[]; skaters: Array<{ club: string }>; showSkaters: boolean; onSelect?: (club: string) => void }) {
  const participating = clubs.filter((club) => club.trim().toLowerCase() !== organizer.trim().toLowerCase() && skaters.some((skater) => skater.club === club))
  if (participating.length === 0) return null
  return <section className="participating-clubs"><div className="clubs-heading"><small>COMUNIDAD DEL EVENTO</small><h2>Clubes invitados</h2><p>{onSelect ? 'Tocá un club para conocer sus coreografías y seños.' : 'Cada equipo junto a sus seños responsables.'}</p></div><div className="clubs-grid">{participating.map((club) => { const clubTeachers = teachers.filter((teacher) => teacher.club === club); const count = skaters.filter((skater) => skater.club === club).length; const initials = club.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase(); const content = <><div className="club-monogram">{clubLogos[club] ? <img src={clubLogos[club]} alt={`Escudo de ${club}`} /> : initials}</div><div><strong>{club}</strong>{showSkaters && <span>{count} {count === 1 ? 'patinadora' : 'patinadoras'}</span>}<small>{clubTeachers.length ? `Seño${clubTeachers.length > 1 ? 's' : ''}: ${clubTeachers.map((teacher) => teacher.name).join(' · ')}` : 'Seño pendiente de asignación'}</small></div></>; return onSelect ? <button className="club-card" key={club} onClick={() => onSelect(club)}>{content}<ChevronRight /></button> : <article key={club}>{content}</article> })}</div></section>
}

function PlayIcon() {
  return <span className="play-triangle">▶</span>
}

function SkaterModal({ skater, state, onClose, onStatus, onMove }: { skater: Skater; state: FestivalState; onClose: () => void; onStatus: (id: string, status: SkaterStatus) => void; onMove: (id: string, stage: StageNumber, position: number) => void }) {
  const [stage, setStage] = useState<StageNumber>(state.currentStage)
  const [position, setPosition] = useState(state.skaters.findIndex((item) => item.id === skater.id) + 1)
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <small>PARTICIPANTE Nº {skater.number}</small>
        <h2>{fullName(skater)}</h2>
        <p>
          {skater.club} · {skater.category}
        </p>
        <div className="modal-track">
          ♫ {skater.track} · {formatTime(skater.duration)}
        </div>
        <div className="move-position">
          <label>
            Etapa
            <select value={stage} onChange={(event) => setStage(Number(event.target.value) as StageNumber)}>
              {Array.from({ length: state.stageCount }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  Etapa {index + 1}
                </option>
              ))}
            </select>
          </label>
          <label>
            Posición
            <input type="number" min="1" max={state.skaters.length} value={position} onChange={(event) => setPosition(Number(event.target.value))} />
          </label>
          <button
            onClick={() => {
              onMove(skater.id, stage, position)
              onClose()
            }}
          >
            Mover
          </button>
        </div>
        <div className="modal-actions">
          {skater.status === 'ABSENT' ? (
            <button
              onClick={() => {
                onStatus(skater.id, 'PENDING')
                onClose()
              }}
            >
              Reactivar
            </button>
          ) : (
            <button
              onClick={() => {
                onStatus(skater.id, 'ABSENT')
                onClose()
              }}
            >
              No se presenta
            </button>
          )}
          <button
            onClick={() => {
              onStatus(skater.id, 'POSTPONED')
              onClose()
            }}
          >
            Posponer
          </button>
        </div>
      </div>
    </div>
  )
}

type PublicState = Pick<FestivalState, 'name' | 'organizer' | 'organizerLogo' | 'publicFrame' | 'location' | 'eventDate' | 'startTime' | 'stageCount' | 'showSkaters' | 'currentStage' | 'completedStages' | 'started' | 'actualStartedAt' | 'activeBreakAfter' | 'breakEndsAt' | 'breakDurationMinutes' | 'clubs' | 'clubLogos' | 'teachers' | 'buffetItems' | 'showBuffet' | 'showRaffle' | 'useFrameOnBuffet' | 'useFrameOnRaffle' | 'raffleTicketPrice' | 'rafflePrices' | 'rafflePrizes' | 'activeId' | 'stageOrders'> & {
  skaters: Array<Pick<Skater, 'id' | 'number' | 'firstName' | 'lastName' | 'club' | 'track' | 'status' | 'stageNumber'>>
}

function PublicView({ state, connected }: { state: PublicState; connected: boolean }) {
  const [live, setLive] = useState<PublicState>(state)
  const [selectedClub, setSelectedClub] = useState<string>()
  const [buffetOpen, setBuffetOpen] = useState(false)
  const [raffleOpen, setRaffleOpen] = useState(false)
  useEffect(() => setLive(state), [state])
  const active = live.skaters.find((skater) => skater.id === live.activeId)
  const activeTeachers = active ? (live.teachers ?? []).filter((teacher) => teacher.club === active.club) : []
  const pending = live.skaters.filter((skater) => skater.stageNumber === live.currentStage && (skater.status === 'PENDING' || skater.status === 'READY'))
  const countdown = useCountdown(live.eventDate, live.startTime)
  const breakCountdown = useRemainingUntil(live.breakEndsAt)
  const firstStageStarting = !live.actualStartedAt && countdown === '00:00:00'
  const nextStageStarting = !live.started && live.currentStage < live.stageCount && (live.completedStages ?? []).includes(live.currentStage) && (!live.activeBreakAfter || breakCountdown === '00:00:00')
  const byId = new Map(live.skaters.map((skater) => [skater.id, skater]))
  const frameStyle = live.publicFrame ? { backgroundImage: `linear-gradient(#f3f6fcd9, #f3f6fcd9), url("${live.publicFrame}")` } : undefined
  if (selectedClub) {
    const clubSkaters = live.skaters.filter((skater) => skater.club === selectedClub)
    const clubTeachers = (live.teachers ?? []).filter((teacher) => teacher.club === selectedClub)
    const initials = selectedClub.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
    return <main className="public-view public-subpage"><button className="public-back" onClick={() => setSelectedClub(undefined)}><ChevronLeft /> Volver</button><header className="club-detail-head"><div className="club-detail-logo">{live.clubLogos?.[selectedClub] ? <img src={live.clubLogos[selectedClub]} alt={`Escudo de ${selectedClub}`} /> : initials}</div><div><small>CLUB INVITADO</small><h1>{selectedClub}</h1></div></header><section className="club-teachers"><small>SEÑO{clubTeachers.length > 1 ? 'S' : ''}</small><strong>{clubTeachers.length ? clubTeachers.map((teacher) => teacher.name).join(' · ') : 'Pendiente de asignación'}</strong></section><h2 className="public-list-title">Orden de pasadas</h2><div className="club-skater-list">{clubSkaters.map((skater) => { const stageIds = live.stageOrders[skater.stageNumber] ?? live.skaters.filter((item) => item.stageNumber === skater.stageNumber).map((item) => item.id); const position = stageIds.indexOf(skater.id) + 1; return <article key={skater.id}><div><strong>{live.showSkaters ? fullName(skater as Skater) : skater.track}</strong>{live.showSkaters && <small>{skater.track}</small>}</div><span>Etapa {skater.stageNumber}<strong>Posición {position}</strong></span></article> })}</div></main>
  }
  if (buffetOpen) return <main className={`public-view public-subpage${live.useFrameOnBuffet && live.publicFrame ? ' public-framed' : ''}`} style={live.useFrameOnBuffet ? frameStyle : undefined}><button className="public-back" onClick={() => setBuffetOpen(false)}><ChevronLeft /> Volver</button><header className="buffet-head"><ShoppingBasket /><div><small>PRECIOS DEL EVENTO</small><h1>Bufet</h1></div></header><div className="public-buffet-list">{(live.buffetItems ?? []).map((item) => <article key={item.id}><strong>{item.name}</strong><b>{item.price.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}</b></article>)}{!live.buffetItems?.length && <p>El menú todavía no fue cargado.</p>}</div></main>
  if (raffleOpen) return <main className={`public-view public-subpage${live.useFrameOnRaffle && live.publicFrame ? ' public-framed' : ''}`} style={live.useFrameOnRaffle ? frameStyle : undefined}><button className="public-back" onClick={() => setRaffleOpen(false)}><ChevronLeft /> Volver</button><header className="buffet-head raffle-head"><Trophy /><div><small>SORTEO DEL EVENTO</small><h1>Premios</h1></div></header><div className="public-raffle-prices">{(live.rafflePrices ?? []).map(item => <article key={item.id}><strong>{item.quantity} {item.quantity === 1 ? 'número' : 'números'}</strong><b>{item.price.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}</b></article>)}{!live.rafflePrices?.length && <p>Valores a confirmar.</p>}</div><div className="public-raffle-list">{[...(live.rafflePrizes ?? [])].sort((a, b) => a.order - b.order).map(prize => <article key={prize.id}><b>{prize.order}°</b><strong>{prize.name}</strong>{prize.winningNumber ? <span className="winner"><small>NÚMERO GANADOR</small><em>{prize.winningNumber}</em></span> : <span>Pendiente de sorteo</span>}</article>)}{!live.rafflePrizes?.length && <p>Los premios todavía no fueron cargados.</p>}</div></main>
  return (
    <main className={`public-view${live.publicFrame ? ' public-framed' : ''}`} style={frameStyle}>
      <div className="public-brand">
        <Sparkles /> PISTA EN VIVO <i className={connected ? 'online' : ''}>{connected ? 'Actualizando' : 'Conectando'}</i>
      </div>
      {live.showBuffet && <button className="public-buffet-button" onClick={() => setBuffetOpen(true)}><ShoppingBasket /> Ver precios del bufet</button>}
      {live.showRaffle && <button className="public-raffle-button" onClick={() => setRaffleOpen(true)}><Trophy /> Ver sorteo</button>}
      <h1>{live.name}</h1>
      <div className="public-organizer">
        <div className="public-organizer-logo">{live.organizerLogo ? <img src={live.organizerLogo} alt={`Escudo de ${live.organizer}`} /> : live.organizer.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()}</div>
        <div><small>CLUB ORGANIZADOR</small><strong>{live.organizer}</strong><span>{live.location} · Etapa {live.currentStage} de {live.stageCount}{live.actualStartedAt ? ` · Inicio real ${new Date(live.actualStartedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ''}</span></div>
      </div>
      {firstStageStarting || nextStageStarting ? (
        <div className="public-starting">
          <small>{firstStageStarting ? 'TODO LISTO' : `PRÓXIMA: ETAPA ${live.currentStage + 1}`}</small>
          <strong>{firstStageStarting ? 'El show está por comenzar' : 'La próxima etapa está por comenzar'}</strong>
          <span>En instantes comenzamos.</span>
        </div>
      ) : live.activeBreakAfter ? (
        <div className="public-break">
          <small>RECESO EN CURSO</small>
          <strong>{breakCountdown}</strong>
          <span>Finaliza a las {new Date(live.breakEndsAt!).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <em>A continuación: Etapa {live.activeBreakAfter + 1}</em>
        </div>
      ) : !live.actualStartedAt ? (
        <>
          <div className="public-countdown">
            <span>Comienza en</span>
            <strong>{countdown}</strong>
            <small>HORAS · MINUTOS · SEGUNDOS</small>
          </div>
          <h3 className="public-list-title">Cronograma completo</h3>
          <div className="public-schedule">
            {Array.from({ length: live.stageCount }, (_, index) => {
              const stage = (index + 1) as StageNumber
              const ids = live.stageOrders[stage] ?? live.skaters.filter((skater) => skater.stageNumber === stage).map((skater) => skater.id)
              return (
                <section key={stage}>
                  <h3>Etapa {stage}</h3>
                  {ids.map((id, order) => {
                    const skater = byId.get(id)
                    return skater ? (
                      <div className="public-row" key={id}>
                        <b>{order + 1}</b>
                        <span>
                          {live.showSkaters ? fullName(skater as Skater) : skater.club}
                          {live.showSkaters && <small>{skater.club}</small>}
                        </span>
                        <em>{skater.track}</em>
                      </div>
                    ) : null
                  })}
                </section>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <section className="public-now">
            <small>EN PISTA</small>
            <div className={`public-active-main${active ? '' : ' no-active'}`}>{active && <div className="public-active-logo">{(live.clubLogos?.[active.club] || (active.club === live.organizer ? live.organizerLogo : '')) ? <img src={live.clubLogos?.[active.club] || live.organizerLogo} alt={`Escudo de ${active.club}`} /> : active.club.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</div>}<div><small>{active ? 'CLUB' : 'ESTADO'}</small><h2>{active?.club ?? 'Esperando primera pasada'}</h2></div></div>
            {active && <div className="public-coreography"><small>COREOGRAFÍA / TEMA</small><strong>{active.track}</strong>{live.showSkaters && <span>Patinadora: {fullName(active as Skater)}</span>}</div>}
            {active && <div className="public-active-teacher">Seño: <strong>{activeTeachers.length ? activeTeachers.map((teacher) => teacher.name).join(' · ') : 'Pendiente de asignación'}</strong></div>}
          </section>
          <div className="public-columns">
            <div>
              <small>A CONTINUACIÓN</small>
              <h3>{pending[0] ? (live.showSkaters ? fullName(pending[0] as Skater) : pending[0].club) : '—'}</h3>
              <p>{live.showSkaters ? pending[0]?.club : pending[0]?.track}</p>
            </div>
            <div>
              <small>YA PASARON</small>
              <strong>{live.skaters.filter((skater) => skater.status === 'FINISHED').length}</strong>
            </div>
            <div>
              <small>RESTANTES</small>
              <strong>{pending.length}</strong>
            </div>
          </div>
          <h3 className="public-list-title">{live.showSkaters ? 'Próximas patinadoras' : 'Próximas coreografías'}</h3>
          {pending.slice(1, 8).map((skater, index) => (
            <div className="public-row" key={skater.id}>
              <b>{index + 2}</b>
              <span>
                {live.showSkaters ? fullName(skater as Skater) : skater.club}
                {live.showSkaters && <small>{skater.club}</small>}
              </span>
              <em>{skater.track}</em>
            </div>
          ))}
        </>
      )}
      <ParticipatingClubs organizer={live.organizer} clubs={live.clubs ?? []} clubLogos={live.clubLogos ?? {}} teachers={live.teachers ?? []} skaters={live.skaters} showSkaters={live.showSkaters} onSelect={setSelectedClub} />
      <div className="public-credit">
        Desarrollado por <strong>PLVM Soft</strong>
      </div>
    </main>
  )
}

function App() {
  const publicView = new URLSearchParams(window.location.search).has('publico')
  if (publicView) return <OperatorApp userId="public" />
  return <AuthGate>{user => <OperatorApp userId={user.id} />}</AuthGate>
}

export default App
