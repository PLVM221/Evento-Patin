import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Headphones, Music2, Plus, Save, Settings2, ShoppingBasket, Trophy, Users, X } from 'lucide-react'
import type { FestivalState, SavedEvent, Skater } from '../models'
import { fullName } from '../models'

type Tab = 'evento' | 'participantes' | 'senos' | 'clubes' | 'bufet' | 'sorteo' | 'copias' | 'audios'

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
  onUpdateEvent: (values: Pick<FestivalState, 'name' | 'organizer' | 'organizerLogo' | 'publicFrame' | 'location' | 'eventDate' | 'startTime' | 'countdownMinutes' | 'breakDurationMinutes' | 'stageCount'>) => void
  onAddSkater: (skater: Omit<Skater, 'id' | 'status'>) => void
  onUpdateSkater: (id: string, values: Partial<Skater>) => void
  onRemoveSkater: (id: string) => void
  onRenameClub: (from: string, to: string) => void
  onAddClub: (name: string) => void
  onUpdateClubLogo: (club: string, logo: string) => void
  onAddTeacher: (name: string, club: string) => void
  onRemoveTeacher: (id: string) => void
  onAddBuffetItem: (name: string, price: number) => void
  onUpdateBuffetItem: (id: string, values: Partial<FestivalState['buffetItems'][number]>) => void
  onRemoveBuffetItem: (id: string) => void
  onSetPublicSectionVisibility: (section: 'showBuffet' | 'showRaffle', visible: boolean) => void
  onSetRaffleTicketPrice: (price: number) => void
  onAddRafflePrice: (quantity: number, price: number) => void
  onRemoveRafflePrice: (id: string) => void
  onAddRafflePrize: (name: string, order: number) => void
  onUpdateRafflePrize: (id: string, values: Partial<FestivalState['rafflePrizes'][number]>) => void
  onRemoveRafflePrize: (id: string) => void
  savedEvents: SavedEvent[]
  onSaveEvent: () => Promise<boolean>
  onRestoreEvent: (id: string) => Promise<boolean>
  onClearAll: () => void
}

export function AdminModal({ state, onClose, onUpdateEvent, onAddSkater, onUpdateSkater, onRemoveSkater, onRenameClub, onAddClub, onUpdateClubLogo, onAddTeacher, onRemoveTeacher, onAddBuffetItem, onUpdateBuffetItem, onRemoveBuffetItem, onSetPublicSectionVisibility, onAddRafflePrice, onRemoveRafflePrice, onAddRafflePrize, onUpdateRafflePrize, onRemoveRafflePrize, savedEvents, onSaveEvent, onRestoreEvent, onClearAll }: Props) {
  const [tab, setTab] = useState<Tab>('evento')
  const clubs = useMemo(() => [...state.clubs].sort(), [state.clubs])

  return (
    <div className="admin-backdrop">
      <section className="admin-panel">
        <header className="admin-header"><div><small>CONFIGURACIÓN</small><h2>Administrar festival</h2></div><button onClick={onClose}><X /></button></header>
        <nav className="admin-tabs">
          <button className={tab === 'evento' ? 'selected' : ''} onClick={() => setTab('evento')}><Settings2 /> Evento</button>
          <button className={tab === 'participantes' ? 'selected' : ''} onClick={() => setTab('participantes')}><Users /> Patinadoras</button>
          <button className={tab === 'senos' ? 'selected' : ''} onClick={() => setTab('senos')}><Users /> Seños</button>
          <button className={tab === 'clubes' ? 'selected' : ''} onClick={() => setTab('clubes')}><Users /> Clubes</button>
          <button className={tab === 'bufet' ? 'selected' : ''} onClick={() => setTab('bufet')}><ShoppingBasket /> Bufet</button>
          <button className={tab === 'sorteo' ? 'selected' : ''} onClick={() => setTab('sorteo')}><Trophy /> Sorteo</button>
          <button className={tab === 'copias' ? 'selected' : ''} onClick={() => setTab('copias')}><Save /> Copias</button>
          <button className={tab === 'audios' ? 'selected' : ''} onClick={() => setTab('audios')}><Headphones /> Audios</button>
        </nav>
        <div className="admin-content">
          {tab === 'bufet' && <VisibilityToggle checked={state.showBuffet} title="Mostrar Bufet en la web del QR" onChange={visible => onSetPublicSectionVisibility('showBuffet', visible)} />}
          {tab === 'sorteo' && <VisibilityToggle checked={state.showRaffle} title="Mostrar Sorteo en la web del QR" onChange={visible => onSetPublicSectionVisibility('showRaffle', visible)} />}
          {tab === 'evento' && <EventForm state={state} onSave={onUpdateEvent} onClearAll={onClearAll} />}
          {tab === 'participantes' && <SkaterAdmin state={state} onAdd={onAddSkater} onUpdate={onUpdateSkater} onRemove={onRemoveSkater} />}
          {tab === 'senos' && <TeacherAdmin state={state} onAdd={onAddTeacher} onRemove={onRemoveTeacher} />}
          {tab === 'clubes' && <ClubAdmin clubs={clubs} logos={state.clubLogos} onRename={onRenameClub} onAdd={onAddClub} onLogo={onUpdateClubLogo} />}
          {tab === 'bufet' && <BuffetAdmin state={state} onAdd={onAddBuffetItem} onUpdate={onUpdateBuffetItem} onRemove={onRemoveBuffetItem} />}
          {tab === 'sorteo' && <RaffleAdmin state={state} onAddPrice={onAddRafflePrice} onRemovePrice={onRemoveRafflePrice} onAdd={onAddRafflePrize} onUpdate={onUpdateRafflePrize} onRemove={onRemoveRafflePrize} />}
          {tab === 'copias' && <BackupAdmin state={state} savedEvents={savedEvents} onSave={onSaveEvent} onRestore={onRestoreEvent} />}
          {tab === 'audios' && <AudioAdmin skaters={state.skaters} onUpdate={onUpdateSkater} />}
        </div>
      </section>
    </div>
  )
}

