import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Headphones, Music2, Plus, Save, Settings2, ShoppingBasket, Trash2, Trophy, Users, X } from 'lucide-react'
import type { FestivalState, SavedEvent, Skater } from '../models'
import { fullName, isEntryEnabled } from '../models'
import { removeTrack, saveTrack } from '../lib/audioStore'
import { validateCsvRow } from '../lib/festivalValidation'

type Tab = 'evento' | 'participantes' | 'pasadas' | 'senos' | 'clubes' | 'bufet' | 'sorteo' | 'copias' | 'offline' | 'audios'

const optimizeImage = (file: File, done: (value: string) => void) => {
  const reader = new FileReader()
  reader.onload = () => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, 160 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
      done(canvas.toDataURL('image/webp', 0.78))
    }
    image.src = String(reader.result)
  }
  reader.readAsDataURL(file)
}

const optimizeFrame = (file: File, done: (value: string) => void) => {
  const reader = new FileReader()
  reader.onload = () => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
      done(canvas.toDataURL('image/webp', 0.68))
    }
    image.src = String(reader.result)
  }
  reader.readAsDataURL(file)
}

interface Props {
  state: FestivalState
  onClose: () => void
  onUpdateEvent: (values: Pick<FestivalState, 'name' | 'organizer' | 'organizerLogo' | 'publicFrame' | 'location' | 'eventDate' | 'startTime' | 'countdownMinutes' | 'breakDurationMinutes' | 'stageCount' | 'showSkaters' | 'playAudio' | 'useHeats'>) => void
  onAddSkater: (skater: Omit<Skater, 'id' | 'status'>) => void
  onImportSkaters: (skaters: Array<Omit<Skater, 'id' | 'status'>>) => void
  onImportEvent: (value: unknown) => void
  onUpdateSkater: (id: string, values: Partial<Skater>) => void
  onMoveSkater: (id: string, stage: Skater['stageNumber'], position: number) => void
  onRemoveSkater: (id: string) => void
  onRenameClub: (from: string, to: string) => void
  onAddClub: (name: string) => void
  onRemoveClub: (name: string) => void
  onUpdateClubLogo: (club: string, logo: string) => void
  onAddTeacher: (name: string, club: string) => void
  onRemoveTeacher: (id: string) => void
  onAddBuffetItem: (name: string, price: number) => void
  onUpdateBuffetItem: (id: string, values: Partial<FestivalState['buffetItems'][number]>) => void
  onRemoveBuffetItem: (id: string) => void
  onSetPublicSectionVisibility: (section: 'showBuffet' | 'showRaffle' | 'useFrameOnBuffet' | 'useFrameOnRaffle', visible: boolean) => void
  onSetRaffleTicketPrice: (price: number) => void
  onAddRafflePrice: (quantity: number, price: number) => void
  onRemoveRafflePrice: (id: string) => void
  onAddRafflePrize: (name: string, order: number) => void
  onUpdateRafflePrize: (id: string, values: Partial<FestivalState['rafflePrizes'][number]>) => void
  onRemoveRafflePrize: (id: string) => void
  savedEvents: SavedEvent[]
  onSaveEvent: () => Promise<boolean>
  onSaveChanges: () => Promise<'saved' | 'offline' | 'error'>
  onRestoreEvent: (id: string) => Promise<boolean>
  onDeleteSavedEvent: (id: string) => Promise<boolean>
  offlineEnabled: boolean
  onSetOfflineMode: (enabled: boolean) => Promise<void>
  onClearAll: () => void
}

