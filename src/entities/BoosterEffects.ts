import type {
  Board,
  BoardEffect,
  GeometricBoosterType,
  Position,
} from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'

import { BoosterType, TileType } from '@/domain/enums'

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

export const isBoosterType = (type: BoardTileType | null): type is BoosterType => {
  return Object.values(BoosterType).includes(type as BoosterType)
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
    .filter(position => isInsideBoard(position, width, height))
}

const getAreaIndexes = (center: number): number[] => [center - 1, center, center + 1]
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

export const isTileType = (type: BoardTileType | null): type is TileType => {
  return Object.values(TileType).includes(type as TileType)
}
