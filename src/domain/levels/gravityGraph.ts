import type {
  BoardTopology,
  CellKey,
  GravityGraph,
  GravityNode,
} from '@/domain/levels/types'
import type { LevelCompilationError } from '@/domain/levels/errors'
import type { SpawnDefinition } from '@/domain/levels/types'

import { getCellKey } from '@/domain/levels/coordinates'
import { levelError } from '@/domain/levels/errors'
import { parseCellKey } from '@/domain/levels/coordinates'

const compareKeys = (a: CellKey, b: CellKey): number => {
  const first = parseCellKey(a)
  const second = parseCellKey(b)

  return first.row - second.row || first.column - second.column
}

const getIncoming = (
  nextByCell: ReadonlyMap<CellKey, CellKey | null>
): Map<CellKey, CellKey[]> => {
  const incoming = new Map([...nextByCell.keys()].map(key => [key, [] as CellKey[]]))

  nextByCell.forEach((next, key) => {
    if (next !== null) {
      incoming.get(next)?.push(key)
    }
  })
  incoming.forEach(items => items.sort(compareKeys))
  return incoming
}

const getSettlementOrder = (nodes: ReadonlyMap<CellKey, GravityNode>): CellKey[] => {
  const queue = [...nodes]
    .filter(([, node]) => node.next === null)
    .map(([key]) => key)
    .sort(compareKeys)
  const order: CellKey[] = []

  while (queue.length > 0) {
    const key = queue.shift()!

    order.push(key)
    queue.push(...(nodes.get(key)?.incoming ?? []))
  }

  return order
}

const getCycleErrors = (
  nodes: ReadonlyMap<CellKey, GravityNode>,
  settlementOrder: readonly CellKey[]
): LevelCompilationError[] => {
  const settled = new Set(settlementOrder)

  return [...nodes.keys()].flatMap(key => settled.has(key) ? [] : [levelError(
    'gravity-cycle',
    ['gravity', 'nextByCell', key],
    `Gravity path from ${key} does not reach a terminal cell`
  )])
}

const getReachableCells = (
  nodes: ReadonlyMap<CellKey, GravityNode>,
  spawns: readonly SpawnDefinition[]
): Set<CellKey> => {
  const reachable = new Set<CellKey>()

  spawns.forEach((spawn) => {
    let current: CellKey | null | undefined = getCellKey(spawn.entry)

    while (current !== null && current !== undefined && !reachable.has(current)) {
      reachable.add(current)
      current = nodes.get(current)?.next
    }
  })
  return reachable
}

const getReachabilityErrors = (
  nodes: ReadonlyMap<CellKey, GravityNode>,
  spawns: readonly SpawnDefinition[]
): LevelCompilationError[] => {
  const reachable = getReachableCells(nodes, spawns)

  return [...nodes.keys()].flatMap(key => reachable.has(key) ? [] : [levelError(
    'unreachable-cell',
    ['gravity', key],
    `Cell ${key} is not reachable from a spawn`
  )])
}

const getSpawnRootErrors = (
  nodes: ReadonlyMap<CellKey, GravityNode>,
  spawns: readonly SpawnDefinition[]
): LevelCompilationError[] => spawns.flatMap((spawn, index) => {
  const key = getCellKey(spawn.entry)
  const incoming = nodes.get(key)?.incoming ?? []

  return incoming.length === 0 ? [] : [levelError(
    'invalid-spawn',
    ['spawns', index, 'entry'],
    `Spawn entry ${key} must be an upstream root`
  )]
})

const createNodes = (
  topology: BoardTopology,
  nextByCell: ReadonlyMap<CellKey, CellKey | null>
): Map<CellKey, GravityNode> => {
  const incoming = getIncoming(nextByCell)

  return new Map([...topology.playableCells].map((key): [CellKey, GravityNode] => [key, {
    next: nextByCell.get(key) ?? null,
    incoming: incoming.get(key) ?? [],
  }]))
}

export const compileGravityGraph = (
  topology: BoardTopology,
  nextByCell: ReadonlyMap<CellKey, CellKey | null>,
  spawns: readonly SpawnDefinition[]
): { gravity: GravityGraph; errors: LevelCompilationError[] } => {
  const nodes = createNodes(topology, nextByCell)
  const settlementOrder = getSettlementOrder(nodes)

  return {
    gravity: { nodes, settlementOrder },
    errors: [
      ...getCycleErrors(nodes, settlementOrder),
      ...getReachabilityErrors(nodes, spawns),
      ...getSpawnRootErrors(nodes, spawns),
    ],
  }
}
