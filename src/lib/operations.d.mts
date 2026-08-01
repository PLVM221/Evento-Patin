import type { FestivalState } from '../models'
export function estimateFinish(state: FestivalState, now?: Date): Date
export function audioPreflight(state: FestivalState): { ready: number; total: number; complete: boolean }
