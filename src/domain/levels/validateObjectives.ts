import type { FixedTileDefinition, InitialCellDefinition } from '@/domain/levels/types'
import type { LevelCompilationError } from '@/domain/levels/errors'
import type { LevelDefinition } from '@/domain/levels/types'
import type { ObjectiveType } from '@/domain/enums'

import { levelError } from '@/domain/levels/errors'
import { SpecialTileType, TileType } from '@/domain/enums'

const MAX_OBJECTIVES = 4
const OPTIONAL_SPECIAL_TYPES = [SpecialTileType.Mug, SpecialTileType.Cookie] as const

const getFixedBlockerType = (tile: FixedTileDefinition): SpecialTileType.Package | null => (
  tile.kind === 'ordinary' ? tile.blocker?.type ?? null : null
)

const getBlockerType = (cell: InitialCellDefinition): SpecialTileType.Package | null => {
  if (cell.kind === 'random') {
    return cell.blocker?.type ?? null
  }
  return getFixedBlockerType(cell.tile)
}

const getCellSpecialType = (cell: InitialCellDefinition): SpecialTileType | null => (
  getBlockerType(cell) ?? getFixedSpecialType(cell)
)

const getFixedSpecialType = (cell: InitialCellDefinition): SpecialTileType | null => (
  cell.kind === 'fixed' && cell.tile.kind === 'special' ? cell.tile.type : null
)

const getSpecialCounts = (definition: LevelDefinition): Map<SpecialTileType, number> => {
  const counts = new Map<SpecialTileType, number>()

  definition.initialBoard.layout.forEach(line => Array.from(line).forEach((token) => {
    const cell = definition.initialBoard.legend[token]
    const type = cell === undefined ? null : getCellSpecialType(cell)

    if (type !== null) {
      counts.set(type, (counts.get(type) ?? 0) + 1)
    }
  }))
  return counts
}

const isObjectiveType = (type: ObjectiveType): boolean => (
  Object.values(TileType).includes(type as TileType) ||
  Object.values(SpecialTileType).includes(type as SpecialTileType)
)

const getRefillTypes = (definition: LevelDefinition): Set<TileType> => {
  const types = definition.spawns.flatMap((spawn): TileType[] => (
    [...(definition.tilePools[spawn.pool]?.types ?? [])]
  ))

  return new Set(types)
}

const getBasicObjectiveErrors = (
  objective: LevelDefinition['objectives'][number],
  path: readonly (string | number)[],
  duplicate: boolean
): LevelCompilationError[] => [
  ...(!isObjectiveType(objective.type) || !Number.isInteger(objective.count) || objective.count <= 0
    ? [levelError('invalid-objective', path, 'Objective type and count must be valid')]
    : []),
  ...(duplicate
    ? [levelError('invalid-objective', [...path, 'type'], 'Objective types must be unique')]
    : []),
]

const getSpecialAvailabilityErrors = (
  objective: LevelDefinition['objectives'][number],
  path: readonly (string | number)[],
  specialCounts: ReadonlyMap<SpecialTileType, number>
): LevelCompilationError[] => {
  const special = Object.values(SpecialTileType).includes(objective.type as SpecialTileType)

  return special && objective.count > (specialCounts.get(objective.type as SpecialTileType) ?? 0)
    ? [levelError('invalid-objective', [...path, 'count'], 'Special objective exceeds placed tiles')]
    : []
}

const getOrdinaryAvailabilityErrors = (
  objective: LevelDefinition['objectives'][number],
  path: readonly (string | number)[],
  refillTypes: ReadonlySet<TileType>
): LevelCompilationError[] => (
  Object.values(TileType).includes(objective.type as TileType) &&
  !refillTypes.has(objective.type as TileType)
    ? [levelError('invalid-objective', [...path, 'type'], 'Ordinary objective must be refillable')]
    : []
)

const validateObjective = (
  definition: LevelDefinition,
  index: number,
  duplicate: boolean,
  specialCounts: ReadonlyMap<SpecialTileType, number>,
  refillTypes: ReadonlySet<TileType>
): LevelCompilationError[] => {
  const objective = definition.objectives[index]
  const path = ['objectives', index]
  const basic = getBasicObjectiveErrors(objective, path, duplicate)
  const special = getSpecialAvailabilityErrors(objective, path, specialCounts)
  const ordinary = getOrdinaryAvailabilityErrors(objective, path, refillTypes)

  return [...basic, ...special, ...ordinary]
}

const getUnassignedSpecialErrors = (
  definition: LevelDefinition,
  specialCounts: ReadonlyMap<SpecialTileType, number>
): LevelCompilationError[] => OPTIONAL_SPECIAL_TYPES.flatMap(type => (
  (specialCounts.get(type) ?? 0) > 0 && !definition.objectives.some(objective => objective.type === type)
    ? [levelError(
        'invalid-objective',
        ['initialBoard', 'layout'],
        `${type} tiles require a matching objective`
      )]
    : []
))

export const validateObjectives = (definition: LevelDefinition): LevelCompilationError[] => {
  const specialCounts = getSpecialCounts(definition)
  const refillTypes = getRefillTypes(definition)
  const types = new Set<ObjectiveType>()
  const countErrors = definition.objectives.length > MAX_OBJECTIVES
    ? [levelError('invalid-objective', ['objectives'], 'A level can have at most four objectives')]
    : []
  const objectiveErrors = definition.objectives.flatMap((objective, index) => {
    const errors = validateObjective(
      definition, index, types.has(objective.type), specialCounts, refillTypes
    )

    types.add(objective.type)
    return errors
  })

  return [...countErrors, ...objectiveErrors, ...getUnassignedSpecialErrors(definition, specialCounts)]
}
