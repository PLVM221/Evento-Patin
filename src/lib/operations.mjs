export const estimateFinish = (state, now = new Date()) => {
  const remainingSeconds = state.skaters
    .filter(item => item.stageNumber === state.currentStage && !['FINISHED', 'ABSENT'].includes(item.status))
    .reduce((sum, item) => sum + Math.max(0, item.duration) + 45, 0)
  return new Date(now.getTime() + remainingSeconds * 1000)
}

export const audioPreflight = state => {
  const required = state.skaters.filter(item => !['FINISHED', 'ABSENT'].includes(item.status) && (typeof state.showSkaters !== 'boolean' || item.entryType === 'general' || (state.showSkaters ? item.entryType !== 'club' : item.entryType === 'club')))
  const ready = required.filter(item => item.audioReady).length
  return { ready, total: required.length, complete: ready === required.length }
}
