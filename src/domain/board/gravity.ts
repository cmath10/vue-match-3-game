import type { BoardState } from '@/domain/types'
import type { CellKey, GravityGraph } from '@/domain/levels/types'
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
  spawns: readonly SpawnDefinition[]
  spawnTile: SpawnTile<T>
  getTileId: (tile: T) => string
  orderOffset?: number
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

const getIncoming = (graph: GravityGraph, key: CellKey): CellKey | null => {
  const incoming = graph.nodes.get(key)?.incoming ?? []

  if (incoming.length > 1) {
    throw new Error(`Converging gravity at ${key} requires GravityState`)
  }

  return incoming[0] ?? null
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

const getTerminalSupply = <T>(
  context: GravityContext<T>,
  current: CellKey,
  target: CellKey,
  path: CellKey[]
): Supply<T> | null => {
  const spawn = context.spawnsByEntry.get(current)

  return spawn === undefined ? null : createSpawnSupply(context, spawn, target, path)
}

const findSupply = <T>(context: GravityContext<T>, target: CellKey): Supply<T> | null => {
  const path = [target]
  let current = target

  while (true) {
    const incoming = getIncoming(context.options.graph, current)
    if (incoming === null) {
      return getTerminalSupply(context, current, target, path)
    }

    const supply = createCellSupply(context.state, incoming, path)
    if (supply !== null) {
      return supply
    }

    path.push(incoming)
    current = incoming
  }
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
    phase: 0,
    resolutionOrder: (context.options.orderOffset ?? 0) + context.movements.length,
  })
}

const resolveTarget = <T>(context: GravityContext<T>, target: CellKey): void => {
  if (getTile(context.state, target) !== null) {
    return
  }

  const supply = findSupply(context, target)
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
