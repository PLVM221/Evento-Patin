import type { FestivalState, SkaterStatus, StageNumber } from '../models'
import { PUBLIC_STATUSES } from '../models'

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export function validateFestivalData(value: unknown): Partial<FestivalState> {
  if (!isRecord(value)) throw new Error('El archivo no contiene un evento válido.')
  if (value.skaters !== undefined && !Array.isArray(value.skaters)) throw new Error('La lista de patinadoras es inválida.')
  if (value.stageCount !== undefined && ![1, 2, 3].includes(Number(value.stageCount))) throw new Error('La cantidad de etapas debe ser entre 1 y 3.')
  return value as Partial<FestivalState>
}

export function sanitizeStatus(value: unknown): SkaterStatus {
  return PUBLIC_STATUSES.includes(value as SkaterStatus) ? value as SkaterStatus : 'PENDING'
}

export function sanitizeStage(value: unknown, maximum: number): StageNumber {
  return Math.max(1, Math.min(maximum, Number(value) || 1)) as StageNumber
}

export function validateCsvRow(row: string[], line: number) {
  if (row.length < 6) throw new Error(`Fila ${line}: se esperaban 6 columnas.`)
  const number = Number(row[0])
  const stageNumber = Number(row[5])
  if (!Number.isFinite(number) || number <= 0) throw new Error(`Fila ${line}: número inválido.`)
  if (![1, 2, 3].includes(stageNumber)) throw new Error(`Fila ${line}: etapa inválida.`)
}
