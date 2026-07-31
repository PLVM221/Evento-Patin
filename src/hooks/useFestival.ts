import { useCallback, useEffect, useRef, useState } from 'react'
import { initialFestival } from '../data/demo'
import { supabase } from '../lib/supabase'
import type { FestivalState, SavedEvent, SkaterStatus, StageNumber } from '../models'

const STORAGE_KEY = 'pista-festival-state-v1'
const OFFLINE_ENABLED_KEY = 'pista-offline-enabled-v1'
const OFFLINE_DIRTY_KEY = 'pista-offline-dirty-v1'

const normalize = (parsed: Partial<FestivalState> & { stage?: string; firstStageCompleted?: boolean }): FestivalState => ({
      ...initialFestival,
      ...parsed,
      organizerLogo: parsed.organizerLogo ?? '',
      publicFrame: parsed.publicFrame ?? '',
      stageCount: parsed.stageCount ?? 2,
      currentStage: parsed.currentStage ?? (parsed.stage === 'Segunda etapa' ? 2 : 1),
      completedStages: parsed.completedStages ?? (parsed.firstStageCompleted ? [1] : []),
      stageOrders: parsed.stageOrders ?? {},
      breakDurationMinutes: parsed.breakDurationMinutes ?? 20,
      clubs: parsed.clubs ?? [...new Set((parsed.skaters ?? initialFestival.skaters).map((skater: FestivalState['skaters'][number]) => skater.club))],
      clubLogos: parsed.clubLogos ?? {},
      teachers: parsed.teachers ?? [],
      buffetItems: parsed.buffetItems ?? [],
      showBuffet: parsed.showBuffet ?? true,
      showRaffle: parsed.showRaffle ?? true,
      useFrameOnBuffet: parsed.useFrameOnBuffet ?? true,
      useFrameOnRaffle: parsed.useFrameOnRaffle ?? true,
      raffleTicketPrice: parsed.raffleTicketPrice ?? 0,
      rafflePrices: parsed.rafflePrices ?? (parsed.raffleTicketPrice ? [{ id: 'legacy-price', quantity: 1, price: parsed.raffleTicketPrice }] : []),
      rafflePrizes: (parsed.rafflePrizes ?? []).map((prize, index) => ({ ...prize, order: Number(prize.order) > 0 ? Number(prize.order) : index + 1 })),
      skaters: (parsed.skaters ?? initialFestival.skaters).map((skater: FestivalState['skaters'][number] & { firstStageStatus?: SkaterStatus }) => ({
        ...skater,
        stageNumber: skater.stageNumber ?? 1,
        stageResults: skater.stageResults ?? (skater.firstStageStatus ? { 1: skater.firstStageStatus } : {}),
      })),
})

const restore = (): FestivalState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return initialFestival
    return normalize(JSON.parse(saved))
  } catch {
    return initialFestival
  }
}

