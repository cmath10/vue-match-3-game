import type { CompiledLevel, LevelDefinition } from '@/domain/levels/types'

import { AVAILABLE_TILE_TYPES, BOARD_HEIGHT, BOARD_WIDTH } from '@/domain/config'
import { compileLevelOrThrow } from '@/domain/levels/compiler'
import { SpecialTileType } from '@/domain/enums'

export const CATALOG_LEVEL_REVISION = 1
export const DEFAULT_TILE_POOL_ID = 'default'

const createLayout = (): string[] => Array.from({ length: BOARD_HEIGHT }, () => 'A'.repeat(BOARD_WIDTH))

const createSpawns = (): LevelDefinition['spawns'] => Array.from(
  { length: BOARD_WIDTH },
  (_, column) => ({
    id: `top-${column}`,
    entry: { row: 0, column },
    pool: DEFAULT_TILE_POOL_ID,
  })
)

const createCollectors = (): LevelDefinition['collectors'] => Array.from(
  { length: BOARD_WIDTH },
  (_, column) => ({
    id: `mug-bottom-${column}`,
    cell: { row: BOARD_HEIGHT - 1, column },
    accepts: [SpecialTileType.Mug],
  })
)

export const createCatalogLevelDefinition = (levelId: number): LevelDefinition => ({
  id: levelId,
  revision: CATALOG_LEVEL_REVISION,
  initialBoard: {
    layout: createLayout(),
    legend: { A: { kind: 'random', pool: DEFAULT_TILE_POOL_ID } },
  },
  tilePools: { [DEFAULT_TILE_POOL_ID]: { types: AVAILABLE_TILE_TYPES } },
  gravity: { kind: 'direction', direction: 'down' },
  spawns: createSpawns(),
  collectors: createCollectors(),
  objectives: [],
})

const compiledLevels = new Map<number, CompiledLevel>()

export const getCatalogLevel = (levelId: number): CompiledLevel => {
  const cached = compiledLevels.get(levelId)

  if (cached !== undefined) {
    return cached
  }

  const level = compileLevelOrThrow(createCatalogLevelDefinition(levelId))

  compiledLevels.set(levelId, level)
  return level
}
