import type { AttemptRandom } from '@/domain/random'
import type { Board } from '@/domain/types'
import type {
  BoardTopology,
  CompiledLevel,
  FixedTileDefinition,
  InitialCellDefinition,
  PackageBlockerDefinition,
} from '@/domain/levels/types'

import { findMatchedPositions } from '@/domain/board/matches'
import { getCellKey } from '@/domain/levels/coordinates'
import { hasAvailableMove } from '@/domain/board/availableMoves'

import { TileType } from '@/domain/enums'

const MAX_INITIAL_BOARD_ATTEMPTS = 100

export type MaterializedBoard = Array<Array<FixedTileDefinition | null>>

export class InitialBoardMaterializationError extends Error {
  public constructor (levelId: number, attempts: number) {
    super(`Could not materialize playable level ${levelId} after ${attempts} attempts`)
    this.name = 'InitialBoardMaterializationError'
  }
}

const cloneBlocker = (blocker?: PackageBlockerDefinition) => (
  blocker === undefined ? undefined : { ...blocker }
)

const createsMatchAt = (
  board: MaterializedBoard,
  tile: FixedTileDefinition,
  row: number,
  column: number,
  topology: BoardTopology
): boolean => {
  board[row][column] = tile
  const matched = findMatchedPositions({
    topology,
    occupancy: getMatchableBoard(board),
  })

  board[row][column] = null
  return matched.some(position => position.row === row && position.column === column)
}

const getPool = (level: CompiledLevel, poolId: string) => {
  const pool = level.tilePools.get(poolId)

  if (pool === undefined) {
    throw new Error(`Unknown tile pool: ${poolId}`)
  }

  return pool
}

const materializeRandomCell = (
  level: CompiledLevel,
  cell: Extract<InitialCellDefinition, { kind: 'random' }>,
  random: AttemptRandom,
  board: MaterializedBoard,
  row: number,
  column: number
): FixedTileDefinition => {
  const pool = getPool(level, cell.pool)
  const candidates = random.shuffle(pool.types).map(type => ({
    kind: 'ordinary' as const,
    type,
    blocker: cloneBlocker(cell.blocker),
  }))

  return candidates.find(tile => !createsMatchAt(
    board, tile, row, column, level.topology
  )) ?? candidates[0]
}

const cloneFixedTile = (tile: FixedTileDefinition): FixedTileDefinition => (
  { ...tile, ...('blocker' in tile ? { blocker: cloneBlocker(tile.blocker) } : {}) }
)

const materializePosition = (
  level: CompiledLevel,
  random: AttemptRandom,
  board: MaterializedBoard,
  row: number,
  column: number
): FixedTileDefinition | null => {
  const cell = level.initialBoard.cells.get(getCellKey({ row, column }))

  if (cell === undefined) {
    return null
  }
  if (cell.kind === 'random') {
    return materializeRandomCell(level, cell, random, board, row, column)
  }

  return cloneFixedTile(cell.tile)
}

const materializeCandidate = (level: CompiledLevel, random: AttemptRandom): MaterializedBoard => {
  const { width, height } = level.topology.bounds
  const board: MaterializedBoard = Array.from(
    { length: height },
    () => Array.from({ length: width }, (): null => null)
  )

  board.forEach((rowCells, row) => rowCells.forEach((_, column) => {
    board[row][column] = materializePosition(level, random, board, row, column)
  }))

  return board
}

const getMatchableBoard = (board: MaterializedBoard): Board<TileType> => (
  board.map(row => row.map(tile => tile?.kind === 'ordinary' ? tile.type : null))
)

const getMovableBoard = (board: MaterializedBoard): boolean[][] => (
  board.map(row => row.map(tile => tile?.kind === 'ordinary' && tile.blocker === undefined))
)

const isPlayableCandidate = (level: CompiledLevel, board: MaterializedBoard): boolean => {
  const matchable = getMatchableBoard(board)

  const state = { topology: level.topology, occupancy: matchable }

  return findMatchedPositions(state).length === 0 && hasAvailableMove(state, getMovableBoard(board))
}

export const materializeInitialBoard = (
  level: CompiledLevel,
  random: AttemptRandom,
  maxAttempts = MAX_INITIAL_BOARD_ATTEMPTS
): MaterializedBoard => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = materializeCandidate(level, random)

    if (isPlayableCandidate(level, candidate)) {
      return candidate
    }
  }

  throw new InitialBoardMaterializationError(level.id, maxAttempts)
}
