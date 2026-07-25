import type { Counter, Objective, Tile } from '@/domain/types'
import type TileGrid from '@/entities/TileGrid'
import type { TileType } from '@/domain/enums'

import { COUNTER_TYPES } from '@/entities/SpecialTileConfig'
import { generateObjectives } from '@/entities/Objectives'
import {
  isMatchableTile,
  SPECIAL_OBJECTIVE_TYPES,
  SPECIAL_TARGETS,
} from '@/entities/SpecialTileConfig'

type SelectRandom = <T>(items: T[]) => T

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
