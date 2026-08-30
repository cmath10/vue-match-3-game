import type { BoardState, BoardTile, Position } from '@/domain/types'

import { getMoveMatch } from '@/domain/boosters/creation'
import { swapBoardTiles } from '@/domain/board/transitions'

const getNeighbors = ({ row, column }: Position): Position[] => [
  { row, column: column + 1 },
  { row: row + 1, column },
]

const canMove = (movable: boolean[][], position: Position): boolean => (
  movable[position.row]?.[position.column] === true
)

const createsMatch = <T extends BoardTile>(
  state: BoardState<T>,
  from: Position,
  to: Position
): boolean => {
  const swapped = swapBoardTiles(state, from, to)

  return getMoveMatch(swapped, to, from).positions.length > 0
}

export const hasAvailableMove = <T extends BoardTile>(
  state: BoardState<T>,
  movable: boolean[][]
): boolean => {
  return state.occupancy.some((row, rowIndex) => row.some((_, columnIndex) => {
    const from = { row: rowIndex, column: columnIndex }

    return canMove(movable, from) && getNeighbors(from).some(to => (
      canMove(movable, to) && createsMatch(state, from, to)
    ))
  }))
}
