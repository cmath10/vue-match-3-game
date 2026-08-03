import type { GameResult } from '@/domain/types'

import type { GameSnapshot, LevelProgress, PlayerState } from '@/domain/progress'

import { LEVEL_COUNT, PLAYER_STATE_VERSION } from '@/domain/progress'

type LegacyLevelProgress = {
  levelId: number
  status: 'in-progress' | GameResult
  updatedAt: number
  snapshot?: GameSnapshot
}

type LegacyPlayerState = Omit<PlayerState, 'highestUnlockedLevel' | 'levels' | 'version'> & {
  version: 1
  levels: Record<string, LegacyLevelProgress>
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

const isStoredState = (stored: unknown): stored is Record<string, unknown> => {
  if (!isRecord(stored)) {
    return false
  }

  return isRecord(stored.levels) && isRecord(stored.statistics)
}

const getMigratedUnlockedLevel = (levels: LegacyPlayerState['levels']): number => {
  return Math.min(LEVEL_COUNT, Math.max(1, ...Object.values(levels).map(progress => (
    progress.status === 'win' ? progress.levelId + 1 : progress.levelId
  ))))
}

const migrateLegacyLevel = (progress: LegacyLevelProgress): LevelProgress => ({
  levelId: progress.levelId,
  completed: progress.status === 'win',
  lastResult: progress.status === 'in-progress' ? undefined : progress.status,
  updatedAt: progress.updatedAt,
  attempt: progress.status === 'in-progress' ? progress.snapshot : undefined,
})

const migrateLegacyState = (legacy: LegacyPlayerState): PlayerState => ({
  version: PLAYER_STATE_VERSION,
  highestUnlockedLevel: getMigratedUnlockedLevel(legacy.levels),
  levels: Object.fromEntries(Object.entries(legacy.levels).map(([levelId, progress]) => (
    [levelId, migrateLegacyLevel(progress)]
  ))),
  statistics: legacy.statistics,
})

export const restorePlayerState = (stored: unknown): PlayerState | null => {
  if (!isStoredState(stored)) {
    return null
  }

  if (stored.version === PLAYER_STATE_VERSION && Number.isInteger(stored.highestUnlockedLevel)) {
    return stored as PlayerState
  }

  return stored.version === 1 ? migrateLegacyState(stored as LegacyPlayerState) : null
}