export function AdminModal({ state, onClose, onUpdateEvent, onAddSkater, onImportSkaters, onImportEvent, onUpdateSkater, onMoveSkater, onRemoveSkater, onRenameClub, onAddClub, onRemoveClub, onUpdateClubLogo, onAddTeacher, onRemoveTeacher, onAddBuffetItem, onUpdateBuffetItem, onRemoveBuffetItem, onSetPublicSectionVisibility, onAddRafflePrice, onRemoveRafflePrice, onAddRafflePrize, onUpdateRafflePrize, onRemoveRafflePrize, savedEvents, onSaveEvent, onSaveChanges, onRestoreEvent, onDeleteSavedEvent, offlineEnabled, onSetOfflineMode, onClearAll }: Props) {
  const [tab, setTab] = useState<Tab>('evento')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'offline' | 'error'>('idle')
  const clubs = useMemo(() => [...state.clubs].sort(), [state.clubs])
  const saveChanges = async () => { setSaveStatus('saving'); setSaveStatus(await onSaveChanges()) }

  return (
    <div className="admin-backdrop">
      <section className="admin-panel">
        <header className="admin-header"><div><small>CONFIGURACIÓN</small><h2>Administrar festival</h2></div><button onClick={onClose}><X /></button></header>
        <nav className="admin-tabs">
          <button className={tab === 'evento' ? 'selected' : ''} onClick={() => setTab('evento')}><Settings2 /> Evento</button>
          {state.showSkaters && <button className={tab === 'participantes' ? 'selected' : ''} onClick={() => setTab('participantes')}><Users /> Patinadoras</button>}
          <button className={tab === 'pasadas' ? 'selected' : ''} onClick={() => setTab('pasadas')}><Music2 /> Pasadas</button>
          <button className={tab === 'senos' ? 'selected' : ''} onClick={() => setTab('senos')}><Users /> Profes</button>
          <button className={tab === 'clubes' ? 'selected' : ''} onClick={() => setTab('clubes')}><Users /> Clubes</button>
          <button className={tab === 'bufet' ? 'selected' : ''} onClick={() => setTab('bufet')}><ShoppingBasket /> Bufet</button>
          <button className={tab === 'sorteo' ? 'selected' : ''} onClick={() => setTab('sorteo')}><Trophy /> Sorteo</button>
          <button className={tab === 'copias' ? 'selected' : ''} onClick={() => setTab('copias')}><Save /> Copias</button>
          <button className={tab === 'offline' ? 'selected' : ''} onClick={() => setTab('offline')}><Save /> Sin conexión</button>
          {state.playAudio && <button className={tab === 'audios' ? 'selected' : ''} onClick={() => setTab('audios')}><Headphones /> Audios</button>}
        </nav>
        <div className="admin-content">
          {tab === 'bufet' && <VisibilityToggle checked={state.showBuffet} title="Mostrar Bufet en la web del QR" onChange={visible => onSetPublicSectionVisibility('showBuffet', visible)} />}
          {tab === 'sorteo' && <VisibilityToggle checked={state.showRaffle} title="Mostrar Sorteo en la web del QR" onChange={visible => onSetPublicSectionVisibility('showRaffle', visible)} />}
          {tab === 'bufet' && <VisibilityToggle checked={state.useFrameOnBuffet} title="Usar el marco del QR en Bufet" onChange={visible => onSetPublicSectionVisibility('useFrameOnBuffet', visible)} />}
          {tab === 'sorteo' && <VisibilityToggle checked={state.useFrameOnRaffle} title="Usar el marco del QR en Sorteo" onChange={visible => onSetPublicSectionVisibility('useFrameOnRaffle', visible)} />}
          {tab === 'evento' && <EventForm state={state} onSave={onUpdateEvent} onClearAll={onClearAll} />}
          {state.showSkaters && tab === 'participantes' && <SkaterAdmin state={state} onAdd={onAddSkater} onImport={onImportSkaters} onUpdate={onUpdateSkater} onRemove={onRemoveSkater} />}
          {tab === 'pasadas' && <GeneralAudioAdmin state={state} onAdd={onAddSkater} onUpdate={onUpdateSkater} onRemove={onRemoveSkater} />}
          {tab === 'pasadas' && <PassAdmin state={state} onAdd={onAddSkater} onUpdate={onUpdateSkater} onRemove={onRemoveSkater} />}
          {tab === 'pasadas' && <OrderAdmin state={state} onMove={onMoveSkater} />}
          {tab === 'senos' && <TeacherAdmin state={state} onAdd={onAddTeacher} onRemove={onRemoveTeacher} />}
          {tab === 'clubes' && <ClubAdmin state={state} clubs={clubs} logos={state.clubLogos} onRename={onRenameClub} onAdd={onAddClub} onRemove={onRemoveClub} onLogo={onUpdateClubLogo} />}
          {tab === 'bufet' && <BuffetAdmin state={state} onAdd={onAddBuffetItem} onUpdate={onUpdateBuffetItem} onRemove={onRemoveBuffetItem} />}
          {tab === 'sorteo' && <RaffleAdmin state={state} onAddPrice={onAddRafflePrice} onRemovePrice={onRemoveRafflePrice} onAdd={onAddRafflePrize} onUpdate={onUpdateRafflePrize} onRemove={onRemoveRafflePrize} />}
          {tab === 'copias' && <BackupAdmin state={state} savedEvents={savedEvents} onSave={onSaveEvent} onRestore={onRestoreEvent} onDelete={onDeleteSavedEvent} onImport={onImportEvent} />}
          {tab === 'offline' && <OfflineAdmin enabled={offlineEnabled} onChange={onSetOfflineMode} />}
          {state.playAudio && tab === 'audios' && <AudioAdmin skaters={state.skaters} showSkaters={state.showSkaters} onUpdate={onUpdateSkater} />}
        </div>
        <footer className={`admin-save-bar ${saveStatus}`}>
          <span>{saveStatus === 'saved' ? 'Cambios guardados en la nube.' : saveStatus === 'offline' ? 'Guardado en este equipo. Se sincronizará al volver Internet.' : saveStatus === 'error' ? 'No se pudo guardar. Revisá la conexión.' : 'El guardado automático está activo.'}</span>
          <button type="button" disabled={saveStatus === 'saving'} onClick={() => void saveChanges()}><Save />{saveStatus === 'saving' ? 'GUARDANDO…' : 'GUARDAR CAMBIOS'}</button>
        </footer>
      </section>
    </div>
  )
}

function VisibilityToggle({ checked, title, onChange }: { checked: boolean; title: string; onChange: (visible: boolean) => void }) {
  return <label className="public-visibility"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span><strong>{title}</strong><small>Desmarcalo para ocultar el botón a los espectadores.</small></span></label>
}

