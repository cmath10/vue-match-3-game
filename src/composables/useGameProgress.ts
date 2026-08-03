import type { Ref } from 'vue'

import type { BoosterType } from '@/domain/enums'
import type { Counter, GameResult } from '@/domain/types'
import type { GameSnapshot } from '@/domain/progress'
import type { Objective } from '@/domain/types'
import type { ObjectiveType } from '@/domain/enums'
import type { SessionStatistics } from '@/domain/progress'
import type { Tile } from '@/domain/types'

import { reactive, ref } from 'vue'

import { beginLevelGame } from '@/state/playerProgress'
import { cloneBoard } from '@/domain/progress'
import { completeLevelGame } from '@/state/playerProgress'
import { createSessionStatistics, incrementCount } from '@/domain/progress'
import { saveLevelGame } from '@/state/playerProgress'

type GameProgressOptions = {
  getLevelId: () => number
  getBoard: () => Array<Array<Tile | null>>
  objectives: Objective[]
  counters: Counter[]
  turns: Ref<number>
  nextTileId: Ref<number>
}

type GameProgressContext = {
  options: GameProgressOptions
  startedAt: Ref<number>
  statistics: SessionStatistics
}

const createSnapshot = (context: GameProgressContext): GameSnapshot => ({
  levelId: context.options.getLevelId(),
  board: cloneBoard(context.options.getBoard()),
  objectives: context.options.objectives.map(objective => ({ ...objective })),
  counters: context.options.counters.map(counter => ({ ...counter })),
  turns: context.options.turns.value,
  nextTileId: context.options.nextTileId.value,
  startedAt: context.startedAt.value,
  updatedAt: Date.now(),
  statistics: JSON.parse(JSON.stringify(context.statistics)) as SessionStatistics,
})

const begin = (context: GameProgressContext): void => {
  context.startedAt.value = Date.now()
  Object.assign(context.statistics, createSessionStatistics())
  void beginLevelGame(createSnapshot(context))
}

const persist = (context: GameProgressContext, result: GameResult | null): void => {
  const snapshot = createSnapshot(context)

  if (result) {
    void completeLevelGame(snapshot, result)
  } else {
    void saveLevelGame(snapshot)
  }
}

const restore = (context: GameProgressContext, snapshot: GameSnapshot): void => {
  context.startedAt.value = snapshot.startedAt
  Object.assign(context.statistics, snapshot.statistics)
}

export const useGameProgress = (options: GameProgressOptions) => {
  const context = {
    options,
    startedAt: ref(Date.now()),
    statistics: reactive<SessionStatistics>(createSessionStatistics()),
  }

  return {
    begin: () => begin(context),
    persist: (result: GameResult | null) => persist(context, result),
    recordBooster: (type: BoosterType) => incrementCount(context.statistics.boostersUsed, type),
    recordCollection: (type: ObjectiveType) => incrementCount(context.statistics.tilesCollected, type),
    recordTurn: () => context.statistics.turnsPlayed++,
    restore: (snapshot: GameSnapshot) => restore(context, snapshot),
  }
}
