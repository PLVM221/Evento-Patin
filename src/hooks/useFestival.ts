import { useCallback, useEffect, useRef, useState } from 'react'
import { initialFestival } from '../data/demo'
import type { FestivalState, SkaterStatus, StageNumber } from '../models'

const STORAGE_KEY = 'pista-festival-state-v1'

const restore = (): FestivalState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return initialFestival
    const parsed = JSON.parse(saved)
    return {
      ...initialFestival,
      ...parsed,
      stageCount: parsed.stageCount ?? 2,
      currentStage: parsed.currentStage ?? (parsed.stage === 'Segunda etapa' ? 2 : 1),
      completedStages: parsed.completedStages ?? (parsed.firstStageCompleted ? [1] : []),
      stageOrders: parsed.stageOrders ?? {},
      skaters: (parsed.skaters ?? initialFestival.skaters).map((skater: FestivalState['skaters'][number] & { firstStageStatus?: SkaterStatus }) => ({
        ...skater,
        stageNumber: skater.stageNumber ?? 1,
        stageResults: skater.stageResults ?? (skater.firstStageStatus ? { 1: skater.firstStageStatus } : {}),
      })),
    }
  } catch {
    return initialFestival
  }
}

export function useFestival() {
  const [state, setState] = useState<FestivalState>(restore)
  const history = useRef<FestivalState[]>([])

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state])

  const update = useCallback((recipe: (current: FestivalState) => FestivalState) => {
    setState(current => {
      history.current = [...history.current.slice(-19), current]
      return recipe(current)
    })
  }, [])

  const setStatus = (id: string, status: SkaterStatus) => update(current => ({
    ...current,
    activeId: status === 'READY' || status === 'SKATING' ? id : current.activeId,
    skaters: current.skaters.map(skater => skater.id === id ? { ...skater, status } : skater),
  }))

  const start = () => update(current => ({
    ...current,
    started: true,
    skaters: current.skaters.map(skater => skater.id === current.activeId ? { ...skater, status: 'SKATING' } : skater),
  }))

  const finishAndNext = () => update(current => {
    if (!current.started) return current
    const index = current.skaters.findIndex(skater => skater.id === current.activeId)
    const next = current.skaters.slice(index + 1).find(skater => skater.stageNumber === current.currentStage && (skater.status === 'PENDING' || skater.status === 'POSTPONED'))
    return {
      ...current,
      activeId: next?.id,
      elapsed: 0,
      skaters: current.skaters.map(skater => {
        if (skater.id === current.activeId) return { ...skater, status: 'FINISHED' }
        if (skater.id === next?.id) return { ...skater, status: 'READY' }
        return skater
      }),
    }
  })

  const move = (id: string, offset: number) => update(current => {
    if (id === current.activeId) return current
    const selected = current.skaters.find(skater => skater.id === id)
    if (!selected) return current
    const stageSkaters = current.skaters.filter(skater => skater.stageNumber === selected.stageNumber)
    const stageIndex = stageSkaters.findIndex(skater => skater.id === id)
    const target = stageSkaters[Math.max(0, Math.min(stageSkaters.length - 1, stageIndex + offset))]
    if (!target || target.id === id) return current
    const from = current.skaters.findIndex(skater => skater.id === id)
    const to = current.skaters.findIndex(skater => skater.id === target.id)
    const skaters = [...current.skaters]
    ;[skaters[from], skaters[to]] = [skaters[to], skaters[from]]
    return { ...current, skaters }
  })

  const setVolume = (key: 'musicVolume' | 'effectsVolume', value: number) =>
    update(current => ({ ...current, [key]: value }))

  const reset = () => update(current => ({
    ...current,
    currentStage: 1,
    completedStages: [],
    stageOrders: {},
    started: false,
    activeId: current.skaters.find(skater => skater.stageNumber === 1)?.id,
    elapsed: 0,
    skaters: current.skaters.map(skater => ({ ...skater, stageResults: {}, status: skater.id === current.skaters.find(item => item.stageNumber === 1)?.id ? 'READY' : 'PENDING' })),
  }))

  const completeStage = () => update(current => {
    const finishingStage = current.currentStage
    return {
      ...current,
      completedStages: [...new Set([...current.completedStages, finishingStage])] as StageNumber[],
      stageOrders: { ...current.stageOrders, [finishingStage]: current.skaters.filter(skater => skater.stageNumber === finishingStage).map(skater => skater.id) },
      started: false,
      elapsed: 0,
      activeId: undefined,
      skaters: current.skaters.map(skater => ({
        ...skater,
        stageResults: skater.stageNumber === finishingStage ? { ...skater.stageResults, [finishingStage]: skater.status } : skater.stageResults,
      })),
    }
  })

  const startNextStage = () => update(current => {
    if (current.currentStage >= current.stageCount || !current.completedStages.includes(current.currentStage)) return current
    const nextStage = (current.currentStage + 1) as StageNumber
    const byId = new Map(current.skaters.map(skater => [skater.id, skater]))
    const stageIds = current.skaters.filter(skater => skater.stageNumber === nextStage).map(skater => skater.id)
    const orderedStage = (current.stageOrders[nextStage] ?? stageIds).map(id => byId.get(id)!).filter(Boolean)
    const otherStages = current.skaters.filter(skater => skater.stageNumber !== nextStage)
    const ordered = [...orderedStage, ...otherStages]
    const eligible = orderedStage.filter(skater => skater.status !== 'ABSENT')
    const first = eligible[0]
    return { ...current, currentStage: nextStage, started: true, elapsed: 0, activeId: first?.id, skaters: ordered.map(skater => skater.stageNumber === nextStage ? ({ ...skater, status: skater.id === first?.id ? 'SKATING' : skater.status === 'ABSENT' ? 'ABSENT' : 'PENDING' }) : skater) }
  })

  const updateEvent = (values: Pick<FestivalState, 'name' | 'organizer' | 'location' | 'eventDate' | 'startTime' | 'countdownMinutes' | 'stageCount'>) =>
    update(current => ({ ...current, ...values, currentStage: Math.min(current.currentStage, values.stageCount) as StageNumber, completedStages: current.completedStages.filter(stage => stage <= values.stageCount) }))

  const addSkater = (skater: Omit<FestivalState['skaters'][number], 'id' | 'status'>) =>
    update(current => ({ ...current, skaters: [...current.skaters, { ...skater, id: crypto.randomUUID(), status: 'PENDING' }] }))

  const updateSkater = (id: string, values: Partial<FestivalState['skaters'][number]>) =>
    update(current => ({ ...current, skaters: current.skaters.map(skater => skater.id === id ? { ...skater, ...values } : skater) }))

  const renameClub = (from: string, to: string) =>
    update(current => ({ ...current, skaters: current.skaters.map(skater => skater.club === from ? { ...skater, club: to } : skater) }))

  const moveToPosition = (id: string, stage: StageNumber, position: number) => update(current => {
    const ids = [...(current.stageOrders[stage] ?? current.skaters.filter(skater => skater.stageNumber === stage).map(skater => skater.id))].filter(skaterId => skaterId !== id)
    ids.splice(Math.max(0, Math.min(ids.length, position - 1)), 0, id)
    const byId = new Map(current.skaters.map(skater => [skater.id, skater]))
    const updated = current.skaters.map(skater => skater.id === id ? { ...skater, stageNumber: stage } : skater)
    const others = updated.filter(skater => skater.stageNumber !== stage)
    const ordered = ids.map(skaterId => byId.get(skaterId)).filter(Boolean).map(skater => skater!.id === id ? { ...skater!, stageNumber: stage } : skater!)
    return { ...current, stageOrders: { ...current.stageOrders, [stage]: ids }, skaters: stage === current.currentStage ? [...ordered, ...others] : updated }
  })

  const undo = () => {
    const previous = history.current.pop()
    if (previous) setState(previous)
  }

  return { state, start, finishAndNext, move, moveToPosition, setStatus, setVolume, reset, completeStage, startNextStage, updateEvent, addSkater, updateSkater, renameClub, undo, canUndo: history.current.length > 0 }
}
