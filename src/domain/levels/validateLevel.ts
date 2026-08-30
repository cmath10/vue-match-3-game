import type { BoardTopology, GravityGraph } from '@/domain/levels/types'
import type { LevelCompilationError } from '@/domain/levels/errors'
import type {
  LevelDefinition,
  SpawnDefinition,
  TilePoolDefinition,
} from '@/domain/levels/types'

import { getCellKey, isPlayablePosition } from '@/domain/levels/coordinates'
import { levelError } from '@/domain/levels/errors'
import { SpecialTileType } from '@/domain/enums'

const errorWhen = (
  condition: boolean,
  error: LevelCompilationError
): LevelCompilationError[] => condition ? [error] : []

const getSpawnIdErrors = (spawn: SpawnDefinition, duplicate: boolean, path: readonly (string | number)[]) => (
  errorWhen(
    spawn.id.length === 0 || duplicate,
    levelError('invalid-spawn', [...path, 'id'], 'Spawn id must be unique and non-empty')
  )
)

const getSpawnEntryErrors = (spawn: SpawnDefinition, topology: BoardTopology, path: readonly (string | number)[]) => (
  errorWhen(
    !isPlayablePosition(topology.playableCells, spawn.entry),
    levelError('invalid-spawn', [...path, 'entry'], 'Spawn entry must be playable')
  )
)

const getSpawnPoolErrors = (
  spawn: SpawnDefinition,
  pools: ReadonlyMap<string, TilePoolDefinition>,
  path: readonly (string | number)[]
) => errorWhen(
  !pools.has(spawn.pool),
  levelError('invalid-spawn', [...path, 'pool'], 'Spawn references an unknown pool')
)

const validateSpawn = (
  spawn: SpawnDefinition,
  index: number,
  duplicateId: boolean,
  duplicateEntry: boolean,
  topology: BoardTopology,
  pools: ReadonlyMap<string, TilePoolDefinition>
): LevelCompilationError[] => {
  const path = ['spawns', index]

  return [
    ...getSpawnIdErrors(spawn, duplicateId, path),
    ...errorWhen(
      duplicateEntry,
      levelError('invalid-spawn', [...path, 'entry'], 'Spawn entry must be unique')
    ),
    ...getSpawnEntryErrors(spawn, topology, path),
    ...getSpawnPoolErrors(spawn, pools, path),
  ]
}

export const validateSpawns = (
  spawns: readonly SpawnDefinition[],
  topology: BoardTopology,
  pools: ReadonlyMap<string, TilePoolDefinition>
): LevelCompilationError[] => {
  const ids = new Set<string>()
  const entries = new Set<string>()

  return spawns.flatMap((spawn, index) => {
    const entry = getCellKey(spawn.entry)
    const errors = validateSpawn(
      spawn, index, ids.has(spawn.id), entries.has(entry), topology, pools
    )

    ids.add(spawn.id)
    entries.add(entry)
    return errors
  })
}

export const validateRandomPools = (
  definition: LevelDefinition,
  pools: ReadonlyMap<string, TilePoolDefinition>
): LevelCompilationError[] => {
  return Object.entries(definition.initialBoard.legend).flatMap(([token, cell]) => (
    cell.kind === 'random' && !pools.has(cell.pool)
      ? [levelError(
          'invalid-tile-pool',
          ['initialBoard', 'legend', token, 'pool'],
          'Random cell references an unknown pool'
        )]
      : []
  ))
}

const getCollectorErrors = (
  path: readonly (string | number)[],
  duplicate: boolean,
  terminal: boolean,
  acceptsMugs: boolean
): LevelCompilationError[] => [
  ...(duplicate ? [levelError('invalid-collector', path, 'Collector id and cell must be unique')] : []),
  ...(!terminal ? [levelError('invalid-collector', [...path, 'cell'], 'Collector cell must be terminal')] : []),
  ...(!acceptsMugs ? [levelError('invalid-collector', [...path, 'accepts'], 'Collector must accept mugs')] : []),
]

const validateCollector = (
  definition: LevelDefinition,
  index: number,
  topology: BoardTopology,
  gravity: GravityGraph,
  externalTerminals: ReadonlySet<string>,
  ids: Set<string>,
  cells: Set<string>
): LevelCompilationError[] => {
  const collector = definition.collectors[index]
  const key = getCellKey(collector.cell)
  const duplicate = isDuplicateCollector(collector.id, key, ids, cells)
  const terminal = isTerminalCollector(collector.cell, key, topology, gravity, externalTerminals)

  ids.add(collector.id)
  cells.add(key)
  return getCollectorErrors(
    ['collectors', index], duplicate, terminal, acceptsOnlyMugs(collector.accepts)
  )
}

export const validateCollectors = (
  definition: LevelDefinition,
  topology: BoardTopology,
  gravity: GravityGraph,
  externalTerminals: ReadonlySet<string>
): LevelCompilationError[] => {
  const ids = new Set<string>()
  const cells = new Set<string>()

  return definition.collectors.flatMap((_, index) => validateCollector(
    definition, index, topology, gravity, externalTerminals, ids, cells
  ))
}

const isDuplicateCollector = (
  id: string,
  key: string,
  ids: ReadonlySet<string>,
  cells: ReadonlySet<string>
): boolean => id.length === 0 || ids.has(id) || cells.has(key)

const isTerminalCollector = (
  cell: LevelDefinition['collectors'][number]['cell'],
  key: `${number}:${number}`,
  topology: BoardTopology,
  gravity: GravityGraph,
  externalTerminals: ReadonlySet<string>
): boolean => isPlayablePosition(topology.playableCells, cell) &&
  gravity.nodes.get(key)?.next === null && externalTerminals.has(key)

const acceptsOnlyMugs = (accepts: LevelDefinition['collectors'][number]['accepts']): boolean => (
  accepts.length > 0 && accepts.every(type => type === SpecialTileType.Mug)
)