function EventForm({ state, onSave, onClearAll }: { state: FestivalState; onSave: Props['onUpdateEvent']; onClearAll: Props['onClearAll'] }) {
  const [values, setValues] = useState({ name: state.name, organizer: state.organizer, organizerLogo: state.organizerLogo, publicFrame: state.publicFrame, location: state.location, eventDate: state.eventDate, startTime: state.startTime, countdownMinutes: state.countdownMinutes, breakDurationMinutes: state.breakDurationMinutes, stageCount: state.stageCount, showSkaters: state.showSkaters, playAudio: state.playAudio, useHeats: state.useHeats })
  const saveTimer = useRef<number | undefined>(undefined)
  const pendingValues = useRef<typeof values | undefined>(undefined)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const commit = (changes: Partial<typeof values>, immediate = false) => {
    const next = { ...values, ...changes }
    setValues(next)
    window.clearTimeout(saveTimer.current)
    pendingValues.current = next
    if (immediate) {
      pendingValues.current = undefined
      onSave(next)
      return
    }
    saveTimer.current = window.setTimeout(() => {
      pendingValues.current = undefined
      onSave(next)
    }, 400)
  }
  const submit = (event: FormEvent) => { event.preventDefault(); window.clearTimeout(saveTimer.current); pendingValues.current = undefined; onSave(values) }
  useEffect(() => () => {
    window.clearTimeout(saveTimer.current)
    if (pendingValues.current) onSaveRef.current(pendingValues.current)
  }, [])
  return <form className="admin-form" onSubmit={submit}>
    <div className="admin-intro"><h3>Datos del evento</h3><p>Se actualizan automáticamente en el panel y en la web del QR.</p></div>
    <label>Nombre del evento<input required value={values.name} onChange={event => commit({ name: event.target.value })} /></label>
    <div className="organizer-admin"><div className="organizer-logo-preview">{values.organizerLogo ? <img src={values.organizerLogo} alt="Escudo del club organizador" /> : values.organizer.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()}</div><label>Club organizador<input required value={values.organizer} onChange={event => commit({ organizer: event.target.value })} /></label><label className="file-btn">{values.organizerLogo ? 'Cambiar escudo' : 'Cargar escudo'}<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) optimizeImage(file, organizerLogo => commit({ organizerLogo })) }} /></label></div>
    <div className="public-frame-admin"><div className="public-frame-preview">{values.publicFrame ? <img src={values.publicFrame} alt="Vista previa del marco público" /> : <span>Sin imagen</span>}</div><div><strong>Marco de la web del QR</strong><small>Se muestra como fondo alrededor del contenido en la página pública.</small><div className="public-frame-actions"><label className="file-btn">{values.publicFrame ? 'Cambiar imagen' : 'Cargar imagen'}<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) optimizeFrame(file, publicFrame => commit({ publicFrame })) }} /></label>{values.publicFrame && <button type="button" onClick={() => commit({ publicFrame: '' })}>Quitar marco</button>}</div></div></div>
    <label>Ubicación<input required placeholder="Ciudad, provincia" value={values.location} onChange={event => commit({ location: event.target.value })} /></label>
    <div className="event-date-grid"><label>Día<input type="date" required value={values.eventDate} onChange={event => commit({ eventDate: event.target.value }, true)} /></label><label>Hora de inicio<input type="time" required value={values.startTime} onChange={event => commit({ startTime: event.target.value }, true)} /></label><label>Aviso previo (min)<input type="number" min="0" value={values.countdownMinutes} onChange={event => commit({ countdownMinutes: Number(event.target.value) })} /></label></div>
    <label className="public-visibility"><input type="checkbox" checked={values.showSkaters} onChange={event => commit({ showSkaters: event.target.checked })} /><span><strong>Mostrar patinadoras</strong><small>Desmarcado: desaparecen nombres, números, listados y controles de patinadoras en operador y QR. Los datos no se borran.</small></span></label>
    <label className="public-visibility"><input type="checkbox" checked={values.playAudio} onChange={event => commit({ playAudio: event.target.checked })} /><span><strong>Reproducir música desde el sistema</strong><small>Desmarcado: se ocultan el reproductor, el control previo y la administración de audios. Las canciones cargadas no se borran.</small></span></label>
    <label>Cantidad de partes<select value={values.stageCount} onChange={event => commit({ stageCount: Number(event.target.value) as FestivalState['stageCount'] })}><option value="1">1 parte</option><option value="2">2 partes</option><option value="3">3 partes</option></select><small className="field-help">Se aplica a las pasadas y al historial del evento.</small></label>
    {values.showSkaters && <label className="public-visibility"><input type="checkbox" checked={values.useHeats} onChange={event => commit({ useHeats: event.target.checked })} /><span><strong>Usar tandas</strong><small>Desactivado: todas quedan en Tanda 1.</small></span></label>}
    <label>Duración de cada receso (minutos)<input type="number" min="1" required value={values.breakDurationMinutes} onChange={event => commit({ breakDurationMinutes: Number(event.target.value) })} /><small className="field-help">Se usa para calcular la cuenta regresiva y la hora de finalización.</small></label>
    <button className="primary-save">Guardar cambios</button>
    <div className="danger-zone"><div><strong>Borrar todo el evento</strong><small>Elimina clubes, profes, coreografías, bufet, partes y resultados para comenzar desde cero.</small></div><button type="button" onClick={() => window.confirm('¿Borrar absolutamente todos los datos del evento? Esta acción no se puede deshacer.') && window.confirm('Última confirmación: ¿querés dejar el sistema completamente en blanco?') && onClearAll()}>BORRAR TODO</button></div>
  </form>
}

