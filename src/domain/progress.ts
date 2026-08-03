import type { BoosterType } from '@/domain/enums'
import type { Counter, GameResult, Objective } from '@/domain/types'
import type { ObjectiveType } from '@/domain/enums'
import type { Tile } from '@/domain/types'

export const LEVEL_COUNT = 20
export const PLAYER_STATE_VERSION = 2

export type CountBy<T extends string> = Partial<Record<T, number>>

export type SessionStatistics = {
  turnsPlayed: number
  boostersUsed: CountBy<BoosterType>
  tilesCollected: CountBy<ObjectiveType>
}

export type GameStatistics = SessionStatistics & {
  gamesStarted: number
  gamesCompleted: number
  gamesWon: number
  gamesLost: number
}

export type GameSnapshot = {
  levelId: number
  board: Array<Array<Tile | null>>
  objectives: Objective[]
  counters: Counter[]
  turns: number
  nextTileId: number
  startedAt: number
  updatedAt: number
  statistics: SessionStatistics
}

export type LevelProgress = {
  levelId: number
  completed: boolean
  lastResult?: GameResult
  updatedAt: number
  attempt?: GameSnapshot
}

export type PlayerState = {
  version: typeof PLAYER_STATE_VERSION
  highestUnlockedLevel: number
  levels: Record<string, LevelProgress>
  statistics: GameStatistics
}

export const createSessionStatistics = (): SessionStatistics => ({
  turnsPlayed: 0,
  boostersUsed: {},
  tilesCollected: {},
})

export const createPlayerState = (): PlayerState => ({
  version: PLAYER_STATE_VERSION,
  highestUnlockedLevel: 1,
  levels: {},
  statistics: {
    ...createSessionStatistics(),
    gamesStarted: 0,
    gamesCompleted: 0,
    gamesWon: 0,
    gamesLost: 0,
  },
})

export const getLevelIds = (): number[] => (
  Array.from({ length: LEVEL_COUNT }, (_, index) => index + 1)
)

export const isLevelId = (value: unknown): value is number => (
  Number.isInteger(value) && Number(value) >= 1 && Number(value) <= LEVEL_COUNT
)

export const getLatestInProgressGame = (state: PlayerState): GameSnapshot | null => {
  const games = Object.values(state.levels)
    .filter(progress => progress.attempt)
    .sort((a, b) => b.updatedAt - a.updatedAt)

  return games[0]?.attempt ?? null
}

export const isLevelUnlocked = (state: PlayerState, levelId: number): boolean => (
  isLevelId(levelId) && levelId <= state.highestUnlockedLevel
)

export const getHighestUnlockedLevelAfterResult = (
  currentLevel: number,
  completedLevel: number,
  result: GameResult
): number => {
  if (result !== 'win') {
    return currentLevel
  }

  return Math.min(LEVEL_COUNT, Math.max(currentLevel, completedLevel + 1))
}

export type LevelDisplayStatus = 'locked' | 'new' | 'in-progress' | 'completed' | 'lose'

const getUnlockedLevelStatus = (progress?: LevelProgress): LevelDisplayStatus => {
  if (!progress) {
    return 'new'
  }

  if (progress.attempt) {
    return 'in-progress'
  }

  if (progress.completed) {
    return 'completed'
  }

  return progress.lastResult === 'lose' ? 'lose' : 'new'
}

export const getLevelDisplayStatus = (state: PlayerState, levelId: number): LevelDisplayStatus => {
  if (!isLevelUnlocked(state, levelId)) {
    return 'locked'
  }

  return getUnlockedLevelStatus(state.levels[levelId])
}

export const cloneTile = (tile: Tile): Tile => ({
  ...tile,
  blocker: tile.blocker ? { ...tile.blocker } : undefined,
})

export const cloneBoard = (board: GameSnapshot['board']): GameSnapshot['board'] => (
  board.map(row => row.map(tile => tile ? cloneTile(tile) : null))
)

export const incrementCount = <T extends string>(counts: CountBy<T>, type: T): void => {
  counts[type] = (counts[type] ?? 0) + 1
}

export const getCountTotal = <T extends string>(counts: CountBy<T>): number => (
  Object.values(counts).reduce<number>((total, count) => total + Number(count ?? 0), 0)
)
