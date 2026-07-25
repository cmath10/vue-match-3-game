import type { Board, BoardTile, Position } from '@/domain/types'

export const cloneBoard = <T extends BoardTile>(board: Board<T>): Board<T> => {
  return board.map(row => [...row])
}

export const swapBoardTiles = <T extends BoardTile>(
  board: Board<T>,
  a: Position,
  b: Position
): Board<T> => {
  const nextBoard = cloneBoard(board)
  const tile = nextBoard[a.row][a.column]

  nextBoard[a.row][a.column] = nextBoard[b.row][b.column]
  nextBoard[b.row][b.column] = tile

  return nextBoard
}

export const isNeighborPosition = (a: Position, b: Position): boolean => {
  return (a.row === b.row && Math.abs(a.column - b.column) === 1) ||
    (a.column === b.column && Math.abs(a.row - b.row) === 1)
}

export const collapseBoard = <T extends BoardTile>(board: Board<T>): Board<T> => {
  const nextBoard = cloneBoard(board)
  const width = nextBoard[0].length

  for (let column = 0; column < width; column++) {
    fillColumn(nextBoard, column, getColumnTiles(nextBoard, column))
  }

  return nextBoard
}

export const refillBoard = <T extends BoardTile>(board: Board<T>, refillTiles: T[]): Board<T> => {
  const nextBoard = cloneBoard(board)

  getEmptyPositions(nextBoard).forEach((position, index) => {
    const tile = refillTiles[index]

    if (tile === undefined) {
      throw new Error('Not enough refill tiles')
    }

    nextBoard[position.row][position.column] = tile
  })

  return nextBoard
}

export const getEmptyPositions = <T extends BoardTile>(board: Board<T>): Position[] => {
  const positions: Position[] = []

  board[0].forEach((_, column) => {
    for (let row = board.length - 1; row >= 0; row--) {
      if (board[row][column] === null) {
        positions.push({ row, column })
      }
    }
  })

  return positions
}

const getColumnTiles = <T extends BoardTile>(board: Board<T>, column: number): T[] => {
  const tiles: T[] = []

  for (let row = board.length - 1; row >= 0; row--) {
    const tile = board[row][column]

    if (tile !== null) {
      tiles.push(tile)
    }
  }

  return tiles
}

const fillColumn = <T extends BoardTile>(board: Board<T>, column: number, tiles: T[]): void => {
  for (let row = board.length - 1; row >= 0; row--) {
    board[row][column] = tiles.shift() ?? null
  }
}
