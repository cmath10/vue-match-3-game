import type { CompiledLevel, LevelDefinition } from '@/domain/levels/types'

import { CATALOG_LEVELS_1_TO_5 } from '@/domain/levels/catalogLevels1To5'
import { CATALOG_LEVELS_11_TO_15 } from '@/domain/levels/catalogLevels11To15'
import { CATALOG_LEVELS_16_TO_20 } from '@/domain/levels/catalogLevels16To20'
import { CATALOG_LEVELS_6_TO_10 } from '@/domain/levels/catalogLevels6To10'
import { compileLevelOrThrow } from '@/domain/levels/compiler'

export { CATALOG_LEVEL_REVISION } from '@/domain/levels/catalogLevelFactory'

const definitions: readonly LevelDefinition[] = [
  ...CATALOG_LEVELS_1_TO_5,
  ...CATALOG_LEVELS_6_TO_10,
  ...CATALOG_LEVELS_11_TO_15,
  ...CATALOG_LEVELS_16_TO_20,
]

export const CATALOG_LEVEL_COUNT = definitions.length

export const createCatalogLevelDefinition = (levelId: number): LevelDefinition => {
  const definition = definitions.find(level => level.id === levelId)

  if (definition === undefined) {
    throw new Error(`Unknown catalog level: ${levelId}`)
  }
  return definition
}

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
