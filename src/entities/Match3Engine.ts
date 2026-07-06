import { findMatchedPositions, findMoveMatchedPositions } from '@/entities/Match3Matches'

export { findMatchedPositions, findMoveMatchedPositions } from '@/entities/Match3Matches'

export type BoardTile = string
export type BoardCell<T extends BoardTile = BoardTile> = T | null
export type Board<T extends BoardTile = BoardTile> = Array<Array<BoardCell<T>>>
export type Position = {
  row: number
  column: number
}
export type MoveResult<T extends BoardTile = BoardTile> = {
  accepted: boolean
  board: Array<T[]>
  cleared: T[]
  cascades: number
}

export const cloneBoard = <T extends BoardTile>(board: Board<T>): Board<T> => {
  return board.map(row => [...row])
}
export const swapBoardTiles = <T extends BoardTile>(board: Board<T>, a: Position, b: Position): Board<T> => {
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

export const resolveBoard = <T extends BoardTile>(board: Board<T>, refillTiles: T[]): MoveResult<T> => {
  let nextBoard = cloneBoard(board)
  const cleared: T[] = []
  let refillIndex = 0
  let cascades = 0

  while (true) {
    const matched = findMatchedPositions(nextBoard)

    if (matched.length === 0) {
      return { accepted: cascades > 0, board: nextBoard as Array<T[]>, cleared, cascades }
    }

    clearMatchedTiles(nextBoard, matched, cleared)
    ;({ board: nextBoard, refillIndex } = collapseAndRefill(nextBoard, refillTiles, refillIndex))
    cascades++
  }
}

export const applyMove = <T extends BoardTile>(
  board: Board<T>,
  from: Position,
  to: Position,
  refillTiles: T[]
): MoveResult<T> => {
  if (!isNeighborPosition(from, to)) {
    return { accepted: false, board: cloneBoard(board) as Array<T[]>, cleared: [], cascades: 0 }
  }

  const swappedBoard = swapBoardTiles(board, from, to)

  if (findMoveMatchedPositions(swappedBoard, from, to).length === 0) {
    return { accepted: false, board: cloneBoard(board) as Array<T[]>, cleared: [], cascades: 0 }
  }

  return resolveBoard(swappedBoard, refillTiles)
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

const getEmptyPositions = <T extends BoardTile>(board: Board<T>): Position[] => {
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

const clearMatchedTiles = <T extends BoardTile>(board: Board<T>, matched: Position[], cleared: T[]): void => {
  matched.forEach(({ row, column }) => {
    const tile = board[row][column]

    if (tile !== null) {
      cleared.push(tile)
    }

    board[row][column] = null
  })
}

const collapseAndRefill = <T extends BoardTile>(
  board: Board<T>,
  refillTiles: T[],
  refillIndex: number
): { board: Board<T>, refillIndex: number } => {
  const collapsedBoard = collapseBoard(board)
  const refillSize = getEmptyPositions(collapsedBoard).length

  return {
    board: refillBoard(collapsedBoard, refillTiles.slice(refillIndex, refillIndex + refillSize)),
    refillIndex: refillIndex + refillSize,
  }
}
