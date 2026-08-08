export type SkaterStatus = 'PENDING' | 'READY' | 'SKATING' | 'FINISHED' | 'ABSENT' | 'POSTPONED'
export type StageNumber = 1 | 2 | 3

export interface Teacher {
  id: string
  name: string
  club: string
}

export interface BuffetItem {
  id: string
  name: string
  price: number
}

export interface RafflePrize {
  id: string
  order: number
  name: string
  winningNumber: string
}

export interface RafflePrice {
  id: string
  quantity: number
  price: number
}

export interface SavedEvent {
  id: string
  name: string
  savedAt: string
}

export interface AuditEntry {
  id: string
  at: string
  action: string
  detail: string
}

export interface Skater {
  id: string
  entryType?: 'skater' | 'club' | 'general'
  number: number
  firstName: string
  lastName: string
  club: string
  category: string
  track: string
  duration: number
  heat: string
  status: SkaterStatus
  stageNumber: StageNumber
  showOnPublic?: boolean
  stageResults?: Partial<Record<StageNumber, SkaterStatus>>
  notes?: string
  /** Runtime-only URL reconstructed from the durable IndexedDB audio blob. */
  audioUrl?: string
  audioName?: string
  audioReady?: boolean
}

export interface FestivalState {
  schemaVersion: number
  revision: number
  name: string
  organizer: string
  organizerLogo: string
  publicFrame: string
  location: string
  eventDate: string
  startTime: string
  countdownMinutes: number
  breakDurationMinutes: number
  activeBreakAfter?: StageNumber
  breakEndsAt?: string
  stageCount: StageNumber
  showSkaters: boolean
  playAudio: boolean
  useHeats: boolean
  currentStage: StageNumber
  completedStages: StageNumber[]
  stageOrders: Partial<Record<StageNumber, string[]>>
  started: boolean
  actualStartedAt?: string
  clubs: string[]
  clubLogos: Record<string, string>
  teachers: Teacher[]
  buffetItems: BuffetItem[]
  showBuffet: boolean
  showRaffle: boolean
  useFrameOnBuffet: boolean
  useFrameOnRaffle: boolean
  raffleTicketPrice: number
  rafflePrices: RafflePrice[]
  rafflePrizes: RafflePrize[]
  skaters: Skater[]
  activeId?: string
  elapsed: number
  musicVolume: number
  effectsVolume: number
  auditLog: AuditEntry[]
}

export const PUBLIC_STATUSES: SkaterStatus[] = ['PENDING', 'READY', 'SKATING', 'FINISHED', 'ABSENT', 'POSTPONED']

export const canTransitionStatus = (from: SkaterStatus, to: SkaterStatus) => {
  if (from === to) return true
  const allowed: Record<SkaterStatus, SkaterStatus[]> = {
    PENDING: ['READY', 'ABSENT', 'POSTPONED'],
    READY: ['SKATING', 'PENDING', 'ABSENT', 'POSTPONED'],
    SKATING: ['FINISHED', 'READY'],
    FINISHED: [],
    ABSENT: ['PENDING', 'POSTPONED'],
    POSTPONED: ['PENDING', 'READY', 'ABSENT'],
  }
  return allowed[from].includes(to)
}

export const fullName = (skater: Skater) => `${skater.firstName} ${skater.lastName}`

export const isEntryEnabled = (skater: Pick<Skater, 'entryType'>, showSkaters: boolean) =>
  skater.entryType === 'general' || (showSkaters ? skater.entryType !== 'club' : skater.entryType === 'club')

export const isEntryVisibleOnPublic = (skater: Pick<Skater, 'showOnPublic'>) => skater.showOnPublic !== false

export const formatTime = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds))
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`
}
