import type {
  BoardState,
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
  state: BoardState<T>,
  sourceDestination: Position,
  targetDestination: Position
): MoveMatch => {
  const lines = findMoveMatchLines(state, sourceDestination, targetDestination)

  return {
    positions: getMatchPositions(lines),
    boosters: getMoveBoosterCreations(lines, sourceDestination, targetDestination),
  }
}

export const getCascadeBoosterCreations = <T extends BoardTile>(
  lines: Array<MatchLine<T>>,
  movements: TileMovement[]
): BoosterCreation[] => {
  return findMatchGroups(lines).flatMap((group) => {
    const movement = findCausalMovement(group, movements)

    return movement === null ? [] : toArray(getBoosterCreation(group, getMovementDestination(movement)))
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

const getMoveBoosterCreations = <T extends BoardTile>(
  lines: Array<MatchLine<T>>,
  sourceDestination: Position,
  targetDestination: Position
): BoosterCreation[] => findMatchGroups(lines).flatMap((group) => {
  const anchor = [sourceDestination, targetDestination]
    .find(position => group.some(line => line.positions.some(item => isSamePosition(item, position))))

  return anchor === undefined ? [] : toArray(getBoosterCreation(group, anchor))
})

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
  const causalMovements = movements.filter(movement => (
    positions.has(getPositionKey(getMovementDestination(movement)))
  ))

  return causalMovements.reduce<TileMovement | null>((latest, movement) => (
    latest === null || movement.resolutionOrder > latest.resolutionOrder ? movement : latest
  ), null)
}

const getMovementDestination = (movement: TileMovement): Position => (
  movement.path[movement.path.length - 1]
)

const toArray = <T>(value: T | null): T[] => value === null ? [] : [value]
const getPositionKey = ({ row, column }: Position): string => `${row}-${column}`
const isSamePosition = (a: Position, b: Position): boolean => a.row === b.row && a.column === b.column
