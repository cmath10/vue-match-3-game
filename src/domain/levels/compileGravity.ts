import type {
  BoardTopology,
  CellKey,
  Direction,
  GravityGraph,
} from '@/domain/levels/types'
import type { LevelCompilationError } from '@/domain/levels/errors'
import type { Position } from '@/domain/types'
import type { SpawnDefinition } from '@/domain/levels/types'

import { compileGravityGraph } from '@/domain/levels/gravityGraph'
import { getCellKey } from '@/domain/levels/coordinates'
import { getDirectionAnchor, movePosition } from '@/domain/levels/gravityGeometry'
import { parseCellKey } from '@/domain/levels/coordinates'

type GravityCompilation = {
  gravity: GravityGraph
  errors: LevelCompilationError[]
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
  const first = parseCellKey(a)
  const second = parseCellKey(b)

  return direction === 'down' || direction === 'up'
    ? compareVertical(first, second, direction)
    : compareHorizontal(first, second, direction)
}

const getNextByCell = (topology: BoardTopology, direction: Direction): Map<CellKey, CellKey | null> => {
  return new Map([...topology.playableCells].map((key) => {
    const [row, column] = key.split(':').map(Number)
    const nextKey = getCellKey(movePosition({ row, column }, direction))

    return [key, topology.playableCells.has(nextKey) ? nextKey : null]
  }))
}

export const compileDirectionalGravity = (
  topology: BoardTopology,
  direction: Direction,
  spawns: readonly SpawnDefinition[]
): GravityCompilation => {
  const nextByCell = getNextByCell(topology, direction)
  const compilation = compileGravityGraph(topology, nextByCell, spawns)

  return {
    gravity: {
      ...compilation.gravity,
      settlementOrder: [...compilation.gravity.nodes.keys()].sort((a, b) => (
        compareByDirection(a, b, direction)
      )),
    },
    errors: compilation.errors,
  }
}

export { getDirectionAnchor }
