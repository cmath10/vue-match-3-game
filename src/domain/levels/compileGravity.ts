import type {
  BoardEdgeAnchor,
  BoardTopology,
  CellKey,
  Direction,
  GravityGraph,
} from '@/domain/levels/types'
import type { LevelCompilationError } from '@/domain/levels/errors'
import type { Position } from '@/domain/types'
import type { SpawnDefinition } from '@/domain/levels/types'

import { getCellKey } from '@/domain/levels/coordinates'
import { levelError } from '@/domain/levels/errors'
import { parseCellKey } from '@/domain/levels/coordinates'

type GravityCompilation = {
  gravity: GravityGraph
  errors: LevelCompilationError[]
}

const DELTAS: Record<Direction, Position> = {
  down: { row: 1, column: 0 },
  up: { row: -1, column: 0 },
  left: { row: 0, column: -1 },
  right: { row: 0, column: 1 },
}

const getNextPosition = (position: Position, direction: Direction): Position => ({
  row: position.row + DELTAS[direction].row,
  column: position.column + DELTAS[direction].column,
})

const getNextByCell = (topology: BoardTopology, direction: Direction): Map<CellKey, CellKey | null> => {
  return new Map([...topology.playableCells].map((key) => {
    const nextKey = getCellKey(getNextPosition(parseCellKey(key), direction))

    return [key, topology.playableCells.has(nextKey) ? nextKey : null]
  }))
}

const getIncomingByCell = (nextByCell: ReadonlyMap<CellKey, CellKey | null>): Map<CellKey, CellKey[]> => {
  const incoming = new Map([...nextByCell.keys()].map(key => [key, [] as CellKey[]]))

  nextByCell.forEach((next, key) => {
    if (next !== null) {
      incoming.get(next)?.push(key)
    }
  })

  return incoming
}

const compareVertical = (a: Position, b: Position, direction: Direction): number => {
  const rowOrder = direction === 'down' ? b.row - a.row : a.row - b.row

  return a.column - b.column || rowOrder
}

const compareHorizontal = (a: Position, b: Position, direction: Direction): number => {
  const columnOrder = direction === 'right' ? b.column - a.column : a.column - b.column

  return a.row - b.row || columnOrder
}

const compareByDirection = (a: CellKey, b: CellKey, direction: Direction): number => {
  const aPosition = parseCellKey(a)
  const bPosition = parseCellKey(b)

  return direction === 'down' || direction === 'up'
    ? compareVertical(aPosition, bPosition, direction)
    : compareHorizontal(aPosition, bPosition, direction)
}

const getSettlementOrder = (keys: CellKey[], direction: Direction): CellKey[] => (
  [...keys].sort((a, b) => compareByDirection(a, b, direction))
)

const getReachableCells = (
  nextByCell: ReadonlyMap<CellKey, CellKey | null>,
  spawns: readonly SpawnDefinition[]
): Set<CellKey> => {
  const reachable = new Set<CellKey>()

  spawns.forEach((spawn) => {
    let current: CellKey | null | undefined = getCellKey(spawn.entry)

    while (current !== null && current !== undefined && !reachable.has(current)) {
      reachable.add(current)
      current = nextByCell.get(current)
    }
  })

  return reachable
}

const getReachabilityErrors = (
  nextByCell: ReadonlyMap<CellKey, CellKey | null>,
  spawns: readonly SpawnDefinition[]
): LevelCompilationError[] => {
  const reachable = getReachableCells(nextByCell, spawns)

  return [...nextByCell.keys()].flatMap(key => reachable.has(key) ? [] : [levelError(
    'unreachable-cell',
    ['gravity', key],
    `Cell ${key} is not reachable from a spawn`
  )])
}

export const compileDirectionalGravity = (
  topology: BoardTopology,
  direction: Direction,
  spawns: readonly SpawnDefinition[]
): GravityCompilation => {
  const nextByCell = getNextByCell(topology, direction)
  const incomingByCell = getIncomingByCell(nextByCell)
  const nodes = new Map([...nextByCell].map(([key, next]) => [key, {
    next,
    incoming: incomingByCell.get(key) ?? [],
  }]))

  return {
    gravity: { nodes, settlementOrder: getSettlementOrder([...nodes.keys()], direction) },
    errors: getReachabilityErrors(nextByCell, spawns),
  }
}

export const getDirectionAnchor = (direction: Direction, terminal: Position): BoardEdgeAnchor => {
  if (direction === 'down' || direction === 'up') {
    return { side: direction === 'down' ? 'bottom' : 'top', column: terminal.column }
  }

  return { side: direction === 'left' ? 'left' : 'right', row: terminal.row }
}
