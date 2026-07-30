export type SkaterStatus = 'PENDING' | 'READY' | 'SKATING' | 'FINISHED' | 'ABSENT' | 'POSTPONED'

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
  firstStageStatus?: SkaterStatus
  notes?: string
  audioUrl?: string
  audioName?: string
}

export interface FestivalState {
  name: string
  organizer: string
  stage: 'Primera etapa' | 'Segunda etapa'
  firstStageCompleted: boolean
  started: boolean
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
