import type { Counter, Objective, Tile } from '@/types/game'
import type { TILE_TYPE } from '@/enums/game'
import type TileGrid from '@/entities/TileGrid'

import { COUNTER_TYPES } from '@/entities/Match3SpecialTileConfig'
import { generateObjectives } from '@/entities/Match3Objectives'
import {
  isMatchableTile,
  SPECIAL_OBJECTIVE_TYPES,
  SPECIAL_TARGETS,
} from '@/entities/Match3SpecialTileConfig'

type SelectRandom = <T>(items: T[]) => T

export const initializeGameGoals = (
  grid: TileGrid,
  objectives: Objective[],
  counters: Counter[],
  selectRandom: SelectRandom
): void => {
  const tileTypes = grid.getTiles()
    .filter((tile): tile is Tile & { type: TILE_TYPE } => isMatchableTile(tile))
    .map(tile => tile.type)
  const [normalObjective] = generateObjectives(tileTypes)
  const specialType = selectRandom(SPECIAL_OBJECTIVE_TYPES)

  objectives.push(normalObjective, {
    type: specialType,
    count: SPECIAL_TARGETS[specialType],
  })
  COUNTER_TYPES.forEach(type => counters.push({ type, count: 0 }))
}
