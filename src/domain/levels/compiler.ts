import type { BoardEdgeGuide, CellKey, CompiledLevel } from '@/domain/levels/types'
import type {
  LevelCompilationError,
  LevelCompilationResult,
} from '@/domain/levels/errors'
import type { LevelDefinition, TilePoolDefinition } from '@/domain/levels/types'

import { compileGravityDefinition } from '@/domain/levels/compileGravityDefinition'
import { compileInitialBoard } from '@/domain/levels/compileInitialBoard'
import { getCellKey } from '@/domain/levels/coordinates'
import { levelError } from '@/domain/levels/errors'
import { parseCellKey } from '@/domain/levels/coordinates'
import { TileType } from '@/domain/enums'
import { validateCollectors } from '@/domain/levels/validateLevel'
import { validateObjectives } from '@/domain/levels/validateObjectives'
import { validateRandomPools, validateSpawns } from '@/domain/levels/validateLevel'

const validatePool = (id: string, pool: TilePoolDefinition): LevelCompilationError[] => {
  const types: readonly TileType[] = Array.isArray(pool.types) ? pool.types : []
  const unique = new Set(types)
  const validTypes = types.every(type => Object.values(TileType).includes(type))

  return types.length > 0 && unique.size === types.length && validTypes
    ? []
    : [levelError(
        'invalid-tile-pool',
        ['tilePools', id],
        'Tile pool must contain unique ordinary tile types'
      )]
}

const compileTilePools = (
  definitions: LevelDefinition['tilePools']
): { pools: Map<string, TilePoolDefinition>; errors: LevelCompilationError[] } => {
  const entries = Object.entries(definitions)

  return {
    pools: new Map(entries),
    errors: entries.flatMap(([id, pool]) => validatePool(id, pool)),
  }
}

const compileEdgeGuides = (
  definition: LevelDefinition,
  edgeTargets: ReturnType<typeof compileGravityDefinition>['edgeTargets']
): BoardEdgeGuide[] => {
  const collectors = new Map(definition.collectors.map(item => [getCellKey(item.cell), item]))

  return edgeTargets.flatMap(target => compileTargetGuides(collectors, target))
}

const compileTargetGuides = (
  collectors: ReadonlyMap<string, LevelDefinition['collectors'][number]>,
  target: ReturnType<typeof compileGravityDefinition>['edgeTargets'][number]
): BoardEdgeGuide[] => {
  const collectorGuides = target.terminals.flatMap(key => getCollectorGuide(collectors, target.anchor, key))
  const gravityTerminals = target.terminals.filter(key => !collectors.has(key)).map(parseCellKey)
  const gravityGuides: BoardEdgeGuide[] = gravityTerminals.length === 0 ? [] : [{
    kind: 'gravity',
    anchor: target.anchor,
    terminals: gravityTerminals as [ReturnType<typeof parseCellKey>, ...ReturnType<typeof parseCellKey>[]],
  }]

  return [...gravityGuides, ...collectorGuides]
}

const getCollectorGuide = (
  collectors: ReadonlyMap<string, LevelDefinition['collectors'][number]>,
  anchor: ReturnType<typeof compileGravityDefinition>['edgeTargets'][number]['anchor'],
  key: CellKey
): BoardEdgeGuide[] => {
  const collector = collectors.get(key)

  return collector === undefined ? [] : [{
    kind: 'collector',
    anchor,
    terminal: parseCellKey(key),
    collectorId: collector.id,
  }]
}

const createCompiledLevel = (
  definition: LevelDefinition,
  initial: ReturnType<typeof compileInitialBoard>,
  pools: ReadonlyMap<string, TilePoolDefinition>,
  gravity: ReturnType<typeof compileGravityDefinition>
): CompiledLevel => ({
  id: definition.id,
  revision: definition.revision,
  topology: initial.topology,
  initialBoard: initial.initialBoard,
  tilePools: pools,
  gravity: gravity.gravity,
  edgeGuides: compileEdgeGuides(definition, gravity.edgeTargets),
  spawns: definition.spawns,
  collectors: definition.collectors,
  objectives: definition.objectives,
})

const getCollectorCompilationErrors = (
  definition: LevelDefinition,
  initial: ReturnType<typeof compileInitialBoard>,
  gravity: ReturnType<typeof compileGravityDefinition>
): LevelCompilationError[] => {
  const externalTerminals = new Set(gravity.edgeTargets.flatMap(target => target.terminals))

  return validateCollectors(
    definition, initial.topology, gravity.gravity, externalTerminals
  )
}

const getDefinitionErrors = (
  definition: LevelDefinition,
  pools: ReadonlyMap<string, TilePoolDefinition>
): LevelCompilationError[] => [
  ...validateRandomPools(definition, pools),
  ...validateObjectives(definition),
]

const getCompilationErrors = (
  definition: LevelDefinition,
  initial: ReturnType<typeof compileInitialBoard>,
  pools: ReadonlyMap<string, TilePoolDefinition>,
  poolErrors: LevelCompilationError[],
  gravity: ReturnType<typeof compileGravityDefinition>
): LevelCompilationError[] => initial.errors.concat(
    poolErrors,
    getDefinitionErrors(definition, pools),
    validateSpawns(definition.spawns, initial.topology, pools),
    gravity.errors,
    getCollectorCompilationErrors(definition, initial, gravity)
  )

export const compileLevel = (definition: LevelDefinition): LevelCompilationResult<CompiledLevel> => {
  const initial = compileInitialBoard(definition.initialBoard)
  const { pools, errors: poolErrors } = compileTilePools(definition.tilePools)
  const gravity = compileGravityDefinition(initial.topology, definition.gravity, definition.spawns)
  const errors = getCompilationErrors(definition, initial, pools, poolErrors, gravity)

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, level: createCompiledLevel(definition, initial, pools, gravity) }
}

export const compileLevelOrThrow = (definition: LevelDefinition): CompiledLevel => {
  const result = compileLevel(definition)

  if (result.ok === false) {
    throw new Error(result.errors.map(error => `${error.path.join('.')}: ${error.message}`).join('\n'))
  }

  return result.level
}
