import type { BoardState, BoardTile } from '@/domain/types'
import type { GravityGraph } from '@/domain/levels/types'
import type { Position } from '@/domain/types'
import type { SpawnDefinition } from '@/domain/levels/types'

import { cloneBoardState } from '@/domain/board/topology'
import { createGravityState } from '@/domain/levels/gravityState'
import { getCellKey } from '@/domain/levels/coordinates'
import { resolveGravity } from '@/domain/board/gravity'

const isAdjacent = (a: Position, b: Position): boolean => (
  (a.row === b.row && Math.abs(a.column - b.column) === 1) ||
  (a.column === b.column && Math.abs(a.row - b.row) === 1)
)

export const swapBoardTiles = <T extends BoardTile>(
  state: BoardState<T>,
  a: Position,
  b: Position
): BoardState<T> => {
  const nextState = cloneBoardState(state)
  const tile = nextState.occupancy[a.row][a.column]

  nextState.occupancy[a.row][a.column] = nextState.occupancy[b.row][b.column]
  nextState.occupancy[b.row][b.column] = tile

  return nextState
}

export const isNeighborPosition = <T>(state: BoardState<T>, a: Position, b: Position): boolean => {
  const playable = state.topology.playableCells
  return isAdjacent(a, b) && playable.has(getCellKey(a)) && playable.has(getCellKey(b))
}

const createRefillTile = <T extends BoardTile>(refillTiles: readonly T[], getIndex: () => number): T => {
  const tile = refillTiles[getIndex()]

  if (tile === undefined) {
    throw new Error('Not enough refill tiles')
  }

  return tile
}

export const collapseBoard = <T extends BoardTile>(
  state: BoardState<T>,
  gravity: GravityGraph,
  gravityState = createGravityState()
): BoardState<T> => resolveGravity({
  state,
  graph: gravity,
  gravityState,
  spawns: [],
  spawnTile: () => { throw new Error('Collapse cannot spawn tiles') },
  getTileId: tile => tile,
}).state

export const collapseAndRefillBoard = <T extends BoardTile>(
  state: BoardState<T>,
  gravity: GravityGraph,
  spawns: readonly SpawnDefinition[],
  refillTiles: readonly T[],
  gravityState = createGravityState()
): { state: BoardState<T>; refillCount: number } => {
  let refillCount = 0
  const getRefillIndex = () => refillCount++
  const resolution = resolveGravity({
    state,
    graph: gravity,
    gravityState,
    spawns,
    spawnTile: () => createRefillTile(refillTiles, getRefillIndex),
    getTileId: tile => tile,
  })

  return { state: resolution.state, refillCount }
}
