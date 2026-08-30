import type { BoardEdgeGuide, CompiledLevel, GravityGraph } from '@/domain/levels/types'
import type {
  LevelCompilationError,
  LevelCompilationResult,
} from '@/domain/levels/errors'
import type { LevelDefinition, TilePoolDefinition } from '@/domain/levels/types'

import { compileDirectionalGravity } from '@/domain/levels/compileGravity'
import { compileInitialBoard } from '@/domain/levels/compileInitialBoard'
import { getCellKey } from '@/domain/levels/coordinates'
import { getDirectionAnchor } from '@/domain/levels/compileGravity'
import { levelError } from '@/domain/levels/errors'
import { parseCellKey } from '@/domain/levels/coordinates'
import { TileType } from '@/domain/enums'
import {
  validateCollectors,
  validateRandomPools,
  validateSpawns,
} from '@/domain/levels/validateLevel'

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
  gravity: GravityGraph
): BoardEdgeGuide[] => {
  const collectors = new Map(definition.collectors.map(item => [getCellKey(item.cell), item]))

  return [...gravity.nodes].flatMap(([key, node]): BoardEdgeGuide[] => (
    node.next === null ? [compileTerminalGuide(definition, collectors, key)] : []
  ))
}

const compileTerminalGuide = (
  definition: LevelDefinition,
  collectors: ReadonlyMap<string, LevelDefinition['collectors'][number]>,
  key: `${number}:${number}`
): BoardEdgeGuide => {
  const terminal = parseCellKey(key)
  const anchor = getDirectionAnchor(definition.gravity.direction, terminal)
  const collector = collectors.get(key)

  return collector === undefined
    ? { kind: 'gravity', anchor, terminals: [terminal] }
    : { kind: 'collector', anchor, terminal, collectorId: collector.id }
}

const createCompiledLevel = (
  definition: LevelDefinition,
  initial: ReturnType<typeof compileInitialBoard>,
  pools: ReadonlyMap<string, TilePoolDefinition>,
  gravity: GravityGraph
): CompiledLevel => ({
  id: definition.id,
  revision: definition.revision,
  topology: initial.topology,
  initialBoard: initial.initialBoard,
  tilePools: pools,
  gravity,
  edgeGuides: compileEdgeGuides(definition, gravity),
  spawns: definition.spawns,
  collectors: definition.collectors,
  objectives: definition.objectives,
})

export const compileLevel = (definition: LevelDefinition): LevelCompilationResult<CompiledLevel> => {
  const initial = compileInitialBoard(definition.initialBoard)
  const { pools, errors: poolErrors } = compileTilePools(definition.tilePools)
  const spawnErrors = validateSpawns(definition.spawns, initial.topology, pools)
  const gravity = compileDirectionalGravity(initial.topology, definition.gravity.direction, definition.spawns)
  const collectorErrors = validateCollectors(definition, initial.topology, gravity.gravity)
  const errors = initial.errors.concat(
    poolErrors,
    validateRandomPools(definition, pools),
    spawnErrors,
    gravity.errors,
    collectorErrors
  )

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, level: createCompiledLevel(definition, initial, pools, gravity.gravity) }
}

export const compileLevelOrThrow = (definition: LevelDefinition): CompiledLevel => {
  const result = compileLevel(definition)

  if (result.ok === false) {
    throw new Error(result.errors.map(error => `${error.path.join('.')}: ${error.message}`).join('\n'))
  }

  return result.level
}
