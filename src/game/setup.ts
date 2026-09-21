import type { Counter, Objective } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'

import { COUNTER_TYPES } from '@/domain/config'
import { getMatchableTileBoard, getMovableTileBoard } from '@/game/board/boardProjection'
import { hasAvailableMove } from '@/domain/board/availableMoves'

type PlayableLevelOptions = {
  grid: TileGrid
  objectives: Objective[]
  counters: Counter[]
  initialObjectives: readonly Objective[]
  fillGrid: () => void
  resetTileIds: () => void
}

export const initializePlayableLevel = (options: PlayableLevelOptions): void => {
  options.grid.clear()
  options.objectives.splice(0)
  options.counters.splice(0)
  options.resetTileIds()
  options.fillGrid()

  if (!hasAvailableMove(
    { topology: options.grid.getTopology(), occupancy: getMatchableTileBoard(options.grid) },
    getMovableTileBoard(options.grid)
  )) {
    throw new Error('Materialized level must have an available move')
  }

  initializeGameGoals(options.initialObjectives, options.objectives, options.counters)
}

export const initializeGameGoals = (
  initialObjectives: readonly Objective[],
  objectives: Objective[],
  counters: Counter[]
): void => {
  objectives.push(...initialObjectives.map(objective => ({ ...objective })))
  COUNTER_TYPES.forEach(type => counters.push({ type, count: 0 }))
}