function VisibilityToggle({ checked, title, onChange }: { checked: boolean; title: string; onChange: (visible: boolean) => void }) {
  return <label className="public-visibility"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span><strong>{title}</strong><small>Desmarcalo para ocultar el botón a los espectadores.</small></span></label>
}

function EventForm({ state, onSave, onClearAll }: { state: FestivalState; onSave: Props['onUpdateEvent']; onClearAll: Props['onClearAll'] }) {
  const [values, setValues] = useState({ name: state.name, organizer: state.organizer, organizerLogo: state.organizerLogo, publicFrame: state.publicFrame, location: state.location, eventDate: state.eventDate, startTime: state.startTime, countdownMinutes: state.countdownMinutes, breakDurationMinutes: state.breakDurationMinutes, stageCount: state.stageCount })
  const submit = (event: FormEvent) => { event.preventDefault(); onSave(values) }
  return <form className="admin-form" onSubmit={submit}>
    <div className="admin-intro"><h3>Datos del evento</h3><p>Estos datos aparecen en el panel del operador.</p></div>
    <label>Nombre del evento<input required value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} /></label>
    <div className="organizer-admin"><div className="organizer-logo-preview">{values.organizerLogo ? <img src={values.organizerLogo} alt="Escudo del club organizador" /> : values.organizer.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()}</div><label>Club organizador<input required value={values.organizer} onChange={event => setValues({ ...values, organizer: event.target.value })} /></label><label className="file-btn">{values.organizerLogo ? 'Cambiar escudo' : 'Cargar escudo'}<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) optimizeImage(file, organizerLogo => setValues(current => ({ ...current, organizerLogo }))) }} /></label></div>
    <div className="public-frame-admin"><div className="public-frame-preview">{values.publicFrame ? <img src={values.publicFrame} alt="Vista previa del marco público" /> : <span>Sin imagen</span>}</div><div><strong>Marco de la web del QR</strong><small>Se muestra como fondo alrededor del contenido en la página pública.</small><div className="public-frame-actions"><label className="file-btn">{values.publicFrame ? 'Cambiar imagen' : 'Cargar imagen'}<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) optimizeFrame(file, publicFrame => setValues(current => ({ ...current, publicFrame }))) }} /></label>{values.publicFrame && <button type="button" onClick={() => setValues(current => ({ ...current, publicFrame: '' }))}>Quitar marco</button>}</div></div></div>
    <label>Ubicación<input required placeholder="Ciudad, provincia" value={values.location} onChange={event => setValues({ ...values, location: event.target.value })} /></label>
    <div className="event-date-grid"><label>Día<input type="date" required value={values.eventDate} onChange={event => setValues({ ...values, eventDate: event.target.value })} /></label><label>Hora de inicio<input type="time" required value={values.startTime} onChange={event => setValues({ ...values, startTime: event.target.value })} /></label><label>Aviso previo (min)<input type="number" min="0" value={values.countdownMinutes} onChange={event => setValues({ ...values, countdownMinutes: Number(event.target.value) })} /></label></div>
    <label>Cantidad de etapas<select value={values.stageCount} onChange={event => setValues({ ...values, stageCount: Number(event.target.value) as FestivalState['stageCount'] })}><option value="1">1 etapa</option><option value="2">2 etapas</option><option value="3">3 etapas</option></select><small className="field-help">Se aplica a las pasadas y al historial de cada patinadora.</small></label>
    <label>Duración de cada receso (minutos)<input type="number" min="1" required value={values.breakDurationMinutes} onChange={event => setValues({ ...values, breakDurationMinutes: Number(event.target.value) })} /><small className="field-help">Se usa para calcular la cuenta regresiva y la hora de finalización.</small></label>
    <button className="primary-save">Guardar cambios</button>
    <div className="danger-zone"><div><strong>Borrar todo el evento</strong><small>Elimina patinadoras, clubes, seños, bufet, etapas y resultados para comenzar desde cero.</small></div><button type="button" onClick={() => window.confirm('¿Borrar absolutamente todos los datos del evento? Esta acción no se puede deshacer.') && window.confirm('Última confirmación: ¿querés dejar el sistema completamente en blanco?') && onClearAll()}>BORRAR TODO</button></div>
  </form>
}