function SkaterAdmin({ state, onAdd, onImport, onUpdate, onRemove }: { state: FestivalState; onAdd: Props['onAddSkater']; onImport: Props['onImportSkaters']; onUpdate: Props['onUpdateSkater']; onRemove: Props['onRemoveSkater'] }) {
  const empty: Omit<Skater, 'id' | 'status'> = { number: state.skaters.length + 1, firstName: '', lastName: '', club: '', category: '', track: '', duration: 180, heat: 'Tanda 1', stageNumber: 1, notes: '' }
  const [form, setForm] = useState(empty)
  const submit = (event: FormEvent) => { event.preventDefault(); onAdd(form); setForm({ ...empty, number: form.number + 1 }) }
  const importCsv = async (file?: File) => {
    if (!file) return
    try {
      const lines = (await file.text()).replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
      const rows = lines.slice(1).map(line => line.split(';').map(cell => cell.trim().replace(/^"|"$/g, '')))
      rows.forEach((row, index) => validateCsvRow(row, index + 2))
      onImport(rows.map(row => ({ number: Number(row[0]), firstName: row[1], lastName: row[2], club: row[3], category: row[4], stageNumber: Number(row[5]) as Skater['stageNumber'], track: row[6] || 'Sin especificar', duration: Number(row[7]) || 180, heat: state.useHeats ? (row[8] || 'Tanda 1') : 'Tanda 1', notes: '' })))
      window.alert(`${rows.length} patinadoras importadas correctamente.`)
    } catch (error) { window.alert(error instanceof Error ? error.message : 'No se pudo importar el archivo.') }
  }
  return <div>
    <div className="admin-intro"><h3>Patinadoras</h3><p>Marcá quién participa. Si está lesionada, destildala y no se cargará en el evento.</p></div>
    <form className="skater-add" onSubmit={submit}>
      <input aria-label="Número" type="number" required value={form.number} onChange={event => setForm({ ...form, number: Number(event.target.value) })} />
      <input placeholder="Nombre" required value={form.firstName} onChange={event => setForm({ ...form, firstName: event.target.value })} />
      <input placeholder="Apellido" required value={form.lastName} onChange={event => setForm({ ...form, lastName: event.target.value })} />
      <select aria-label="Club" required value={form.club} onChange={event => setForm({ ...form, club: event.target.value })}><option value="">Seleccionar club</option>{state.clubs.map(club => <option key={club}>{club}</option>)}</select>
      <input placeholder="Coreografía" required value={form.track} onChange={event => setForm({ ...form, track: event.target.value })} />
      {state.useHeats && <select value={form.heat} onChange={event => setForm({ ...form, heat: event.target.value })}><option>Tanda 1</option><option>Tanda 2</option><option>Tanda 3</option></select>}
      <select aria-label="Parte" value={form.stageNumber} onChange={event => setForm({ ...form, stageNumber: Number(event.target.value) as Skater['stageNumber'] })}>{Array.from({ length: state.stageCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}º Parte</option>)}</select>
      <button><Plus /> Agregar</button>
    </form>
    <label className="file-btn">Importar CSV<input type="file" accept=".csv,text/csv" onChange={event => void importCsv(event.target.files?.[0])} /></label><small className="field-help">Columnas: número; nombre; apellido; club; categoría; parte; canción; duración; tanda.</small>
    <div className="admin-list">{state.skaters.map(skater => <div className={`admin-skater ${skater.status === 'ABSENT' ? 'not-participating' : ''}`} key={skater.id}><label className="participation-check"><input type="checkbox" checked={skater.status !== 'ABSENT'} disabled={skater.status === 'FINISHED' || skater.status === 'SKATING'} onChange={event => onUpdate(skater.id, { status: event.target.checked ? 'PENDING' : 'ABSENT' })} /><span>Participa</span></label><div><strong>{fullName(skater)}</strong><select aria-label={`Club de ${fullName(skater)}`} value={skater.club} onChange={event => onUpdate(skater.id, { club: event.target.value })}>{state.clubs.map(club => <option key={club}>{club}</option>)}</select></div><input aria-label="Coreografía o canción" value={skater.track} onChange={event => onUpdate(skater.id, { track: event.target.value })} /><select aria-label="Parte" value={skater.stageNumber} onChange={event => onUpdate(skater.id, { stageNumber: Number(event.target.value) as 1 | 2 | 3 })}>{Array.from({ length: state.stageCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}º Parte</option>)}</select><button className="delete-skater" onClick={() => window.confirm(`¿Eliminar a ${fullName(skater)}?`) && onRemove(skater.id)}>Eliminar</button></div>)}</div>
  </div>
}

function orderedStageEntries(state: FestivalState, stage: Skater['stageNumber']) {
  const stageEntries = state.skaters.filter(entry => entry.stageNumber === stage && isEntryEnabled(entry, state.showSkaters))
  const byId = new Map(stageEntries.map(entry => [entry.id, entry]))
  const ordered = (state.stageOrders[stage] ?? []).map(id => byId.get(id)).filter((entry): entry is Skater => Boolean(entry))
  const orderedIds = new Set(ordered.map(entry => entry.id))
  return [...ordered, ...stageEntries.filter(entry => !orderedIds.has(entry.id))]
}

