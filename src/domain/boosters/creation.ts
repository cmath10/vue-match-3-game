import type {
  Board,
  BoardTile,
  BoosterCreation,
  MatchLine,
  MoveMatch,
  Position,
  TileMovement,
} from '@/domain/types'

import { BoosterType } from '@/domain/enums'
import {
  findMatchGroup,
  findMatchGroups,
  findMoveMatchLines,
  getMatchPositions,
} from '@/domain/board/matches'

const FIRECRACKER_MATCH_LENGTH = 4
const BUTTON_BOX_MATCH_LENGTH = 5

export const getMoveMatch = <T extends BoardTile>(
  board: Board<T>,
  movedPosition: Position,
  swappedPosition: Position
): MoveMatch => {
  const lines = findMoveMatchLines(board, movedPosition, swappedPosition)

  return {
    positions: getMatchPositions(lines),
    boosters: toArray(getMoveBoosterCreation(board, lines, movedPosition)),
  }
}

export const getCascadeBoosterCreations = <T extends BoardTile>(
  lines: Array<MatchLine<T>>,
  movements: TileMovement[]
): BoosterCreation[] => {
  return findMatchGroups(lines).flatMap((group) => {
    const movement = findCausalMovement(group, movements)

    return movement === null ? [] : toArray(getBoosterCreation(group, movement.to))
  })
}

export const getBoosterCreation = <T extends BoardTile>(
  lines: Array<MatchLine<T>>,
  position: Position
): BoosterCreation | null => {
  const group = findMatchGroup(lines, position)

  if (group.length === 0) {
    return null
  }

  const type = getBoosterType(group)

  return type === null ? null : { type, position }
}

const getMoveBoosterCreation = <T extends BoardTile>(
  board: Board<T>,
  lines: Array<MatchLine<T>>,
  movedPosition: Position
): BoosterCreation | null => {
  const destinationCreation = getBoosterCreation(lines, movedPosition)

  if (destinationCreation !== null || board[movedPosition.row]?.[movedPosition.column] === null) {
    return destinationCreation
  }

  const fallbackType = findMatchGroups(lines)
    .map(getBoosterType)
    .find((type): type is BoosterType => type !== null)

  return fallbackType === undefined ? null : { type: fallbackType, position: movedPosition }
}

const getBoosterType = <T extends BoardTile>(group: Array<MatchLine<T>>): BoosterType | null => {
  if (hasIntersectingOrientations(group)) {
    return BoosterType.AreaKettle
  }

  const longestLine = getLongestLineLength(group)

  if (longestLine >= BUTTON_BOX_MATCH_LENGTH) {
    return BoosterType.ButtonBox
  }

  if (longestLine !== FIRECRACKER_MATCH_LENGTH) {
    return null
  }

  return group[0].orientation === 'row'
    ? BoosterType.ColumnFirecracker
    : BoosterType.RowFirecracker
}

const hasIntersectingOrientations = <T extends BoardTile>(group: Array<MatchLine<T>>): boolean => {
  return new Set(group.map(line => line.orientation)).size > 1
}

const getLongestLineLength = <T extends BoardTile>(group: Array<MatchLine<T>>): number => {
  return Math.max(...group.map(line => line.positions.length))
}

const findCausalMovement = <T extends BoardTile>(
  group: Array<MatchLine<T>>,
  movements: TileMovement[]
): TileMovement | null => {
  const positions = new Set(getMatchPositions(group).map(getPositionKey))
  const causalMovements = movements.filter(movement => positions.has(getPositionKey(movement.to)))

  return causalMovements.reduce<TileMovement | null>((latest, movement) => (
    latest === null || movement.order > latest.order ? movement : latest
  ), null)
}

const toArray = <T>(value: T | null): T[] => value === null ? [] : [value]
const getPositionKey = ({ row, column }: Position): string => `${row}-${column}`
