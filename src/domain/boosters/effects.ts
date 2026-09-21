import type { Board, BoardEffect } from '@/domain/types'
import type { BoardTopology } from '@/domain/levels/types'
import type { GeometricBoosterType, Position } from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'

import { BoosterType } from '@/domain/enums'
import { isTileType } from '@/domain/tiles'
import { parseCellKey } from '@/domain/levels/coordinates'
import { TileType } from '@/domain/enums'

export const KETTLE_AREA_RADIUS = 2
export const KETTLE_AREA_SIZE = KETTLE_AREA_RADIUS + KETTLE_AREA_RADIUS + 1

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
): Position[] => [...topology.playableCells].map(parseCellKey)
  .filter(position => isInsideEffect(position, booster, source))
  .sort((a, b) => a.row - b.row || a.column - b.column)

const isInsideEffect = (
  position: Position,
  booster: GeometricBoosterType,
  source: Position
): boolean => {
  if (booster === BoosterType.RowFirecracker) {
    return position.row === source.row
  }
  if (booster === BoosterType.ColumnFirecracker) {
    return position.column === source.column
  }

  return isInsideKettleFootprint(position, source)
}

const isInsideKettleFootprint = (position: Position, source: Position): boolean => {
  const rowDistance = Math.abs(position.row - source.row)
  const columnDistance = Math.abs(position.column - source.column)

  return rowDistance <= KETTLE_AREA_RADIUS && columnDistance <= KETTLE_AREA_RADIUS &&
    !(rowDistance === KETTLE_AREA_RADIUS && columnDistance === KETTLE_AREA_RADIUS)
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
