import type { BoardState } from '@/domain/types'
import type { CellKey, GravityGraph, GravityState } from '@/domain/levels/types'
import type { MovementOrigin, Position } from '@/domain/types'
import type { SpawnDefinition } from '@/domain/levels/types'
import type { TileMovement } from '@/domain/types'

import { cloneBoardState } from '@/domain/board/topology'
import { getCellKey, parseCellKey } from '@/domain/levels/coordinates'

export type SpawnTile<T> = (
  spawn: SpawnDefinition,
  target: Position,
  spawnIndex: number
) => T

type GravityOptions<T> = {
  state: BoardState<T>
  graph: GravityGraph
  gravityState: GravityState
  spawns: readonly SpawnDefinition[]
  spawnTile: SpawnTile<T>
  getTileId: (tile: T) => string
  orderOffset?: number
  phase?: number
}

export type GravityResolution<T> = {
  state: BoardState<T>
  movements: TileMovement[]
}

type Supply<T> = {
  tile: T
  source: CellKey | null
  origin: MovementOrigin
  path: readonly [Position, ...Position[]]
}

type GravityContext<T> = {
  options: GravityOptions<T>
  state: BoardState<T>
  spawnsByEntry: ReadonlyMap<CellKey, SpawnDefinition>
  spawnCounts: Map<string, number>
  movements: TileMovement[]
}

const getTile = <T>(state: BoardState<T>, key: CellKey): T | null => {
  const { row, column } = parseCellKey(key)

  return state.occupancy[row][column]
}

const setTile = <T>(state: BoardState<T>, key: CellKey, tile: T | null): void => {
  const { row, column } = parseCellKey(key)

  state.occupancy[row][column] = tile
}

const createSpawnSupply = <T>(
  context: GravityContext<T>,
  spawn: SpawnDefinition,
  target: CellKey,
  path: CellKey[]
): Supply<T> => {
  const spawnIndex = context.spawnCounts.get(spawn.id) ?? 0
  const targetPosition = parseCellKey(target)

  context.spawnCounts.set(spawn.id, spawnIndex + 1)
  return {
    tile: context.options.spawnTile(spawn, targetPosition, spawnIndex),
    source: null,
    origin: { kind: 'spawn', spawnId: spawn.id },
    path: path.reverse().map(parseCellKey) as [Position, ...Position[]],
  }
}

const createCellSupply = <T>(
  state: BoardState<T>,
  incoming: CellKey,
  path: CellKey[]
): Supply<T> | null => {
  const tile = getTile(state, incoming)

  return tile === null ? null : {
    tile,
    source: incoming,
    origin: { kind: 'cell', position: parseCellKey(incoming) },
    path: path.reverse().map(parseCellKey) as [Position, ...Position[]],
  }
}

const getSpawnSupply = <T>(
  context: GravityContext<T>,
  current: CellKey,
  target: CellKey,
  path: CellKey[]
): Supply<T> | null => {
  const spawn = context.spawnsByEntry.get(current)

  return spawn === undefined ? null : createSpawnSupply(context, spawn, target, path)
}

const getIncomingIndexes = (context: GravityContext<unknown>, key: CellKey): number[] => {
  const count = context.options.graph.nodes.get(key)?.incoming.length ?? 0
  const start = context.options.gravityState.nextIncomingIndexByCell.get(key) ?? 0

  return Array.from({ length: count }, (_, offset) => (start + offset) % count)
}

const advanceCursor = <T>(context: GravityContext<T>, key: CellKey, index: number): void => {
  const count = context.options.graph.nodes.get(key)?.incoming.length ?? 0

  if (count > 1) {
    context.options.gravityState.nextIncomingIndexByCell.set(key, (index + 1) % count)
  }
}

const findBranchSupply = <T>(
  context: GravityContext<T>,
  incoming: CellKey,
  target: CellKey,
  path: CellKey[]
): Supply<T> | null => createCellSupply(context.state, incoming, path) ??
  findSupply(context, incoming, target, [...path, incoming])

const findSupply = <T>(
  context: GravityContext<T>,
  current: CellKey,
  target: CellKey,
  path: CellKey[]
): Supply<T> | null => {
  const incoming = context.options.graph.nodes.get(current)?.incoming ?? []

  for (const index of getIncomingIndexes(context, current)) {
    const supply = findBranchSupply(context, incoming[index], target, path)

    if (supply !== null) {
      advanceCursor(context, current, index)
      return supply
    }
  }
  return getSpawnSupply(context, current, target, path)
}

const applySupply = <T>(context: GravityContext<T>, target: CellKey, supply: Supply<T>): void => {
  if (supply.source !== null) {
    setTile(context.state, supply.source, null)
  }

  setTile(context.state, target, supply.tile)
  context.movements.push({
    tileId: context.options.getTileId(supply.tile),
    origin: supply.origin,
    path: supply.path,
    phase: context.options.phase ?? 0,
    resolutionOrder: (context.options.orderOffset ?? 0) + context.movements.length,
  })
}

const resolveTarget = <T>(context: GravityContext<T>, target: CellKey): void => {
  if (getTile(context.state, target) !== null) {
    return
  }

  const supply = findSupply(context, target, target, [target])
  if (supply === null) {
    return
  }

  applySupply(context, target, supply)
}

export const resolveGravity = <T>(options: GravityOptions<T>): GravityResolution<T> => {
  const context: GravityContext<T> = {
    options,
    state: cloneBoardState(options.state),
    spawnsByEntry: new Map(options.spawns.map(spawn => [getCellKey(spawn.entry), spawn])),
    spawnCounts: new Map(),
    movements: [],
  }

  options.graph.settlementOrder.forEach(key => resolveTarget(context, key))

  return { state: context.state, movements: context.movements }
}
