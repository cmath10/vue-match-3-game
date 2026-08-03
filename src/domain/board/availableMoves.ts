import type { Board, BoardTile, Position } from '@/domain/types'

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
  board: Board<T>,
  from: Position,
  to: Position
): boolean => {
  const swapped = swapBoardTiles(board, from, to)

  return getMoveMatch(swapped, to, from).positions.length > 0
}

export const hasAvailableMove = <T extends BoardTile>(
  board: Board<T>,
  movable: boolean[][]
): boolean => {
  return board.some((row, rowIndex) => row.some((_, columnIndex) => {
    const from = { row: rowIndex, column: columnIndex }

    return canMove(movable, from) && getNeighbors(from).some(to => (
      canMove(movable, to) && createsMatch(board, from, to)
    ))
  }))
}
