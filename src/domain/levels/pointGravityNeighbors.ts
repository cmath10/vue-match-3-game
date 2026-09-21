import type { BoardTopology, CellKey, Direction } from '@/domain/levels/types'
import type { Position } from '@/domain/types'

import { DELTAS, DIRECTIONS } from '@/domain/levels/gravityGeometry'
import { getCellKey } from '@/domain/levels/coordinates'
import { movePosition } from '@/domain/levels/gravityGeometry'

const getDiagonal = (
  position: Position,
  first: Direction,
  second: Direction
): Position | null => {
  const row = DELTAS[first].row + DELTAS[second].row
  const column = DELTAS[first].column + DELTAS[second].column

  return Math.abs(row) === 1 && Math.abs(column) === 1
    ? { row: position.row + row, column: position.column + column }
    : null
}

const getDiagonalNeighbor = (
  topology: BoardTopology,
  position: Position,
  first: Direction,
  second: Direction
): CellKey | null => {
  const diagonal = getDiagonal(position, first, second)
  const openCorner = [first, second].some(direction => (
    topology.playableCells.has(getCellKey(movePosition(position, direction)))
  ))

  if (diagonal === null || !openCorner) {
    return null
  }
  const key = getCellKey(diagonal)

  return topology.playableCells.has(key) ? key : null
}

export const getPointGravityNeighbors = (
  topology: BoardTopology,
  position: Position,
  directions: readonly Direction[] = DIRECTIONS
): CellKey[] => {
  const validDirections = directions.filter(direction => DIRECTIONS.includes(direction))
  const straight = validDirections.map(direction => getCellKey(movePosition(position, direction)))
    .filter(key => topology.playableCells.has(key))
  const diagonals = validDirections.flatMap((first, index) => validDirections.slice(index + 1).map(second => (
    getDiagonalNeighbor(topology, position, first, second)
  ))).filter((key): key is CellKey => key !== null)

  return [...straight, ...diagonals]
}
