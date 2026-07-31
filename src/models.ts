export type SkaterStatus = 'PENDING' | 'READY' | 'SKATING' | 'FINISHED' | 'ABSENT' | 'POSTPONED'
export type StageNumber = 1 | 2 | 3

export interface Teacher {
  id: string
  name: string
  club: string
}

export interface Skater {
  id: string
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
  stageResults?: Partial<Record<StageNumber, SkaterStatus>>
  notes?: string
  audioUrl?: string
  audioName?: string
}

export interface FestivalState {
  name: string
  organizer: string
  organizerLogo: string
  location: string
  eventDate: string
  startTime: string
  countdownMinutes: number
  breakDurationMinutes: number
  activeBreakAfter?: StageNumber
  breakEndsAt?: string
  stageCount: StageNumber
  currentStage: StageNumber
  completedStages: StageNumber[]
  stageOrders: Partial<Record<StageNumber, string[]>>
  started: boolean
  clubs: string[]
  clubLogos: Record<string, string>
  teachers: Teacher[]
  skaters: Skater[]
  activeId?: string
  elapsed: number
  musicVolume: number
  effectsVolume: number
}

export const fullName = (skater: Skater) => `${skater.firstName} ${skater.lastName}`

export const formatTime = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds))
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`
}
