import type { GameResult } from '@/domain/types'

import type { GameSnapshot, LevelProgress, PlayerState } from '@/domain/progress'

import { AttemptRandom } from '@/domain/random'
import { CATALOG_LEVEL_REVISION } from '@/domain/levels/catalog'
import { LEVEL_COUNT, PLAYER_STATE_VERSION } from '@/domain/progress'

const LEGACY_PLAYER_STATE_VERSION = 1
const PREVIOUS_PLAYER_STATE_VERSION = 2

type LegacyGameSnapshot = Omit<GameSnapshot, 'gravity' | 'level' | 'random'> & {
  levelId: number
}

type LegacyLevelProgress = {
  levelId: number
  status: 'in-progress' | GameResult
  updatedAt: number
  snapshot?: LegacyGameSnapshot
}

type LegacyPlayerState = Omit<PlayerState, 'highestUnlockedLevel' | 'levels' | 'version'> & {
  version: typeof LEGACY_PLAYER_STATE_VERSION
  levels: Record<string, LegacyLevelProgress>
}

type VersionTwoLevelProgress = Omit<LevelProgress, 'attempt'> & {
  attempt?: LegacyGameSnapshot
}

type VersionTwoPlayerState = Omit<PlayerState, 'levels' | 'version'> & {
  version: typeof PREVIOUS_PLAYER_STATE_VERSION
  levels: Record<string, VersionTwoLevelProgress>
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

const migrateSnapshot = (snapshot: LegacyGameSnapshot, levelId: number): GameSnapshot => {
  const { levelId: _legacyLevelId, ...state } = snapshot
  const seed = snapshot.startedAt ?? snapshot.updatedAt ?? levelId

  void _legacyLevelId

  return {
    ...state,
    level: { kind: 'catalog', levelId, levelRevision: CATALOG_LEVEL_REVISION },
    random: new AttemptRandom(seed).snapshot(),
    gravity: { nextIncomingIndexByCell: {} },
  }
}

const migrateLegacyLevel = (progress: LegacyLevelProgress): LevelProgress => ({
  levelId: progress.levelId,
  completed: progress.status === 'win',
  lastResult: progress.status === 'in-progress' ? undefined : progress.status,
  updatedAt: progress.updatedAt,
  attempt: progress.status === 'in-progress' && progress.snapshot
    ? migrateSnapshot(progress.snapshot, progress.levelId)
    : undefined,
})

const migrateLegacyState = (legacy: LegacyPlayerState): PlayerState => ({
  version: PLAYER_STATE_VERSION,
  highestUnlockedLevel: getMigratedUnlockedLevel(legacy.levels),
  levels: Object.fromEntries(Object.entries(legacy.levels).map(([levelId, progress]) => (
    [levelId, migrateLegacyLevel(progress)]
  ))),
  statistics: legacy.statistics,
})

const migrateVersionTwoState = (legacy: VersionTwoPlayerState): PlayerState => ({
  ...legacy,
  version: PLAYER_STATE_VERSION,
  levels: Object.fromEntries(Object.entries(legacy.levels).map(([id, progress]) => [id, {
    ...progress,
    attempt: progress.attempt ? migrateSnapshot(progress.attempt, progress.levelId) : undefined,
  }])),
})

const isCurrentPlayerState = (stored: Record<string, unknown>): boolean => (
  stored.version === PLAYER_STATE_VERSION && Number.isInteger(stored.highestUnlockedLevel)
)

export const restorePlayerState = (stored: unknown): PlayerState | null => {
  if (!isStoredState(stored)) {
    return null
  }

  if (isCurrentPlayerState(stored)) {
    return stored as PlayerState
  }

  if (stored.version === PREVIOUS_PLAYER_STATE_VERSION) {
    return migrateVersionTwoState(stored as VersionTwoPlayerState)
  }

  return stored.version === LEGACY_PLAYER_STATE_VERSION
    ? migrateLegacyState(stored as LegacyPlayerState)
    : null
}
