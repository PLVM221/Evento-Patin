import { useCallback, useEffect, useRef, useState } from 'react'
import { initialFestival } from '../data/demo'
import type { FestivalState, SkaterStatus } from '../models'

const STORAGE_KEY = 'pista-festival-state-v1'

const restore = (): FestivalState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...initialFestival, ...JSON.parse(saved) } : initialFestival
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
    const index = current.skaters.findIndex(skater => skater.id === current.activeId)
    const next = current.skaters.slice(index + 1).find(skater => skater.status === 'PENDING' || skater.status === 'POSTPONED')
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
    const from = current.skaters.findIndex(skater => skater.id === id)
    const to = Math.max(0, Math.min(current.skaters.length - 1, from + offset))
    const skaters = [...current.skaters]
    const [item] = skaters.splice(from, 1)
    skaters.splice(to, 0, item)
    return { ...current, skaters }
  })

  const setVolume = (key: 'musicVolume' | 'effectsVolume', value: number) =>
    update(current => ({ ...current, [key]: value }))

  const reset = () => update(current => ({
    ...current,
    stage: 'Primera etapa',
    firstStageCompleted: false,
    started: false,
    activeId: current.skaters[0]?.id,
    elapsed: 0,
    skaters: current.skaters.map((skater, index) => ({ ...skater, firstStageStatus: undefined, status: index === 0 ? 'READY' : 'PENDING' })),
  }))

  const beginSecondStage = () => update(current => {
    const eligible = current.skaters.filter(skater => skater.status !== 'ABSENT')
    const first = eligible[0]
    return {
      ...current,
      stage: 'Segunda etapa',
      firstStageCompleted: true,
      started: false,
      elapsed: 0,
      activeId: first?.id,
      skaters: current.skaters.map(skater => ({
        ...skater,
        firstStageStatus: skater.status,
        status: skater.id === first?.id ? 'READY' : skater.status === 'ABSENT' ? 'ABSENT' : 'PENDING',
      })),
    }
  })

  const updateEvent = (values: Pick<FestivalState, 'name' | 'organizer' | 'stage'>) =>
    update(current => ({ ...current, ...values }))

  const addSkater = (skater: Omit<FestivalState['skaters'][number], 'id' | 'status'>) =>
    update(current => ({ ...current, skaters: [...current.skaters, { ...skater, id: crypto.randomUUID(), status: 'PENDING' }] }))

  const updateSkater = (id: string, values: Partial<FestivalState['skaters'][number]>) =>
    update(current => ({ ...current, skaters: current.skaters.map(skater => skater.id === id ? { ...skater, ...values } : skater) }))

  const renameClub = (from: string, to: string) =>
    update(current => ({ ...current, skaters: current.skaters.map(skater => skater.club === from ? { ...skater, club: to } : skater) }))

  const undo = () => {
    const previous = history.current.pop()
    if (previous) setState(previous)
  }

  return { state, start, finishAndNext, move, setStatus, setVolume, reset, beginSecondStage, updateEvent, addSkater, updateSkater, renameClub, undo, canUndo: history.current.length > 0 }
}
