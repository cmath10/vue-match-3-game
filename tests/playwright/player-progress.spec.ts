import type { GameSnapshot } from '@/domain/progress'

import { expect, test } from '@playwright/test'

import {
  createPlayerState,
  createSessionStatistics,
  getHighestUnlockedLevelAfterResult,
  getLatestInProgressGame,
} from '@/domain/progress'
import { restorePlayerState } from '@/domain/playerStateMigration'

const createAttempt = (levelId: number, updatedAt: number): GameSnapshot => ({
  levelId,
  board: [],
  objectives: [],
  counters: [],
  turns: 25,
  nextTileId: 0,
  startedAt: updatedAt,
  updatedAt,
  statistics: createSessionStatistics(),
})

test('a win unlocks only the next level and a loss unlocks nothing', () => {
  expect(getHighestUnlockedLevelAfterResult(3, 3, 'win')).toBe(4)
  expect(getHighestUnlockedLevelAfterResult(3, 1, 'win')).toBe(3)
  expect(getHighestUnlockedLevelAfterResult(3, 3, 'lose')).toBe(3)
  expect(getHighestUnlockedLevelAfterResult(20, 20, 'win')).toBe(20)
})

test('continue selects the most recently played unfinished attempt', () => {
  const state = createPlayerState()
  const firstAttempt = createAttempt(1, 10)
  const latestAttempt = createAttempt(2, 20)

  state.highestUnlockedLevel = 2
  state.levels[1] = { levelId: 1, completed: false, updatedAt: 10, attempt: firstAttempt }
  state.levels[2] = { levelId: 2, completed: false, updatedAt: 20, attempt: latestAttempt }

  expect(getLatestInProgressGame(state)).toEqual(latestAttempt)
})

test('migrates legacy progress without locking previously played levels', () => {
  const statistics = createPlayerState().statistics
  const restored = restorePlayerState({
    version: 1,
    levels: {
      1: { levelId: 1, status: 'win', updatedAt: 1 },
      5: {
        levelId: 5,
        status: 'in-progress',
        updatedAt: 2,
        snapshot: { levelId: 5 },
      },
    },
    statistics,
  })

  expect(restored?.highestUnlockedLevel).toBe(5)
  expect(restored?.levels[1].completed).toBe(true)
  expect(restored?.levels[5].attempt?.levelId).toBe(5)
})
