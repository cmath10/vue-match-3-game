import type {
  Board,
  BoardCell,
  BoardState,
  BoardTile,
  MatchLine,
  MatchOrientation,
  Position,
} from '@/domain/types'

const MIN_MATCH_LENGTH = 3

export const findMatchLines = <T extends BoardTile>(state: BoardState<T>): Array<MatchLine<T>> => {
  const rows = state.occupancy.flatMap((row, index) => getBoardLineMatches(row, 'row', index))
  const columns = getColumns(state.occupancy)
    .flatMap((column, index) => getBoardLineMatches(column, 'column', index))

  return [...rows, ...columns]
}

export const findMatchedPositions = <T extends BoardTile>(state: BoardState<T>): Position[] => {
  return getMatchPositions(findMatchLines(state))
}

export const getMatchPositions = <T extends BoardTile>(lines: Array<MatchLine<T>>): Position[] => {
  const matched = new Map<string, Position>()

  lines.forEach(line => line.positions.forEach(position => {
    matched.set(getPositionKey(position), position)
  }))

  return [...matched.values()]
}

export const findMoveMatchedPositions = <T extends BoardTile>(
  state: BoardState<T>,
  from: Position,
  to: Position
): Position[] => {
  return getMatchPositions(findMoveMatchLines(state, from, to))
}

export const findMoveMatchLines = <T extends BoardTile>(
  state: BoardState<T>,
  from: Position,
  to: Position
): Array<MatchLine<T>> => {
  const lines = findMatchLines(state)
  const moveLines = lines.filter(line => (
    line.positions.some(position => isSamePosition(position, from) || isSamePosition(position, to))
  ))

  return [...new Set(moveLines.flatMap(line => findConnectedMatchLines(lines, line)))]
}

export const findMatchGroup = <T extends BoardTile>(
  lines: Array<MatchLine<T>>,
  position: Position
): Array<MatchLine<T>> => {
  const line = lines.find(candidate => candidate.positions.some(item => isSamePosition(item, position)))

  return line === undefined ? [] : findConnectedMatchLines(lines, line)
}

export const findMatchGroups = <T extends BoardTile>(lines: Array<MatchLine<T>>): Array<Array<MatchLine<T>>> => {
  const pending = new Set(lines)
  const groups: Array<Array<MatchLine<T>>> = []

  while (pending.size > 0) {
    const initialLine = pending.values().next().value as MatchLine<T>
    const group = findConnectedMatchLines(lines, initialLine)

    group.forEach(line => pending.delete(line))
    groups.push(group)
  }

  return groups
}

type LineMatch<T extends BoardTile> = {
  type: T
  indexes: number[]
}

const getBoardLineMatches = <T extends BoardTile>(
  cells: Array<BoardCell<T>>,
  orientation: MatchOrientation,
  fixedIndex: number
): Array<MatchLine<T>> => {
  return collectLineMatches(cells).map(match => ({
    type: match.type,
    orientation,
    positions: match.indexes.map(index => orientation === 'row'
      ? { row: fixedIndex, column: index }
      : { row: index, column: fixedIndex }),
  }))
}

const collectLineMatches = <T extends BoardTile>(line: Array<BoardCell<T>>): Array<LineMatch<T>> => {
  const matches: Array<LineMatch<T>> = []
  let start = 0

  for (let index = 1; index <= line.length; index++) {
    if (line[index] === line[start]) {
      continue
    }

    const match = getMatchedRange(line[start], start, index)

    if (match !== null) {
      matches.push(match)
    }

    start = index
  }

  return matches
}

const getMatchedRange = <T extends BoardTile>(
  tile: BoardCell<T>,
  start: number,
  end: number
): LineMatch<T> | null => {
  if (tile === null || end - start < MIN_MATCH_LENGTH) {
    return null
  }

  return {
    type: tile,
    indexes: Array.from({ length: end - start }, (_, index) => start + index),
  }
}

const getColumns = <T extends BoardTile>(board: Board<T>): Board<T> => {
  return board[0].map((_, column) => board.map(row => row[column]))
}

const findConnectedMatchLines = <T extends BoardTile>(
  lines: Array<MatchLine<T>>,
  initialLine: MatchLine<T>
): Array<MatchLine<T>> => {
  const pending = [initialLine]
  const group = new Set<MatchLine<T>>()

  while (pending.length > 0) {
    const line = pending.shift()

    if (line !== undefined && !group.has(line)) {
      group.add(line)
      enqueueIntersectingLines(lines, line, pending)
    }
  }

  return [...group]
}

const enqueueIntersectingLines = <T extends BoardTile>(
  lines: Array<MatchLine<T>>,
  line: MatchLine<T>,
  pending: Array<MatchLine<T>>
): void => {
  lines
    .filter(candidate => candidate.type === line.type && linesIntersect(candidate, line))
    .forEach(candidate => pending.push(candidate))
}

const linesIntersect = <T extends BoardTile>(a: MatchLine<T>, b: MatchLine<T>): boolean => {
  return a.positions.some(position => b.positions.some(item => isSamePosition(item, position)))
}

const getPositionKey = ({ row, column }: Position): string => `${row}-${column}`
const isSamePosition = (a: Position, b: Position): boolean => a.row === b.row && a.column === b.column
