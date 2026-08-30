import type { BoardState, BoardTile } from '@/domain/types'
import type { GravityGraph, GravityState } from '@/domain/levels/types'
import type { MoveResult, Position } from '@/domain/types'
import type { SpawnDefinition } from '@/domain/levels/types'

import { cloneBoardState } from '@/domain/board/topology'
import { collapseAndRefillBoard } from '@/domain/board/transitions'
import { createGravityState } from '@/domain/levels/gravityState'
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
  gravityState: GravityState
}

const applyCascadeResult = <T extends BoardTile>(
  context: ResolutionContext<T>,
  result: ReturnType<typeof collapseAndRefillBoard<T>>
): void => {
  context.state = result.state
  context.refillIndex += result.refillCount
  context.cascades++
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
    context.refillTiles.slice(context.refillIndex),
    context.gravityState
  )

  applyCascadeResult(context, result)
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
  refillTiles: readonly T[],
  gravityState = createGravityState()
): MoveResult<T> => {
  const context: ResolutionContext<T> = {
    state: cloneBoardState(state), rules, refillTiles, cleared: [], refillIndex: 0, cascades: 0,
    gravityState,
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
  refillTiles: readonly T[],
  gravityState = createGravityState()
): MoveResult<T> => {
  if (!isNeighborPosition(state, from, to)) {
    return rejectedMove(state)
  }

  const swappedState = swapBoardTiles(state, from, to)
  if (findMoveMatchedPositions(swappedState, from, to).length === 0) {
    return rejectedMove(state)
  }

  return resolveBoard(swappedState, rules, refillTiles, gravityState)
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
