import type {
  Board,
  BoardEffect,
  GeometricBoosterType,
  Position,
} from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'

import { BoosterType } from '@/domain/enums'
import { isTileType } from '@/domain/tiles'
import { TileType } from '@/domain/enums'

export const KETTLE_AREA_RADIUS = 2
export const KETTLE_AREA_SIZE = KETTLE_AREA_RADIUS + KETTLE_AREA_RADIUS + 1

export const getBoosterEffect = (
  booster: GeometricBoosterType,
  source: Position,
  width: number,
  height: number
): BoardEffect => ({
  source,
  positions: getEffectPositions(booster, source, width, height),
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
  width: number,
  height: number
): Position[] => {
  if (booster === BoosterType.RowFirecracker) {
    return getRowPositions(source.row, width)
  }

  if (booster === BoosterType.ColumnFirecracker) {
    return getColumnPositions(source.column, height)
  }

  return getAreaPositions(source, width, height)
}

const getRowPositions = (row: number, width: number): Position[] => {
  return Array.from({ length: width }, (_, column) => ({ row, column }))
}

const getColumnPositions = (column: number, height: number): Position[] => {
  return Array.from({ length: height }, (_, row) => ({ row, column }))
}

const getAreaPositions = (source: Position, width: number, height: number): Position[] => {
  const rows = getAreaIndexes(source.row)
  const columns = getAreaIndexes(source.column)

  return rows
    .flatMap(row => columns.map(column => ({ row, column })))
    .filter(position => !isAreaCorner(position, source))
    .filter(position => isInsideBoard(position, width, height))
}

const getAreaIndexes = (center: number): number[] => {
  return Array.from(
    { length: KETTLE_AREA_SIZE },
    (_, index) => center - KETTLE_AREA_RADIUS + index
  )
}
const isAreaCorner = (position: Position, source: Position): boolean => {
  return Math.abs(position.row - source.row) === KETTLE_AREA_RADIUS &&
    Math.abs(position.column - source.column) === KETTLE_AREA_RADIUS
}
const isInsideBoard = ({ row, column }: Position, width: number, height: number): boolean => {
  return row >= 0 && row < height && column >= 0 && column < width
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
