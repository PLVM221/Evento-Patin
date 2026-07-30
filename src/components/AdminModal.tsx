import { useMemo, useState, type FormEvent } from 'react'
import { Headphones, Music2, Plus, Settings2, Users, X } from 'lucide-react'
import type { FestivalState, Skater } from '../models'
import { fullName } from '../models'

type Tab = 'evento' | 'participantes' | 'clubes' | 'audios'

interface Props {
  state: FestivalState
  onClose: () => void
  onUpdateEvent: (values: Pick<FestivalState, 'name' | 'organizer' | 'stageCount'>) => void
  onAddSkater: (skater: Omit<Skater, 'id' | 'status'>) => void
  onUpdateSkater: (id: string, values: Partial<Skater>) => void
  onRenameClub: (from: string, to: string) => void
}

export function AdminModal({ state, onClose, onUpdateEvent, onAddSkater, onUpdateSkater, onRenameClub }: Props) {
  const [tab, setTab] = useState<Tab>('evento')
  const clubs = useMemo(() => [...new Set(state.skaters.map(skater => skater.club))].sort(), [state.skaters])

  return (
    <div className="admin-backdrop">
      <section className="admin-panel">
        <header className="admin-header"><div><small>CONFIGURACIÓN</small><h2>Administrar festival</h2></div><button onClick={onClose}><X /></button></header>
        <nav className="admin-tabs">
          <button className={tab === 'evento' ? 'selected' : ''} onClick={() => setTab('evento')}><Settings2 /> Evento</button>
          <button className={tab === 'participantes' ? 'selected' : ''} onClick={() => setTab('participantes')}><Users /> Patinadoras</button>
          <button className={tab === 'clubes' ? 'selected' : ''} onClick={() => setTab('clubes')}><Users /> Clubes</button>
          <button className={tab === 'audios' ? 'selected' : ''} onClick={() => setTab('audios')}><Headphones /> Audios</button>
        </nav>
        <div className="admin-content">
          {tab === 'evento' && <EventForm state={state} onSave={onUpdateEvent} />}
          {tab === 'participantes' && <SkaterAdmin state={state} onAdd={onAddSkater} onUpdate={onUpdateSkater} />}
          {tab === 'clubes' && <ClubAdmin clubs={clubs} onRename={onRenameClub} />}
          {tab === 'audios' && <AudioAdmin skaters={state.skaters} onUpdate={onUpdateSkater} />}
        </div>
      </section>
    </div>
  )
}

function EventForm({ state, onSave }: { state: FestivalState; onSave: Props['onUpdateEvent'] }) {
  const [values, setValues] = useState({ name: state.name, organizer: state.organizer, stageCount: state.stageCount })
  const submit = (event: FormEvent) => { event.preventDefault(); onSave(values) }
  return <form className="admin-form" onSubmit={submit}>
    <div className="admin-intro"><h3>Datos del evento</h3><p>Estos datos aparecen en el panel del operador.</p></div>
    <label>Nombre del evento<input required value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} /></label>
    <label>Club organizador<input required value={values.organizer} onChange={event => setValues({ ...values, organizer: event.target.value })} /></label>
    <label>Cantidad de etapas<select value={values.stageCount} onChange={event => setValues({ ...values, stageCount: Number(event.target.value) as FestivalState['stageCount'] })}><option value="1">1 etapa</option><option value="2">2 etapas</option><option value="3">3 etapas</option></select><small className="field-help">Se aplica a las pasadas y al historial de cada patinadora.</small></label>
    <button className="primary-save">Guardar cambios</button>
  </form>
}

function SkaterAdmin({ state, onAdd, onUpdate }: { state: FestivalState; onAdd: Props['onAddSkater']; onUpdate: Props['onUpdateSkater'] }) {
  const empty = { number: state.skaters.length + 1, firstName: '', lastName: '', club: '', category: '', track: '', duration: 180, heat: 'Tanda 1', notes: '' }
  const [form, setForm] = useState(empty)
  const submit = (event: FormEvent) => { event.preventDefault(); onAdd(form); setForm({ ...empty, number: form.number + 1 }) }
  return <div>
    <div className="admin-intro"><h3>Patinadoras</h3><p>Alta rápida y edición directa del listado.</p></div>
    <form className="skater-add" onSubmit={submit}>
      <input aria-label="Número" type="number" required value={form.number} onChange={event => setForm({ ...form, number: Number(event.target.value) })} />
      <input placeholder="Nombre" required value={form.firstName} onChange={event => setForm({ ...form, firstName: event.target.value })} />
      <input placeholder="Apellido" required value={form.lastName} onChange={event => setForm({ ...form, lastName: event.target.value })} />
      <input placeholder="Club" required value={form.club} onChange={event => setForm({ ...form, club: event.target.value })} />
      <input placeholder="Tema musical" required value={form.track} onChange={event => setForm({ ...form, track: event.target.value })} />
      <select value={form.heat} onChange={event => setForm({ ...form, heat: event.target.value })}><option>Tanda 1</option><option>Tanda 2</option><option>Tanda 3</option></select>
      <button><Plus /> Agregar</button>
    </form>
    <div className="admin-list">{state.skaters.map(skater => <div className="admin-skater" key={skater.id}><b>{skater.number}</b><div><strong>{fullName(skater)}</strong><small>{skater.club}</small></div><input aria-label="Tema" value={skater.track} onChange={event => onUpdate(skater.id, { track: event.target.value })} /><select value={skater.heat} onChange={event => onUpdate(skater.id, { heat: event.target.value })}><option>Tanda 1</option><option>Tanda 2</option><option>Tanda 3</option></select></div>)}</div>
  </div>
}

function ClubAdmin({ clubs, onRename }: { clubs: string[]; onRename: Props['onRenameClub'] }) {
  return <div><div className="admin-intro"><h3>Clubes</h3><p>Renombrar actualiza todas sus patinadoras.</p></div><div className="club-list">{clubs.map(club => <ClubRow key={club} club={club} onRename={onRename} />)}</div></div>
}

function ClubRow({ club, onRename }: { club: string; onRename: Props['onRenameClub'] }) {
  const [name, setName] = useState(club)
  return <div><input value={name} onChange={event => setName(event.target.value)} /><button disabled={!name.trim() || name === club} onClick={() => onRename(club, name.trim())}>Guardar</button></div>
}

function AudioAdmin({ skaters, onUpdate }: { skaters: Skater[]; onUpdate: Props['onUpdateSkater'] }) {
  return <div><div className="admin-intro"><h3>Canciones</h3><p>Seleccioná un archivo del equipo. Se reproduce localmente y nunca se sube a Internet.</p></div><div className="audio-list">{skaters.map(skater => <div key={skater.id}><Music2 /><span><strong>{fullName(skater)}</strong><small>{skater.audioName || 'Sin archivo asociado'}</small></span><label className="file-btn">Seleccionar<input type="file" accept="audio/*" onChange={event => { const file = event.target.files?.[0]; if (file) onUpdate(skater.id, { audioName: file.name, audioUrl: URL.createObjectURL(file) }) }} /></label>{skater.audioUrl && <button onClick={() => void new Audio(skater.audioUrl).play()}>Escuchar</button>}</div>)}</div></div>
}
