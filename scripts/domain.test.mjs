import test from 'node:test'
import assert from 'node:assert/strict'
import { audioPreflight, estimateFinish, rebaseRevision, shouldApplyRemoteRevision } from '../src/lib/operations.mjs'

const state = {
  currentStage: 1,
  skaters: [
    { stageNumber: 1, status: 'FINISHED', duration: 120, audioReady: true },
    { stageNumber: 1, status: 'READY', duration: 180, audioReady: true },
    { stageNumber: 1, status: 'PENDING', duration: 120, audioReady: false },
    { stageNumber: 2, status: 'PENDING', duration: 999, audioReady: true },
  ],
}

test('estima sólo las participantes restantes de la etapa actual', () => {
  const base = new Date('2026-07-31T12:00:00Z')
  assert.equal(estimateFinish(state, base).toISOString(), '2026-07-31T12:06:30.000Z')
})

test('preflight ignora finalizadas y ausentes', () => {
  assert.deepEqual(audioPreflight(state), { ready: 2, total: 3, complete: false })
})

test('preflight revisa el modo activo y siempre incluye audios generales', () => {
  const entries = {
    showSkaters: false,
    skaters: [
      { entryType: 'skater', status: 'PENDING', audioReady: false },
      { entryType: 'club', status: 'PENDING', audioReady: true },
      { entryType: 'general', status: 'PENDING', audioReady: false },
    ],
  }
  assert.deepEqual(audioPreflight(entries), { ready: 1, total: 2, complete: false })
})

test('autosave rebasa cambios agrupados sin saltar revisiones remotas', () => {
  let confirmed = 7
  const localBurst = [{ revision: 8, value: 'a' }, { revision: 11, value: 'd' }]
  const persisted = localBurst.map(candidate => {
    const rebased = rebaseRevision(candidate, confirmed)
    confirmed = rebased.revision
    return rebased
  })
  assert.deepEqual(persisted.map(item => item.revision), [8, 9])
  assert.equal(persisted[1].value, 'd')
})

test('sincronizacion remota no pisa estado local mas nuevo', () => {
  assert.equal(shouldApplyRemoteRevision(12, 11), false)
  assert.equal(shouldApplyRemoteRevision(12, 12), true)
  assert.equal(shouldApplyRemoteRevision(12, 13), true)
})
