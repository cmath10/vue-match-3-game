import type { Board, BoardCell, BoardTile, Position } from '@/entities/Match3Engine'

const MIN_MATCH_LENGTH = 3

export const findMatchedPositions = <T extends BoardTile>(board: Board<T>): Position[] => {
  const matched = new Map<string, Position>()
  const add = (row: number, column: number) => matched.set(`${row}-${column}`, { row, column })

  board.forEach((row, rowIndex) => {
    collectLineMatches(row).forEach(column => add(rowIndex, column))
  })

  getColumns(board).forEach((column, columnIndex) => {
    collectLineMatches(column).forEach(row => add(row, columnIndex))
  })

  return [...matched.values()]
}

export const findMoveMatchedPositions = <T extends BoardTile>(board: Board<T>, from: Position, to: Position): Position[] => {
  return findMatchedPositions(board).filter(position => (
    isInSameMatchLine(board, position, from) || isInSameMatchLine(board, position, to)
  ))
}

const collectLineMatches = <T extends BoardTile>(line: Array<BoardCell<T>>): number[] => {
  const matched: number[] = []
  let start = 0

  for (let index = 1; index <= line.length; index++) {
    if (line[index] === line[start]) {
      continue
    }

    matched.push(...getMatchedRange(line[start], start, index))
    start = index
  }

  return matched
}

const getMatchedRange = <T extends BoardTile>(tile: BoardCell<T>, start: number, end: number): number[] => {
  if (tile === null || end - start < MIN_MATCH_LENGTH) {
    return []
  }

  return Array.from({ length: end - start }, (_, index) => start + index)
}

const getColumns = <T extends BoardTile>(board: Board<T>): Board<T> => {
  return board[0].map((_, column) => board.map(row => row[column]))
}

const isInSameMatchLine = <T extends BoardTile>(board: Board<T>, position: Position, pivot: Position): boolean => {
  return isInSameHorizontalMatch(board, position, pivot) || isInSameVerticalMatch(board, position, pivot)
}

const isInSameHorizontalMatch = <T extends BoardTile>(board: Board<T>, position: Position, pivot: Position): boolean => {
  return position.row === pivot.row && getContiguousMatchIndexes(board[pivot.row], pivot.column).includes(position.column)
}

const isInSameVerticalMatch = <T extends BoardTile>(board: Board<T>, position: Position, pivot: Position): boolean => {
  return position.column === pivot.column &&
    getContiguousMatchIndexes(getColumns(board)[pivot.column], pivot.row).includes(position.row)
}

const getContiguousMatchIndexes = <T extends BoardTile>(line: Array<BoardCell<T>>, index: number): number[] => {
  const tile = line[index]

  if (tile === null) {
    return []
  }

  const indexes = [index]

  for (let prevIndex = index - 1; line[prevIndex] === tile; prevIndex--) {
    indexes.push(prevIndex)
  }

  for (let nextIndex = index + 1; line[nextIndex] === tile; nextIndex++) {
    indexes.push(nextIndex)
  }

  return indexes.length >= MIN_MATCH_LENGTH ? indexes : []
}
