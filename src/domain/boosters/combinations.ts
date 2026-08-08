import type {
  BoardEffect,
  BoosterActivation,
  BoosterCombination,
  BoosterSwipe,
  Position,
} from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'

import { BoosterCombinationType, BoosterType } from '@/domain/enums'
import { getBoosterEffect } from '@/domain/boosters/effects'
import { isBoosterType, isTileType } from '@/domain/tiles'

const FIRECRACKER_TYPES = new Set<BoosterType>([
  BoosterType.RowFirecracker,
  BoosterType.ColumnFirecracker,
])
const COMBINATION_RADIUS = 1
const COMBINATION_DIAMETER = COMBINATION_RADIUS + COMBINATION_RADIUS + 1

export const getBoosterSwipe = (
  sourceType: BoardTileType,
  targetType: BoardTileType,
  sourceDestination: Position,
  targetDestination: Position
): BoosterSwipe | null => {
  if (!isBoosterType(sourceType)) {
    return null
  }
  const combination = getBoosterCombination(
    sourceType, targetType, sourceDestination, targetDestination
  )

  return combination === null
    ? getBaseBoosterSwipe(sourceType, targetType, sourceDestination, targetDestination)
    : { activations: [], combination }
}

export const getBoosterCombination = (
  sourceType: BoardTileType,
  targetType: BoardTileType,
  sourceDestination: Position,
  targetDestination: Position
): BoosterCombination | null => {
  if (!isBoosterType(sourceType) || !isBoosterType(targetType)) {
    return null
  }
  const type = getCombinationType(sourceType, targetType)

  return type === null ? null : {
    type,
    source: sourceDestination,
    participants: [sourceDestination, targetDestination],
    boosters: [sourceType, targetType],
  }
}

export const getBoosterCombinationEffects = (
  combination: BoosterCombination | null,
  width: number,
  height: number
): BoardEffect[] => {
  if (combination === null) {
    return []
  }

  return combination.type === BoosterCombinationType.KettleFirecracker
    ? getWideCrossEffects(combination.source, width, height)
    : getCrossEffects(combination.source, width, height)
}

const getCombinationType = (
  sourceType: BoosterType,
  targetType: BoosterType
): BoosterCombinationType | null => {
  if (isKettleFirecrackerPair(sourceType, targetType)) {
    return BoosterCombinationType.KettleFirecracker
  }

  return getFirecrackerCombinationType(sourceType, targetType)
}

const getFirecrackerCombinationType = (
  sourceType: BoosterType,
  targetType: BoosterType
): BoosterCombinationType | null => {
  if (!isFirecracker(sourceType) || !isFirecracker(targetType)) {
    return null
  }
  if (sourceType !== targetType) {
    return BoosterCombinationType.CrossFirecrackers
  }

  return sourceType === BoosterType.RowFirecracker
    ? BoosterCombinationType.RowFirecrackers
    : BoosterCombinationType.ColumnFirecrackers
}

const getCrossEffects = (source: Position, width: number, height: number): BoardEffect[] => [
  getBoosterEffect(BoosterType.RowFirecracker, source, width, height),
  getBoosterEffect(BoosterType.ColumnFirecracker, source, width, height),
]

const getBaseBoosterSwipe = (
  sourceType: BoosterType,
  targetType: BoardTileType,
  sourceDestination: Position,
  targetDestination: Position
): BoosterSwipe => {
  const source = getSourceActivation(sourceType, targetType, sourceDestination)

  return {
    activations: isBoosterType(targetType)
      ? [source, { source: targetDestination }]
      : [source],
    combination: null,
  }
}

const getSourceActivation = (
  sourceType: BoosterType,
  targetType: BoardTileType,
  source: Position
): BoosterActivation => (
  sourceType === BoosterType.ButtonBox && isTileType(targetType)
    ? { source, targetType }
    : { source }
)

const getWideCrossEffects = (source: Position, width: number, height: number): BoardEffect[] => [
  ...getAreaIndexes(source.row, height).map(row => getBoosterEffect(
    BoosterType.RowFirecracker,
    { row, column: source.column },
    width,
    height
  )),
  ...getAreaIndexes(source.column, width).map(column => getBoosterEffect(
    BoosterType.ColumnFirecracker,
    { row: source.row, column },
    width,
    height
  )),
]

const getAreaIndexes = (center: number, limit: number): number[] => Array.from(
  { length: COMBINATION_DIAMETER },
  (_, index) => center - COMBINATION_RADIUS + index
).filter(index => index >= 0 && index < limit)

const isFirecracker = (type: BoosterType): boolean => FIRECRACKER_TYPES.has(type)

const isKettleFirecrackerPair = (source: BoosterType, target: BoosterType): boolean => (
  source === BoosterType.AreaKettle && isFirecracker(target)
  || target === BoosterType.AreaKettle && isFirecracker(source)
)