function OrderAdmin({ state, onMove }: { state: FestivalState; onMove: Props['onMoveSkater'] }) {
  const stages = Array.from({ length: state.stageCount }, (_, index) => (index + 1) as Skater['stageNumber'])
  return <div className="order-admin"><div className="admin-intro"><h3>Reacomodar orden</h3><p>Cambiá posición o parte. Las demás pasadas se acomodan automáticamente y el QR se actualiza en vivo.</p></div>{stages.map(stage => { const entries = orderedStageEntries(state, stage); return <section className="order-stage" key={stage}><h4>{stage}º Parte <span>{entries.length} pasadas</span></h4>{entries.map((entry, index) => <div className="order-entry" key={entry.id}><strong>{index + 1}</strong><div><b>{entry.entryType === 'general' ? entry.track : state.showSkaters ? fullName(entry) : entry.club}</b><small>{entry.entryType === 'general' ? 'Audio general' : state.showSkaters ? entry.club : entry.track}</small></div><label><span>Posición</span><select value={index + 1} onChange={event => onMove(entry.id, stage, Number(event.target.value))}>{entries.map((_, position) => <option key={position + 1} value={position + 1}>{position + 1}</option>)}</select></label><label><span>Parte</span><select value={stage} onChange={event => { const targetStage = Number(event.target.value) as Skater['stageNumber']; onMove(entry.id, targetStage, orderedStageEntries(state, targetStage).length + 1) }}>{stages.map(value => <option key={value} value={value}>{value}º Parte</option>)}</select></label></div>)}</section>})}</div>
}

function GeneralAudioAdmin({ state, onAdd, onUpdate, onRemove }: { state: FestivalState; onAdd: Props['onAddSkater']; onUpdate: Props['onUpdateSkater']; onRemove: Props['onRemoveSkater'] }) {
  const [track, setTrack] = useState('')
  const [stageNumber, setStageNumber] = useState<Skater['stageNumber']>(1)
  const entries = state.skaters.filter(item => item.entryType === 'general')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!track.trim()) return
    onAdd({ entryType: 'general', number: state.skaters.length + 1, firstName: 'Audio', lastName: 'general', club: 'Audio general', category: '', track: track.trim(), duration: 180, heat: 'Tanda 1', stageNumber, notes: '' })
    setTrack('')
  }
  return <div><div className="admin-intro"><h3>Audio general / Apertura</h3><p>Agregá música del evento sin vincularla a ningún club. Después cargá el archivo desde Audios.</p></div><form className="teacher-add" onSubmit={submit}><input required placeholder="Nombre del audio, por ejemplo Apertura" value={track} onChange={event => setTrack(event.target.value)} /><select value={stageNumber} onChange={event => setStageNumber(Number(event.target.value) as Skater['stageNumber'])}>{Array.from({ length: state.stageCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}º Parte</option>)}</select><button><Plus /> Agregar audio general</button></form>{entries.length > 0 && <div className="admin-list">{entries.map((entry, index) => <div className="admin-skater" key={entry.id}><b>♫ {index + 1}</b><strong>Audio general</strong><input aria-label="Nombre del audio general" value={entry.track} onChange={event => onUpdate(entry.id, { track: event.target.value })} /><select value={entry.stageNumber} onChange={event => onUpdate(entry.id, { stageNumber: Number(event.target.value) as Skater['stageNumber'] })}>{Array.from({ length: state.stageCount }, (_, stage) => <option key={stage + 1} value={stage + 1}>{stage + 1}º Parte</option>)}</select><button className="delete-skater" onClick={() => onRemove(entry.id)}>Eliminar</button></div>)}</div>}</div>
}

function PassAdmin({ state, onAdd, onUpdate, onRemove }: { state: FestivalState; onAdd: Props['onAddSkater']; onUpdate: Props['onUpdateSkater']; onRemove: Props['onRemoveSkater'] }) {
  const [club, setClub] = useState(state.clubs[0] ?? '')
  const [track, setTrack] = useState('')
  const [stageNumber, setStageNumber] = useState<Skater['stageNumber']>(1)
  const [showOnPublic, setShowOnPublic] = useState(true)
  const passes = state.skaters.filter(item => item.entryType === 'club')
  const submit = (event: FormEvent) => { event.preventDefault(); if (!club || !track.trim()) return; onAdd({ entryType: 'club', number: state.skaters.length + 1, firstName: '', lastName: '', club, category: '', track: track.trim(), duration: 180, heat: 'Tanda 1', stageNumber, showOnPublic, notes: '' }); setTrack('') }
  return <div><div className="admin-intro"><h3>Orden de pasadas</h3><p>Cargá Club, Coreografía/Tema y parte. Elegí si cada pasada se muestra en la web del QR.</p></div><form className="teacher-add pass-add" onSubmit={submit}><select required value={club} onChange={event => setClub(event.target.value)}>{state.clubs.map(item => <option key={item}>{item}</option>)}</select><input required placeholder="Coreografía / Tema" value={track} onChange={event => setTrack(event.target.value)} /><select value={stageNumber} onChange={event => setStageNumber(Number(event.target.value) as Skater['stageNumber'])}>{Array.from({ length: state.stageCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}º Parte</option>)}</select><label className="pass-public-toggle"><input type="checkbox" checked={showOnPublic} onChange={event => setShowOnPublic(event.target.checked)} /><span>Mostrar en QR</span></label><button><Plus /> Agregar pasada</button></form><div className="admin-list">{passes.map((pass, index) => <div className={`admin-skater pass-admin-row${pass.showOnPublic === false ? ' private-pass' : ''}`} key={pass.id}><b>{index + 1}</b><select value={pass.club} onChange={event => onUpdate(pass.id, { club: event.target.value })}>{state.clubs.map(item => <option key={item}>{item}</option>)}</select><input value={pass.track} onChange={event => onUpdate(pass.id, { track: event.target.value })} /><select value={pass.stageNumber} onChange={event => onUpdate(pass.id, { stageNumber: Number(event.target.value) as Skater['stageNumber'] })}>{Array.from({ length: state.stageCount }, (_, stage) => <option key={stage + 1} value={stage + 1}>{stage + 1}º Parte</option>)}</select><label className="pass-public-toggle"><input type="checkbox" checked={pass.showOnPublic !== false} onChange={event => onUpdate(pass.id, { showOnPublic: event.target.checked })} /><span>{pass.showOnPublic === false ? 'Sólo operador' : 'Visible en QR'}</span></label><button className="delete-skater" onClick={() => onRemove(pass.id)}>Eliminar</button></div>)}</div><small className="field-help">Las pasadas ocultas siguen funcionando en el operador, pero no aparecen ni se reproducen visualmente en la web del QR.</small></div>
}

