import type {
  CountBy,
  GameSnapshot,
  LevelProgress,
  PlayerState,
  SessionStatistics,
} from '@/domain/progress'

import type { GameResult } from '@/domain/types'

import { computed, ref } from 'vue'

import {
  createPlayerState,
  createSessionStatistics,
  getHighestUnlockedLevelAfterResult,
  getLatestInProgressGame,
  getSnapshotLevelId,
} from '@/domain/progress'
import { loadPlayerState } from '@/storage/playerStateRepository'
import { restorePlayerState } from '@/domain/playerStateMigration'
import { savePlayerState } from '@/storage/playerStateRepository'

const state = ref<PlayerState>(createPlayerState())
const initialized = ref(false)
const storageError = ref<string | null>(null)
let initialization: Promise<void> | null = null
let persistence = Promise.resolve()

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : String(error)
)

const persist = (): Promise<void> => {
  const snapshot = clone(state.value)

  persistence = persistence
    .then(() => savePlayerState(snapshot))
    .catch((error: unknown) => {
      storageError.value = getErrorMessage(error)
    })

  return persistence
}

const restoreStoredState = (storedState: unknown): void => {
  const restoredState = restorePlayerState(storedState)

  if (restoredState) {
    state.value = restoredState
  }
}

const captureStorageError = (error: unknown): void => {
  storageError.value = getErrorMessage(error)
}

const markInitialized = (): void => {
  initialized.value = true
}

export const initializePlayerProgress = (): Promise<void> => {
  if (initialization !== null) {
    return initialization
  }

  initialization = loadPlayerState()
    .then(restoreStoredState)
    .catch(captureStorageError)
    .finally(markInitialized)

  return initialization
}

const addCountDelta = (
  totals: CountBy<string>,
  current: CountBy<string>,
  previous: CountBy<string>
): void => {
  Object.entries(current).forEach(([type, count]) => {
    const delta = Number(count ?? 0) - Number(previous[type] ?? 0)

    totals[type] = Number(totals[type] ?? 0) + Math.max(0, delta)
  })
}

const addSessionDelta = (
  current: SessionStatistics,
  previous = createSessionStatistics()
): void => {
  const totals = state.value.statistics

  totals.turnsPlayed += Math.max(0, current.turnsPlayed - previous.turnsPlayed)
  addCountDelta(totals.boostersUsed, current.boostersUsed, previous.boostersUsed)
  addCountDelta(totals.tilesCollected, current.tilesCollected, previous.tilesCollected)
}

const createAttemptProgress = (
  snapshot: GameSnapshot,
  previous?: LevelProgress
): LevelProgress => ({
  levelId: getSnapshotLevelId(snapshot),
  completed: previous ? previous.completed : false,
  lastResult: previous?.lastResult,
  updatedAt: snapshot.updatedAt,
  attempt: clone(snapshot),
})

export const beginLevelGame = (snapshot: GameSnapshot): Promise<void> => {
  const levelId = getSnapshotLevelId(snapshot)
  const previous = state.value.levels[levelId]

  state.value.statistics.gamesStarted++
  state.value.levels[levelId] = createAttemptProgress(snapshot, previous)

  return persist()
}

export const saveLevelGame = (snapshot: GameSnapshot): Promise<void> => {
  const levelId = getSnapshotLevelId(snapshot)
  const progress = state.value.levels[levelId]
  const previousStatistics = progress?.attempt?.statistics

  addSessionDelta(snapshot.statistics, previousStatistics)
  state.value.levels[levelId] = createAttemptProgress(snapshot, progress)

  return persist()
}

const markGameCompleted = (result: GameResult): void => {
  state.value.statistics.gamesCompleted++
  state.value.statistics[result === 'win' ? 'gamesWon' : 'gamesLost']++
}

const finishLevelProgress = (
  snapshot: GameSnapshot,
  progress: LevelProgress,
  result: GameResult
): void => {
  const levelId = getSnapshotLevelId(snapshot)

  state.value.highestUnlockedLevel = getHighestUnlockedLevelAfterResult(
    state.value.highestUnlockedLevel,
    levelId,
    result
  )
  state.value.levels[levelId] = {
    levelId,
    completed: progress.completed || result === 'win',
    lastResult: result,
    updatedAt: snapshot.updatedAt,
  }
}

export const completeLevelGame = (
  snapshot: GameSnapshot,
  result: GameResult
): Promise<void> => {
  const progress = state.value.levels[getSnapshotLevelId(snapshot)]

  if (!progress?.attempt) {
    return persistence
  }

  addSessionDelta(snapshot.statistics, progress.attempt.statistics)
  markGameCompleted(result)
  finishLevelProgress(snapshot, progress, result)

  return persist()
}

export const saveCompletedGameStatistics = (
  current: SessionStatistics,
  previous: SessionStatistics
): Promise<void> => {
  addSessionDelta(current, previous)

  return persist()
}

export const usePlayerProgress = () => ({
  state,
  initialized,
  storageError,
  hasPlayed: computed(() => state.value.statistics.gamesStarted > 0),
  latestInProgressGame: computed(() => getLatestInProgressGame(state.value)),
})
