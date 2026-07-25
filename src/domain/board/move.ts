import type {
  Board,
  BoardTile,
  MoveResult,
  Position,
} from '@/domain/types'

import { cloneBoard, collapseBoard } from '@/domain/board/transitions'
import { findMatchedPositions, findMoveMatchedPositions } from '@/domain/board/matches'
import {
  getEmptyPositions,
  isNeighborPosition,
  refillBoard,
  swapBoardTiles,
} from '@/domain/board/transitions'

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
