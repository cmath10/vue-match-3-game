import type { BoardTileType } from '@/domain/enums'
import type { Counter, Objective, Tile } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'
import type { TileType } from '@/domain/enums'

import { COUNTER_TYPES } from '@/domain/config'
import { generateObjectives } from '@/domain/objectives'
import { getMatchableTileBoard, getMovableTileBoard } from '@/game/board/boardProjection'
import { hasAvailableMove } from '@/domain/board/availableMoves'
import { isMatchableTile } from '@/domain/tiles'
import { placeSpecialTiles } from '@/game/board/specialTiles'
import { SPECIAL_OBJECTIVE_TYPES, SPECIAL_TARGETS } from '@/domain/config'

type SelectRandom = <T>(items: T[]) => T
type Shuffle = <T>(items: readonly T[]) => T[]
type CreateTile = (type: BoardTileType, row: number, column: number) => Tile

type PlayableLevelOptions = {
  grid: TileGrid
  width: number
  height: number
  objectives: Objective[]
  counters: Counter[]
  createTile: CreateTile
  fillGrid: () => void
  resetTileIds: () => void
  selectRandom: SelectRandom
  shuffle: Shuffle
}

export const initializePlayableLevel = (options: PlayableLevelOptions): void => {
  do {
    options.grid.clear()
    options.objectives.splice(0)
    options.counters.splice(0)
    options.resetTileIds()
    options.fillGrid()
    placeSpecialTiles(options.grid, options.width, options.height, options.createTile, options.shuffle)
  } while (!hasAvailableMove(
    { topology: options.grid.getTopology(), occupancy: getMatchableTileBoard(options.grid) },
    getMovableTileBoard(options.grid)
  ))

  initializeGameGoals(options.grid, options.objectives, options.counters, options.selectRandom)
}

export const initializeGameGoals = (
  grid: TileGrid,
  objectives: Objective[],
  counters: Counter[],
  selectRandom: SelectRandom
): void => {
  const tileTypes = grid.getTiles()
    .filter((tile): tile is Tile & { type: TileType } => isMatchableTile(tile))
    .map(tile => tile.type)
  const [normalObjective] = generateObjectives(tileTypes)
  const specialType = selectRandom(SPECIAL_OBJECTIVE_TYPES)

  objectives.push(normalObjective, {
    type: specialType,
    count: SPECIAL_TARGETS[specialType],
  })
  COUNTER_TYPES.forEach(type => counters.push({ type, count: 0 }))
}