function TeacherAdmin({ state, onAdd, onRemove }: { state: FestivalState; onAdd: Props['onAddTeacher']; onRemove: Props['onRemoveTeacher'] }) {
  const [name, setName] = useState('')
  const [club, setClub] = useState(state.clubs[0] ?? '')
  return <div><div className="admin-intro"><h3>Profes</h3><p>Cargá las profes y vinculalas con un club previamente registrado.</p></div><form className="teacher-add" onSubmit={event => { event.preventDefault(); if (name.trim() && club) { onAdd(name.trim(), club); setName('') } }}><input placeholder="Nombre y apellido de la profe" required value={name} onChange={event => setName(event.target.value)} /><select required value={club} onChange={event => setClub(event.target.value)}><option value="">Seleccionar club</option>{state.clubs.map(item => <option key={item}>{item}</option>)}</select><button><Plus /> Agregar</button></form><div className="teacher-list">{state.teachers.map(teacher => <div key={teacher.id}><span><strong>{teacher.name}</strong><small>{teacher.club}</small></span><button onClick={() => onRemove(teacher.id)}>Eliminar</button></div>)}</div></div>
}

function ClubAdmin({ state, clubs, logos, onRename, onAdd, onRemove, onLogo }: { state: FestivalState; clubs: string[]; logos: Record<string, string>; onRename: Props['onRenameClub']; onAdd: Props['onAddClub']; onRemove: Props['onRemoveClub']; onLogo: Props['onUpdateClubLogo'] }) {
  const [name, setName] = useState('')
  return <div><div className="admin-intro"><h3>Clubes</h3><p>Cargá los clubes y, si querés, agregá su escudo. Para eliminar uno, primero reasigná sus patinadoras y profes.</p></div><form className="club-add" onSubmit={event => { event.preventDefault(); if (name.trim()) { onAdd(name.trim()); setName('') } }}><input placeholder="Nombre del club" required value={name} onChange={event => setName(event.target.value)} /><button><Plus /> Agregar club</button></form><div className="club-list">{clubs.map(club => { const linked = state.skaters.filter(skater => skater.club === club).length + state.teachers.filter(teacher => teacher.club === club).length; return <ClubRow key={club} club={club} logo={logos[club]} linked={linked} onRename={onRename} onRemove={onRemove} onLogo={onLogo} /> })}</div></div>
}

function ClubRow({ club, logo, linked, onRename, onRemove, onLogo }: { club: string; logo?: string; linked: number; onRename: Props['onRenameClub']; onRemove: Props['onRemoveClub']; onLogo: Props['onUpdateClubLogo'] }) {
  const [name, setName] = useState(club)
  const initials = club.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  return <div className="club-admin-row"><div className="club-logo-preview">{logo ? <img src={logo} alt={`Escudo de ${club}`} /> : initials}</div><input value={name} onChange={event => setName(event.target.value)} /><label className="file-btn">{logo ? 'Cambiar escudo' : 'Cargar escudo'}<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) optimizeImage(file, value => onLogo(club, value)) }} /></label><button disabled={!name.trim() || name === club} onClick={() => onRename(club, name.trim())}>Guardar</button><button className="delete-club" disabled={linked > 0} title={linked ? `Tiene ${linked} personas vinculadas` : `Eliminar ${club}`} onClick={() => window.confirm(`¿Eliminar el club ${club}?`) && onRemove(club)}><Trash2 /> <span>{linked ? `${linked} vinculadas` : 'Eliminar'}</span></button></div>
}

