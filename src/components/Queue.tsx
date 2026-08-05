import { ArrowDown, ArrowUp, Download, RotateCcw, UserX } from 'lucide-react'
import type { Skater, SkaterStatus } from '../models'
import { fullName } from '../models'

interface QueueProps {
  skaters: Skater[]
  activeId?: string
  onMove: (id: string, offset: number) => void
  onSelect: (skater: Skater) => void
  onStatus: (id: string, status: SkaterStatus) => void
  onDownload: () => void
}

const statusLabel = { PENDING: 'Pendiente', READY: 'Preparada', SKATING: 'Patinando', FINISHED: 'Finalizada', ABSENT: 'Ausente', POSTPONED: 'Pospuesta' }

export function Queue({ skaters, activeId, onMove, onSelect, onStatus, onDownload }: QueueProps) {
  return (
    <section className="queue card">
      <div className="section-title"><div><span>ORDEN DEL EVENTO</span><strong>{skaters.length} participantes</strong></div><button className="ghost-btn download-list" onClick={onDownload}><Download /> Descargar listado</button></div>
      <div className="queue-head"><span>#</span><span>PARTICIPANTE</span><span>CLUB</span><span>TANDA</span><span>ESTADO</span><span /></div>
      <div className="queue-scroll">
        {skaters.map((skater, index) => (
          <div key={skater.id} className={`queue-row ${skater.id === activeId ? 'active' : ''} ${skater.status === 'FINISHED' ? 'finished' : ''} ${skater.status === 'ABSENT' ? 'absent' : ''}`}>
            <span className="number">{skater.number}</span>
            <button className="person" onClick={() => onSelect(skater)}><strong>{fullName(skater)}</strong><small>{skater.track}</small>{Object.entries(skater.stageResults ?? {}).map(([stage, result]) => <small key={stage} className={`first-stage-result ${result.toLowerCase()}`}>{stage}º Parte: {statusLabel[result]}</small>)}</button>
            <span>{skater.club}</span>
            <span>{skater.heat}</span>
            <span><i className={`status-dot ${skater.status.toLowerCase()}`} />{statusLabel[skater.status]}</span>
            <span className="row-actions">
              <button title="Subir" disabled={skater.id === activeId || index === 0} onClick={() => onMove(skater.id, -1)}><ArrowUp /></button>
              <button title="Bajar" disabled={skater.id === activeId || index === skaters.length - 1} onClick={() => onMove(skater.id, 1)}><ArrowDown /></button>
              {skater.status === 'ABSENT'
                ? <button title="Reactivar" onClick={() => onStatus(skater.id, 'PENDING')}><RotateCcw /></button>
                : <button title="No se presenta" disabled={skater.id === activeId || skater.status === 'FINISHED'} onClick={() => onStatus(skater.id, 'ABSENT')}><UserX /></button>}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
