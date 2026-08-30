import type { BoardState, BoardTile } from '@/domain/types'
import type { GravityGraph } from '@/domain/levels/types'
import type { MoveResult, Position } from '@/domain/types'
import type { SpawnDefinition } from '@/domain/levels/types'

import { cloneBoardState } from '@/domain/board/topology'
import { collapseAndRefillBoard } from '@/domain/board/transitions'
import { findMatchedPositions, findMoveMatchedPositions } from '@/domain/board/matches'
import { isNeighborPosition, swapBoardTiles } from '@/domain/board/transitions'

type BoardRules = {
  gravity: GravityGraph
  spawns: readonly SpawnDefinition[]
}

type ResolutionContext<T extends BoardTile> = {
  state: BoardState<T>
  rules: BoardRules
  refillTiles: readonly T[]
  cleared: T[]
  refillIndex: number
  cascades: number
}

const resolveNextCascade = <T extends BoardTile>(context: ResolutionContext<T>): boolean => {
  const matched = findMatchedPositions(context.state)

  if (matched.length === 0) {
    return false
  }

  clearMatchedTiles(context.state, matched, context.cleared)
  const result = collapseAndRefillBoard(
    context.state,
    context.rules.gravity,
    context.rules.spawns,
    context.refillTiles.slice(context.refillIndex)
  )

  context.state = result.state
  context.refillIndex += result.refillCount
  context.cascades++
  return true
}

const toMoveResult = <T extends BoardTile>(context: ResolutionContext<T>): MoveResult<T> => ({
  accepted: context.cascades > 0,
  board: context.state.occupancy,
  cleared: context.cleared,
  cascades: context.cascades,
})

export const resolveBoard = <T extends BoardTile>(
  state: BoardState<T>,
  rules: BoardRules,
  refillTiles: readonly T[]
): MoveResult<T> => {
  const context: ResolutionContext<T> = {
    state: cloneBoardState(state), rules, refillTiles, cleared: [], refillIndex: 0, cascades: 0,
  }

  let resolving = true

  while (resolving) {
    resolving = resolveNextCascade(context)
  }

  return toMoveResult(context)
}

export const applyMove = <T extends BoardTile>(
  state: BoardState<T>,
  rules: BoardRules,
  from: Position,
  to: Position,
  refillTiles: readonly T[]
): MoveResult<T> => {
  if (!isNeighborPosition(state, from, to)) {
    return rejectedMove(state)
  }

  const swappedState = swapBoardTiles(state, from, to)
  if (findMoveMatchedPositions(swappedState, from, to).length === 0) {
    return rejectedMove(state)
  }

  return resolveBoard(swappedState, rules, refillTiles)
}

const rejectedMove = <T extends BoardTile>(state: BoardState<T>): MoveResult<T> => ({
  accepted: false,
  board: cloneBoardState(state).occupancy,
  cleared: [],
  cascades: 0,
})

const clearMatchedTiles = <T extends BoardTile>(
  state: BoardState<T>,
  matched: Position[],
  cleared: T[]
): void => {
  matched.forEach(({ row, column }) => {
    const tile = state.occupancy[row][column]

    if (tile !== null) {
      cleared.push(tile)
    }
    state.occupancy[row][column] = null
  })
}