function SkaterAdmin({ state, onAdd, onUpdate, onRemove }: { state: FestivalState; onAdd: Props['onAddSkater']; onUpdate: Props['onUpdateSkater']; onRemove: Props['onRemoveSkater'] }) {
  const empty: Omit<Skater, 'id' | 'status'> = { number: state.skaters.length + 1, firstName: '', lastName: '', club: '', category: '', track: '', duration: 180, heat: 'Tanda 1', stageNumber: 1, notes: '' }
  const [form, setForm] = useState(empty)
  const submit = (event: FormEvent) => { event.preventDefault(); onAdd(form); setForm({ ...empty, number: form.number + 1 }) }
  return <div>
    <div className="admin-intro"><h3>Patinadoras</h3><p>Alta rápida y edición directa del listado.</p></div>
    <form className="skater-add" onSubmit={submit}>
      <input aria-label="Número" type="number" required value={form.number} onChange={event => setForm({ ...form, number: Number(event.target.value) })} />
      <input placeholder="Nombre" required value={form.firstName} onChange={event => setForm({ ...form, firstName: event.target.value })} />
      <input placeholder="Apellido" required value={form.lastName} onChange={event => setForm({ ...form, lastName: event.target.value })} />
      <select aria-label="Club" required value={form.club} onChange={event => setForm({ ...form, club: event.target.value })}><option value="">Seleccionar club</option>{state.clubs.map(club => <option key={club}>{club}</option>)}</select>
      <input placeholder="Coreografía / canción" required value={form.track} onChange={event => setForm({ ...form, track: event.target.value })} />
      <select value={form.heat} onChange={event => setForm({ ...form, heat: event.target.value })}><option>Tanda 1</option><option>Tanda 2</option><option>Tanda 3</option></select>
      <select aria-label="Etapa" value={form.stageNumber} onChange={event => setForm({ ...form, stageNumber: Number(event.target.value) as Skater['stageNumber'] })}>{Array.from({ length: state.stageCount }, (_, index) => <option key={index + 1} value={index + 1}>Etapa {index + 1}</option>)}</select>
      <button><Plus /> Agregar</button>
    </form>
    <div className="admin-list">{state.skaters.map(skater => <div className="admin-skater" key={skater.id}><b>{skater.number}</b><div><strong>{fullName(skater)}</strong><select aria-label={`Club de ${fullName(skater)}`} value={skater.club} onChange={event => onUpdate(skater.id, { club: event.target.value })}>{state.clubs.map(club => <option key={club}>{club}</option>)}</select></div><input aria-label="Coreografía o canción" value={skater.track} onChange={event => onUpdate(skater.id, { track: event.target.value })} /><select aria-label="Etapa" value={skater.stageNumber} onChange={event => onUpdate(skater.id, { stageNumber: Number(event.target.value) as 1 | 2 | 3 })}>{Array.from({ length: state.stageCount }, (_, index) => <option key={index + 1} value={index + 1}>Etapa {index + 1}</option>)}</select><button className="delete-skater" onClick={() => window.confirm(`¿Eliminar a ${fullName(skater)}?`) && onRemove(skater.id)}>Eliminar</button></div>)}</div>
  </div>
}

function TeacherAdmin({ state, onAdd, onRemove }: { state: FestivalState; onAdd: Props['onAddTeacher']; onRemove: Props['onRemoveTeacher'] }) {
  const [name, setName] = useState('')
  const [club, setClub] = useState(state.clubs[0] ?? '')
  return <div><div className="admin-intro"><h3>Seños</h3><p>Cargá las profesoras y vinculalas con un club previamente registrado.</p></div><form className="teacher-add" onSubmit={event => { event.preventDefault(); if (name.trim() && club) { onAdd(name.trim(), club); setName('') } }}><input placeholder="Nombre y apellido de la seño" required value={name} onChange={event => setName(event.target.value)} /><select required value={club} onChange={event => setClub(event.target.value)}><option value="">Seleccionar club</option>{state.clubs.map(item => <option key={item}>{item}</option>)}</select><button><Plus /> Agregar</button></form><div className="teacher-list">{state.teachers.map(teacher => <div key={teacher.id}><span><strong>{teacher.name}</strong><small>{teacher.club}</small></span><button onClick={() => onRemove(teacher.id)}>Eliminar</button></div>)}</div></div>
}