export function useFestival() {
  const [state, setState] = useState<FestivalState>(restore)
  const [databaseStatus, setDatabaseStatus] = useState<'connecting' | 'saving' | 'saved' | 'offline' | 'error'>(navigator.onLine ? 'connecting' : 'offline')
  const [offlineEnabled, setOfflineEnabled] = useState(() => localStorage.getItem(OFFLINE_ENABLED_KEY) === 'true')
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([])
  const readOnly = new URLSearchParams(window.location.search).has('publico')
  const history = useRef<FestivalState[]>([])
  const initialState = useRef(state)
  const applyingRemote = useRef(false)
  const pendingSave = useRef<FestivalState | null>(null)
  const saving = useRef(false)

  const loadSavedEvents = useCallback(async () => {
    if (readOnly) return
    const { data } = await supabase.from('festival_state').select('id,data,updated_at').like('id', 'saved-%').order('updated_at', { ascending: false })
    setSavedEvents((data ?? []).map(row => ({ id: row.id, name: String((row.data as { name?: string })?.name || 'Evento sin nombre'), savedAt: row.updated_at })))
  }, [readOnly])

  const persist = useCallback((next: FestivalState) => {
    if (readOnly) return
    pendingSave.current = next
    if (!navigator.onLine && offlineEnabled) {
      localStorage.setItem(OFFLINE_DIRTY_KEY, 'true')
      setDatabaseStatus('offline')
      return
    }
    if (saving.current) return
    const flush = async () => {
      saving.current = true
      setDatabaseStatus('saving')
      while (pendingSave.current) {
        const candidate = pendingSave.current
        pendingSave.current = null
        const { error } = await supabase.from('festival_state').upsert({ id: 'current', data: candidate, updated_at: new Date().toISOString() })
        if (error) {
          pendingSave.current = candidate
          if (offlineEnabled) localStorage.setItem(OFFLINE_DIRTY_KEY, 'true')
          setDatabaseStatus('error')
          saving.current = false
          return
        }
      }
      saving.current = false
      localStorage.removeItem(OFFLINE_DIRTY_KEY)
      setDatabaseStatus('saved')
    }
    void flush()
  }, [readOnly, offlineEnabled])

  const setOfflineMode = useCallback(async (enabled: boolean) => {
    setOfflineEnabled(enabled)
    localStorage.setItem(OFFLINE_ENABLED_KEY, String(enabled))
    if (!('serviceWorker' in navigator)) return
    if (enabled) {
      await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}offline-sw.js`, { scope: import.meta.env.BASE_URL })
    } else {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.filter(item => item.scope.includes(import.meta.env.BASE_URL)).map(item => item.unregister()))
      await caches.delete('pista-offline-v1')
      localStorage.removeItem(OFFLINE_DIRTY_KEY)
    }
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!readOnly && offlineEnabled && localStorage.getItem(OFFLINE_DIRTY_KEY) === 'true' && navigator.onLine) {
        const local = localStorage.getItem(STORAGE_KEY)
        if (local) {
          const { error: syncError } = await supabase.from('festival_state').upsert({ id: 'current', data: normalize(JSON.parse(local)), updated_at: new Date().toISOString() })
          if (!syncError) { localStorage.removeItem(OFFLINE_DIRTY_KEY); pendingSave.current = null }
        }
      }
      const { data, error } = await supabase.from('festival_state').select('data').eq('id', 'current').maybeSingle()
      if (!active) return
      if (!error && data?.data && (readOnly || (!saving.current && !pendingSave.current))) {
        applyingRemote.current = true
        setState(normalize(data.data as Partial<FestivalState>))
      } else if (!error && !readOnly) {
        await supabase.from('festival_state').upsert({ id: 'current', data: initialState.current, updated_at: new Date().toISOString() })
      }
      setDatabaseStatus(!navigator.onLine && offlineEnabled ? 'offline' : error ? 'error' : 'saved')
    }
    void load()
    void loadSavedEvents()
    const poll = readOnly ? window.setInterval(() => void load(), 5000) : undefined
    const channel = supabase.channel('festival-state-live').on('postgres_changes', { event: '*', schema: 'public', table: 'festival_state', filter: 'id=eq.current' }, payload => {
      const row = payload.new as { data?: Partial<FestivalState> }
      if (row.data && (readOnly || (!saving.current && !pendingSave.current))) {
        applyingRemote.current = true
        setState(normalize(row.data))
      }
    }).subscribe()
    const resume = () => { if (document.visibilityState === 'visible') void load() }
    const reconnect = () => void load()
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('pageshow', resume)
    window.addEventListener('focus', resume)
    window.addEventListener('online', reconnect)
    window.addEventListener('offline', reconnect)
    return () => { active = false; if (poll) window.clearInterval(poll); document.removeEventListener('visibilitychange', resume); window.removeEventListener('pageshow', resume); window.removeEventListener('focus', resume); window.removeEventListener('online', reconnect); window.removeEventListener('offline', reconnect); void supabase.removeChannel(channel) }
  }, [readOnly, loadSavedEvents, offlineEnabled])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    if (applyingRemote.current) { applyingRemote.current = false; return }
  }, [state])

  const update = useCallback((recipe: (current: FestivalState) => FestivalState) => {
    setState(current => {
      history.current = [...history.current.slice(-19), current]
      const next = recipe(current)
      if (next !== current) persist(next)
      return next
    })
  }, [persist])

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
    activeBreakAfter: undefined,
    breakEndsAt: undefined,
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
    return { ...current, currentStage: nextStage, started: true, activeBreakAfter: undefined, breakEndsAt: undefined, elapsed: 0, activeId: first?.id, skaters: ordered.map(skater => skater.stageNumber === nextStage ? ({ ...skater, status: skater.id === first?.id ? 'SKATING' : skater.status === 'ABSENT' ? 'ABSENT' : 'PENDING' }) : skater) }
  })

  const startBreak = (afterStage: StageNumber) => update(current => current.completedStages.includes(afterStage) && current.currentStage === afterStage && !current.started ? ({ ...current, activeBreakAfter: afterStage, breakEndsAt: new Date(Date.now() + current.breakDurationMinutes * 60000).toISOString() }) : current)

  const finishBreak = () => update(current => ({ ...current, activeBreakAfter: undefined, breakEndsAt: undefined }))

  const updateEvent = (values: Pick<FestivalState, 'name' | 'organizer' | 'organizerLogo' | 'publicFrame' | 'location' | 'eventDate' | 'startTime' | 'countdownMinutes' | 'breakDurationMinutes' | 'stageCount'>) =>
    update(current => ({ ...current, ...values, currentStage: Math.min(current.currentStage, values.stageCount) as StageNumber, completedStages: current.completedStages.filter(stage => stage <= values.stageCount) }))

  const addSkater = (skater: Omit<FestivalState['skaters'][number], 'id' | 'status'>) =>
    update(current => ({ ...current, skaters: [...current.skaters, { ...skater, id: crypto.randomUUID(), status: 'PENDING' }] }))

  const updateSkater = (id: string, values: Partial<FestivalState['skaters'][number]>) =>
    update(current => ({ ...current, skaters: current.skaters.map(skater => skater.id === id ? { ...skater, ...values } : skater) }))

  const removeSkater = (id: string) => update(current => ({ ...current, activeId: current.activeId === id ? undefined : current.activeId, stageOrders: Object.fromEntries(Object.entries(current.stageOrders).map(([stage, ids]) => [stage, ids?.filter(item => item !== id)])), skaters: current.skaters.filter(skater => skater.id !== id) }))

  const renameClub = (from: string, to: string) =>
    update(current => { const clubLogos = { ...current.clubLogos }; if (clubLogos[from]) { clubLogos[to] = clubLogos[from]; delete clubLogos[from] }; return { ...current, clubLogos, clubs: current.clubs.map(club => club === from ? to : club), teachers: current.teachers.map(teacher => teacher.club === from ? { ...teacher, club: to } : teacher), skaters: current.skaters.map(skater => skater.club === from ? { ...skater, club: to } : skater) } })

  const addClub = (name: string) => update(current => current.clubs.some(club => club.toLowerCase() === name.toLowerCase()) ? current : ({ ...current, clubs: [...current.clubs, name].sort() }))

  const updateClubLogo = (club: string, logo: string) => update(current => ({ ...current, clubLogos: { ...current.clubLogos, [club]: logo } }))

  const addTeacher = (name: string, club: string) => update(current => ({ ...current, teachers: [...current.teachers, { id: crypto.randomUUID(), name, club }] }))

  const removeTeacher = (id: string) => update(current => ({ ...current, teachers: current.teachers.filter(teacher => teacher.id !== id) }))

  const addBuffetItem = (name: string, price: number) => update(current => ({ ...current, buffetItems: [...current.buffetItems, { id: crypto.randomUUID(), name, price }] }))

  const updateBuffetItem = (id: string, values: Partial<FestivalState['buffetItems'][number]>) => update(current => ({ ...current, buffetItems: current.buffetItems.map(item => item.id === id ? { ...item, ...values } : item) }))

  const removeBuffetItem = (id: string) => update(current => ({ ...current, buffetItems: current.buffetItems.filter(item => item.id !== id) }))

  const setPublicSectionVisibility = (section: 'showBuffet' | 'showRaffle' | 'useFrameOnBuffet' | 'useFrameOnRaffle', visible: boolean) => update(current => ({ ...current, [section]: visible }))

  const setRaffleTicketPrice = (price: number) => update(current => ({ ...current, raffleTicketPrice: Math.max(0, price) }))

  const addRafflePrice = (quantity: number, price: number) => update(current => ({ ...current, rafflePrices: [...current.rafflePrices.filter(item => item.quantity !== quantity), { id: crypto.randomUUID(), quantity, price }].sort((a, b) => a.quantity - b.quantity) }))

  const removeRafflePrice = (id: string) => update(current => ({ ...current, rafflePrices: current.rafflePrices.filter(item => item.id !== id) }))

  const addRafflePrize = (name: string, order: number) => update(current => ({ ...current, rafflePrizes: [...current.rafflePrizes, { id: crypto.randomUUID(), order, name, winningNumber: '' }].sort((a, b) => a.order - b.order) }))

  const updateRafflePrize = (id: string, values: Partial<FestivalState['rafflePrizes'][number]>) => update(current => ({ ...current, rafflePrizes: current.rafflePrizes.map(prize => prize.id === id ? { ...prize, ...values } : prize) }))

  const removeRafflePrize = (id: string) => update(current => ({ ...current, rafflePrizes: current.rafflePrizes.filter(prize => prize.id !== id) }))

  const saveEvent = async () => {
    const id = `saved-${crypto.randomUUID()}`
    const { error } = await supabase.from('festival_state').insert({ id, data: state, updated_at: new Date().toISOString() })
    if (error) { setDatabaseStatus('error'); return false }
    await loadSavedEvents()
    return true
  }

  const restoreEvent = async (id: string) => {
    const { data, error } = await supabase.from('festival_state').select('data').eq('id', id).maybeSingle()
    if (error || !data?.data) { setDatabaseStatus('error'); return false }
    const restored = normalize(data.data as Partial<FestivalState>)
    setState(restored)
    persist(restored)
    return true
  }

  const deleteSavedEvent = async (id: string) => {
    const { error } = await supabase.from('festival_state').delete().eq('id', id).like('id', 'saved-%')
    if (error) { setDatabaseStatus('error'); return false }
    await loadSavedEvents()
    return true
  }

  const clearFestival = () => update(current => ({ ...current, name: '', organizer: '', organizerLogo: '', publicFrame: '', location: '', eventDate: '', startTime: '', countdownMinutes: 30, breakDurationMinutes: 20, stageCount: 1, currentStage: 1, completedStages: [], stageOrders: {}, started: false, activeBreakAfter: undefined, breakEndsAt: undefined, clubs: [], clubLogos: {}, teachers: [], buffetItems: [], showBuffet: false, showRaffle: false, useFrameOnBuffet: true, useFrameOnRaffle: true, raffleTicketPrice: 0, rafflePrices: [], rafflePrizes: [], skaters: [], activeId: undefined, elapsed: 0 }))

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
    if (previous) { setState(previous); persist(previous) }
  }

  return { state, databaseStatus, offlineEnabled, setOfflineMode, savedEvents, saveEvent, restoreEvent, deleteSavedEvent, start, finishAndNext, move, moveToPosition, setStatus, setVolume, reset, completeStage, startNextStage, startBreak, finishBreak, updateEvent, addSkater, updateSkater, removeSkater, renameClub, addClub, updateClubLogo, addTeacher, removeTeacher, addBuffetItem, updateBuffetItem, removeBuffetItem, setPublicSectionVisibility, setRaffleTicketPrice, addRafflePrice, removeRafflePrice, addRafflePrize, updateRafflePrize, removeRafflePrize, clearFestival, undo, canUndo: history.current.length > 0 }
}
