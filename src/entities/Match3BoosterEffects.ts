import type { Board, Position } from '@/entities/Match3Engine'
import { BOOSTER_TYPE, type BoardTileType, TILE_TYPE } from '@/enums/game'

export type BoardEffect = {
  source: Position
  positions: Position[]
  booster: BOOSTER_TYPE
  targetType?: TILE_TYPE
}

export type GeometricBoosterType =
  | BOOSTER_TYPE.ROW_FIRECRACKER
  | BOOSTER_TYPE.COLUMN_FIRECRACKER
  | BOOSTER_TYPE.AREA_KETTLE

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
  targetType: TILE_TYPE | null
): BoardEffect => {
  const targetPositions = targetType === null ? [] : getTileTypePositions(board, targetType)

  return {
    source,
    positions: [source, ...targetPositions],
    booster: BOOSTER_TYPE.BUTTON_BOX,
    ...(targetType === null ? {} : { targetType }),
  }
}

export const getPresentTileTypes = (board: Board<BoardTileType>): TILE_TYPE[] => {
  const presentTypes = new Set<TILE_TYPE>()

  board.forEach(row => row.forEach((type) => {
    if (isTileType(type)) {
      presentTypes.add(type)
    }
  }))

  return [...presentTypes]
}

export const isBoosterType = (type: BoardTileType | null): type is BOOSTER_TYPE => {
  return Object.values(BOOSTER_TYPE).includes(type as BOOSTER_TYPE)
}

const getEffectPositions = (
  booster: GeometricBoosterType,
  source: Position,
  width: number,
  height: number
): Position[] => {
  if (booster === BOOSTER_TYPE.ROW_FIRECRACKER) {
    return getRowPositions(source.row, width)
  }

  if (booster === BOOSTER_TYPE.COLUMN_FIRECRACKER) {
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

const getTileTypePositions = (board: Board<BoardTileType>, targetType: TILE_TYPE): Position[] => {
  const positions: Position[] = []

  board.forEach((row, rowIndex) => row.forEach((type, columnIndex) => {
    if (type === targetType) {
      positions.push({ row: rowIndex, column: columnIndex })
    }
  }))

  return positions
}

export const isTileType = (type: BoardTileType | null): type is TILE_TYPE => {
  return Object.values(TILE_TYPE).includes(type as TILE_TYPE)
}