function ClubAdmin({ clubs, logos, onRename, onAdd, onLogo }: { clubs: string[]; logos: Record<string, string>; onRename: Props['onRenameClub']; onAdd: Props['onAddClub']; onLogo: Props['onUpdateClubLogo'] }) {
  const [name, setName] = useState('')
  return <div><div className="admin-intro"><h3>Clubes</h3><p>Cargá los clubes y, si querés, agregá su escudo. Sin imagen se mostrarán las iniciales.</p></div><form className="club-add" onSubmit={event => { event.preventDefault(); if (name.trim()) { onAdd(name.trim()); setName('') } }}><input placeholder="Nombre del club" required value={name} onChange={event => setName(event.target.value)} /><button><Plus /> Agregar club</button></form><div className="club-list">{clubs.map(club => <ClubRow key={club} club={club} logo={logos[club]} onRename={onRename} onLogo={onLogo} />)}</div></div>
}

function ClubRow({ club, logo, onRename, onLogo }: { club: string; logo?: string; onRename: Props['onRenameClub']; onLogo: Props['onUpdateClubLogo'] }) {
  const [name, setName] = useState(club)
  const initials = club.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  return <div className="club-admin-row"><div className="club-logo-preview">{logo ? <img src={logo} alt={`Escudo de ${club}`} /> : initials}</div><input value={name} onChange={event => setName(event.target.value)} /><label className="file-btn">{logo ? 'Cambiar escudo' : 'Cargar escudo'}<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) optimizeImage(file, value => onLogo(club, value)) }} /></label><button disabled={!name.trim() || name === club} onClick={() => onRename(club, name.trim())}>Guardar</button></div>
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

function BackupAdmin({ state, savedEvents, onSave, onRestore }: { state: FestivalState; savedEvents: SavedEvent[]; onSave: Props['onSaveEvent']; onRestore: Props['onRestoreEvent'] }) {
  const [message, setMessage] = useState('')
  const save = async () => setMessage(await onSave() ? 'Copia guardada correctamente en Supabase.' : 'No se pudo guardar la copia.')
  return <div><div className="admin-intro"><h3>Copias de seguridad</h3><p>Guardá el evento completo y recuperalo si se borran datos o se modifica algo por error.</p></div><div className="backup-current"><Save /><div><small>EVENTO ACTUAL</small><strong>{state.name || 'Evento sin nombre'}</strong><span>{state.skaters.length} patinadoras · {state.clubs.length} clubes · {state.teachers.length} seños</span></div><button onClick={() => void save()}>Guardar copia ahora</button></div>{message && <p className="backup-message">{message}</p>}<div className="saved-events"><div><strong>Copias guardadas en Supabase</strong><small>No se eliminan cuando usás “Borrar todo”.</small></div>{savedEvents.length ? savedEvents.map(saved => <div className="saved-event-row" key={saved.id}><span><b>{saved.name}</b><small>Guardada: {new Date(saved.savedAt).toLocaleString('es-AR')}</small></span><button type="button" onClick={() => window.confirm(`¿Restaurar ${saved.name}? Reemplazará el evento actual.`) && void onRestore(saved.id)}>Restaurar copia</button></div>) : <p className="backup-empty">Todavía no hay copias guardadas.</p>}</div></div>
}

function AudioAdmin({ skaters, onUpdate }: { skaters: Skater[]; onUpdate: Props['onUpdateSkater'] }) {
  return <div><div className="admin-intro"><h3>Canciones</h3><p>Seleccioná un archivo del equipo. Se reproduce localmente y nunca se sube a Internet.</p></div><div className="audio-list">{skaters.map(skater => <div key={skater.id}><Music2 /><span><strong>{fullName(skater)}</strong><small>{skater.audioName || 'Sin archivo asociado'}</small></span><label className="file-btn">Seleccionar<input type="file" accept="audio/*" onChange={event => { const file = event.target.files?.[0]; if (file) onUpdate(skater.id, { audioName: file.name, audioUrl: URL.createObjectURL(file) }) }} /></label>{skater.audioUrl && <button onClick={() => void new Audio(skater.audioUrl).play()}>Escuchar</button>}</div>)}</div></div>
}
