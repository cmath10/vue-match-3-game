import type { Board, BoardTile, Position } from '@/entities/Match3Engine'
import type { TileMovement } from '@/entities/Match3GridTransitions'
import type { MatchLine } from '@/entities/Match3Matches'
import {
  findMatchGroup,
  findMatchGroups,
  findMoveMatchLines,
  getMatchPositions,
} from '@/entities/Match3Matches'
import { BOOSTER_TYPE } from '@/enums/game'

const FIRECRACKER_MATCH_LENGTH = 4
const BUTTON_BOX_MATCH_LENGTH = 5

export type BoosterCreation = {
  type: BOOSTER_TYPE
  position: Position
}

export type MoveMatch = {
  positions: Position[]
  boosters: BoosterCreation[]
}

export const getMoveMatch = <T extends BoardTile>(
  board: Board<T>,
  movedPosition: Position,
  swappedPosition: Position
): MoveMatch => {
  const lines = findMoveMatchLines(board, movedPosition, swappedPosition)

  return {
    positions: getMatchPositions(lines),
    boosters: toArray(getBoosterCreation(lines, movedPosition)),
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

const getBoosterType = <T extends BoardTile>(group: Array<MatchLine<T>>): BOOSTER_TYPE | null => {
  if (hasIntersectingOrientations(group)) {
    return BOOSTER_TYPE.AREA_KETTLE
  }

  const longestLine = getLongestLineLength(group)

  if (longestLine >= BUTTON_BOX_MATCH_LENGTH) {
    return BOOSTER_TYPE.BUTTON_BOX
  }

  if (longestLine !== FIRECRACKER_MATCH_LENGTH) {
    return null
  }

  return group[0].orientation === 'row'
    ? BOOSTER_TYPE.COLUMN_FIRECRACKER
    : BOOSTER_TYPE.ROW_FIRECRACKER
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
