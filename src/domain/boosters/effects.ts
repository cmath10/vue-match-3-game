import type { Board, BoardEffect } from '@/domain/types'
import type { BoardTopology } from '@/domain/levels/types'
import type { GeometricBoosterType, Position } from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'

import { BoosterType } from '@/domain/enums'
import { getCellKey } from '@/domain/levels/coordinates'
import { isTileType } from '@/domain/tiles'
import { TileType } from '@/domain/enums'

export const KETTLE_AREA_RADIUS = 2
export const KETTLE_AREA_SIZE = KETTLE_AREA_RADIUS + KETTLE_AREA_RADIUS + 1

const DIRECTIONS = [
  { row: -1, column: 0 },
  { row: 1, column: 0 },
  { row: 0, column: -1 },
  { row: 0, column: 1 },
] as const

export const getBoosterEffect = (
  booster: GeometricBoosterType,
  source: Position,
  topology: BoardTopology
): BoardEffect => ({
  source,
  positions: getEffectPositions(booster, source, topology),
  booster,
})

export const getButtonBoxEffect = (
  board: Board<BoardTileType>,
  source: Position,
  targetType: TileType | null
): BoardEffect => {
  const targetPositions = targetType === null ? [] : getTileTypePositions(board, targetType)

  return {
    source,
    positions: [source, ...targetPositions],
    booster: BoosterType.ButtonBox,
    ...(targetType === null ? {} : { targetType }),
  }
}

export const getPresentTileTypes = (board: Board<BoardTileType>): TileType[] => {
  const presentTypes = new Set<TileType>()

  board.forEach(row => row.forEach((type) => {
    if (isTileType(type)) {
      presentTypes.add(type)
    }
  }))

  return [...presentTypes]
}

const getEffectPositions = (
  booster: GeometricBoosterType,
  source: Position,
  topology: BoardTopology
): Position[] => {
  if (booster === BoosterType.RowFirecracker) {
    return getLinePositions(source, topology, { row: 0, column: 1 })
  }
  if (booster === BoosterType.ColumnFirecracker) {
    return getLinePositions(source, topology, { row: 1, column: 0 })
  }

  return getAreaPositions(source, topology)
}

const getRay = (source: Position, topology: BoardTopology, delta: Position): Position[] => {
  const positions: Position[] = []
  let current = { row: source.row + delta.row, column: source.column + delta.column }

  while (topology.playableCells.has(getCellKey(current))) {
    positions.push(current)
    current = { row: current.row + delta.row, column: current.column + delta.column }
  }

  return positions
}

const getLinePositions = (
  source: Position,
  topology: BoardTopology,
  forward: Position
): Position[] => {
  if (!topology.playableCells.has(getCellKey(source))) {
    return []
  }

  const backward = { row: -forward.row, column: -forward.column }

  return [...getRay(source, topology, backward).reverse(), source, ...getRay(source, topology, forward)]
}

const isInsideKettleFootprint = (position: Position, source: Position): boolean => {
  const rowDistance = Math.abs(position.row - source.row)
  const columnDistance = Math.abs(position.column - source.column)

  return rowDistance <= KETTLE_AREA_RADIUS && columnDistance <= KETTLE_AREA_RADIUS &&
    !(rowDistance === KETTLE_AREA_RADIUS && columnDistance === KETTLE_AREA_RADIUS)
}

const getAreaNeighbors = (position: Position, source: Position, topology: BoardTopology): Position[] => (
  DIRECTIONS.map(delta => ({
    row: position.row + delta.row,
    column: position.column + delta.column,
  })).filter(candidate => isInsideKettleFootprint(candidate, source))
    .filter(candidate => topology.playableCells.has(getCellKey(candidate)))
)

const enqueueAreaNeighbors = (
  position: Position,
  source: Position,
  topology: BoardTopology,
  positions: Map<string, Position>,
  queue: Position[]
): void => {
  getAreaNeighbors(position, source, topology).forEach((candidate) => {
    const key = getCellKey(candidate)
    if (!positions.has(key)) {
      positions.set(key, candidate)
      queue.push(candidate)
    }
  })
}

const getAreaPositions = (source: Position, topology: BoardTopology): Position[] => {
  if (!topology.playableCells.has(getCellKey(source))) {
    return []
  }

  const positions = new Map<string, Position>([[getCellKey(source), source]])
  const queue = [source]

  while (queue.length > 0) {
    const position = queue.shift() as Position

    enqueueAreaNeighbors(position, source, topology, positions, queue)
  }

  return [...positions.values()].sort((a, b) => a.row - b.row || a.column - b.column)
}

const getTileTypePositions = (board: Board<BoardTileType>, targetType: TileType): Position[] => {
  const positions: Position[] = []

  board.forEach((row, rowIndex) => row.forEach((type, columnIndex) => {
    if (type === targetType) {
      positions.push({ row: rowIndex, column: columnIndex })
    }
  }))

  return positions
}