function BuffetAdmin({ state, onAdd, onUpdate, onRemove }: { state: FestivalState; onAdd: Props['onAddBuffetItem']; onUpdate: Props['onUpdateBuffetItem']; onRemove: Props['onRemoveBuffetItem'] }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  const productInput = useRef<HTMLInputElement>(null)
  return <div><div className="admin-intro"><h3>Bufet</h3><p>Cargá los productos y precios que verán los espectadores desde el QR.</p></div><form className="buffet-add" onSubmit={event => { event.preventDefault(); if (name.trim() && price > 0) { onAdd(name.trim(), price); setName(''); setPrice(0); window.setTimeout(() => productInput.current?.focus(), 0) } }}><input ref={productInput} placeholder="Producto" required value={name} onChange={event => setName(event.target.value)} /><input aria-label="Precio" type="number" min="1" step="1" required value={price || ''} onChange={event => setPrice(Number(event.target.value))} /><button disabled={!name.trim() || price <= 0}><Plus /> Agregar</button></form><div className="buffet-admin-list">{state.buffetItems.map(item => <div key={item.id}><input value={item.name} onChange={event => onUpdate(item.id, { name: event.target.value })} /><label>$ <input type="number" min="1" value={item.price} onChange={event => { const value = Number(event.target.value); if (value > 0) onUpdate(item.id, { price: value }) }} /></label><button onClick={() => onRemove(item.id)}>Eliminar</button></div>)}</div></div>
}

function RaffleAdmin({ state, onAddPrice, onRemovePrice, onAdd, onUpdate, onRemove }: { state: FestivalState; onAddPrice: Props['onAddRafflePrice']; onRemovePrice: Props['onRemoveRafflePrice']; onAdd: Props['onAddRafflePrize']; onUpdate: Props['onUpdateRafflePrize']; onRemove: Props['onRemoveRafflePrize'] }) {
  const [prize, setPrize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(0)
  const [order, setOrder] = useState(state.rafflePrizes.length + 1)
  return <div><div className="admin-intro"><h3>Sorteo</h3><p>Configurá promociones, premios y publicá cada número ganador.</p></div><form className="raffle-price-add" onSubmit={event => { event.preventDefault(); if (quantity > 0 && price > 0) { onAddPrice(quantity, price); setPrice(0) } }}><label>Cantidad de números<select value={quantity} onChange={event => setQuantity(Number(event.target.value))}>{Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {index ? 'números' : 'número'}</option>)}</select></label><label>Precio total<input type="number" min="1" required value={price || ''} onChange={event => setPrice(Number(event.target.value))} /></label><button>Guardar valor</button></form><div className="raffle-price-list">{state.rafflePrices.map(item => <div key={item.id}><strong>{item.quantity} {item.quantity === 1 ? 'número' : 'números'}</strong><span>{item.price.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}</span><button onClick={() => onRemovePrice(item.id)}>Eliminar</button></div>)}</div><form className="raffle-add" onSubmit={event => { event.preventDefault(); if (prize.trim() && order > 0) { onAdd(prize.trim(), order); setPrize(''); setOrder(current => current + 1) } }}><input className="prize-order" aria-label="Número de premio" type="number" min="1" required value={order} onChange={event => setOrder(Number(event.target.value))} /><input placeholder="Premio (ej.: Canasta de productos)" required value={prize} onChange={event => setPrize(event.target.value)} /><button><Plus /> Agregar premio</button></form><div className="raffle-admin-list">{state.rafflePrizes.map(item => <div key={item.id}><input aria-label="Número de premio" type="number" min="1" value={item.order} onChange={event => onUpdate(item.id, { order: Number(event.target.value) })} /><input aria-label={`Premio ${item.order}`} value={item.name} onChange={event => onUpdate(item.id, { name: event.target.value })} /><input aria-label={`Número ganador del premio ${item.order}`} placeholder="N.º ganador" value={item.winningNumber} onChange={event => onUpdate(item.id, { winningNumber: event.target.value })} /><button onClick={() => onRemove(item.id)}>Eliminar</button></div>)}</div></div>
}

function OfflineAdmin({ enabled, onChange }: { enabled: boolean; onChange: Props['onSetOfflineMode'] }) {
  const [working, setWorking] = useState(false)
  const toggle = async () => { setWorking(true); try { await onChange(!enabled) } finally { setWorking(false) } }
  return <div><div className="admin-intro"><h3>Trabajo sin conexión</h3><p>Prepará este equipo para que el festival continúe aunque se corte Internet.</p></div><section className={`offline-card ${enabled ? 'enabled' : ''}`}><Save /><div><small>{enabled ? 'PROTECCIÓN ACTIVADA' : 'OPCIONAL'}</small><h4>{enabled ? 'Este evento está disponible localmente' : 'Descargar evento en este equipo'}</h4><p>Mientras haya Internet se trabaja normalmente con Supabase. Si se corta, los cambios quedan guardados aquí y se sincronizan automáticamente al regresar la conexión.</p></div><button disabled={working} onClick={() => void toggle()}>{working ? 'Preparando…' : enabled ? 'Desactivar modo local' : 'Descargar evento localmente'}</button></section><div className="offline-notes"><strong>Funcionamiento automático</strong><span>✓ No cambia la forma de usar el panel.</span><span>✓ Conserva las acciones realizadas durante el corte.</span><span>✓ Sincroniza nuevamente cuando vuelve Internet.</span><span>✓ La activación se aplica solamente a este equipo y navegador.</span></div></div>
}

function BackupAdmin({ state, savedEvents, onSave, onRestore, onDelete, onImport }: { state: FestivalState; savedEvents: SavedEvent[]; onSave: Props['onSaveEvent']; onRestore: Props['onRestoreEvent']; onDelete: Props['onDeleteSavedEvent']; onImport: Props['onImportEvent'] }) {
  const [message, setMessage] = useState('')
  const save = async () => setMessage(await onSave() ? 'Copia guardada correctamente en Supabase.' : 'No se pudo guardar la copia.')
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `${state.name || 'evento'}-backup.json`; link.click(); URL.revokeObjectURL(url)
  }
  const load = async (file?: File) => {
    if (!file || !window.confirm('¿Importar esta copia y reemplazar el evento actual?')) return
    try { onImport(JSON.parse(await file.text())); setMessage('Copia local importada correctamente.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Archivo inválido.') }
  }
  return <div><div className="admin-intro"><h3>Copias de seguridad</h3><p>Guardá el evento completo y recuperalo si se borran datos o se modifica algo por error.</p></div><div className="backup-current"><Save /><div><small>EVENTO ACTUAL</small><strong>{state.name || 'Evento sin nombre'}</strong><span>{state.skaters.length} patinadoras · {state.clubs.length} clubes · {state.teachers.length} profes</span></div><button onClick={() => void save()}>Guardar copia ahora</button></div><div className="backup-actions"><button onClick={download}>Descargar JSON</button><label className="file-btn">Importar JSON<input type="file" accept=".json,application/json" onChange={event => void load(event.target.files?.[0])} /></label></div>{message && <p className="backup-message">{message}</p>}<div className="saved-events"><div><strong>Copias guardadas en Supabase</strong><small>No se eliminan cuando usás “Borrar todo”.</small></div>{savedEvents.length ? savedEvents.map(saved => <div className="saved-event-row" key={saved.id}><span><b>{saved.name}</b><small>Guardada: {new Date(saved.savedAt).toLocaleString('es-AR')}</small></span><div className="backup-actions"><button type="button" onClick={() => window.confirm(`¿Restaurar ${saved.name}? Reemplazará el evento actual.`) && void onRestore(saved.id)}>Restaurar copia</button><button className="delete-backup" type="button" onClick={() => window.confirm(`¿Eliminar definitivamente la copia de ${saved.name}? El evento actual no se modificará.`) && void onDelete(saved.id)}>Eliminar copia</button></div></div>) : <p className="backup-empty">Todavía no hay copias guardadas.</p>}</div><div className="saved-events"><div><strong>Actividad reciente</strong><small>Últimos cambios conservados en el evento.</small></div>{state.auditLog.slice(-20).reverse().map(entry => <div className="saved-event-row" key={entry.id}><span><b>{entry.action}</b><small>{new Date(entry.at).toLocaleString('es-AR')} · {entry.detail}</small></span></div>)}</div></div>
}

function AudioAdmin({ skaters, showSkaters, onUpdate }: { skaters: Skater[]; showSkaters: boolean; onUpdate: Props['onUpdateSkater'] }) {
  const select = async (skater: Skater, file?: File) => {
    if (!file) return
    if (!file.type.startsWith('audio/')) { window.alert('Seleccioná un archivo de audio válido.'); return }
    try {
      await navigator.storage?.persist?.()
      await saveTrack(skater.id, file)
      const audioUrl = URL.createObjectURL(file)
      onUpdate(skater.id, { audioName: file.name, audioUrl, audioReady: true })
      const probe = new Audio(audioUrl)
      probe.onloadedmetadata = () => onUpdate(skater.id, { duration: Math.round(probe.duration) || skater.duration })
      probe.onerror = () => window.alert(`${file.name} quedó guardado, pero el navegador no pudo leer su duración. Probá convertirlo a MP3, WAV u OGG.`)
    } catch (error) {
      const quota = error instanceof DOMException && error.name === 'QuotaExceededError'
      window.alert(quota ? 'No queda espacio local para otro audio. Liberá espacio del navegador y volvé a intentar.' : `No se pudo guardar ${file.name} en este equipo.`)
    }
  }
  const remove = async (skater: Skater) => { await removeTrack(skater.id); if (skater.audioUrl) URL.revokeObjectURL(skater.audioUrl); onUpdate(skater.id, { audioName: undefined, audioUrl: undefined, audioReady: false }) }
  return <div><div className="admin-intro"><h3>Canciones</h3><p>Los archivos se guardan de forma persistente en este equipo y nunca se suben a Internet.</p></div><div className="audio-list">{skaters.map(skater => <div key={skater.id}><Music2 /><span><strong>{showSkaters ? fullName(skater) : `${skater.club} · ${skater.track}`}</strong><small>{skater.audioReady ? `✓ ${skater.audioName}` : skater.audioName ? `⚠ No disponible · ${skater.audioName}` : 'Sin archivo asociado'}</small></span><label className="file-btn">Seleccionar<input type="file" accept="audio/*" onChange={event => void select(skater, event.target.files?.[0])} /></label>{skater.audioUrl && <button onClick={() => void new Audio(skater.audioUrl).play()}>Escuchar</button>}{skater.audioName && <button onClick={() => void remove(skater)}>Quitar</button>}</div>)}</div></div>
}
