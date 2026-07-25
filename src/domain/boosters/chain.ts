import type {
  Board,
  BoardEffect,
  BoosterActivation,
  BoosterWave,
  Position,
  SelectButtonBoxTarget,
} from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'

import { BoosterType } from '@/domain/enums'
import {
  getBoosterEffect,
  getButtonBoxEffect,
  getPresentTileTypes,
} from '@/domain/boosters/effects'
import { isBoosterType, isTileType } from '@/domain/tiles'

export const getBoosterSwipeActivations = (
  sourceType: BoardTileType,
  targetType: BoardTileType,
  sourceDestination: Position,
  targetDestination: Position
): BoosterActivation[] | null => {
  if (!isBoosterType(sourceType)) {
    return null
  }

  const source = getSourceActivation(sourceType, targetType, sourceDestination)

  return isBoosterType(targetType)
    ? [source, { source: targetDestination }]
    : [source]
}

export const resolveBoosterWave = (
  board: Board<BoardTileType>,
  activations: BoosterActivation[],
  selectButtonBoxTarget: SelectButtonBoxTarget
): BoosterWave => {
  const queue = [...activations]
  const activated = new Set<string>()
  const positions = new Map<string, Position>()
  const effects: BoardEffect[] = []

  while (queue.length > 0) {
    resolveNextActivation(board, queue, activated, positions, effects, selectButtonBoxTarget)
  }

  return { effects, positions: [...positions.values()] }
}

const resolveNextActivation = (
  board: Board<BoardTileType>,
  queue: BoosterActivation[],
  activated: Set<string>,
  positions: Map<string, Position>,
  effects: BoardEffect[],
  selectButtonBoxTarget: SelectButtonBoxTarget
): void => {
  const pending = getPendingBooster(board, queue, activated)

  if (pending === null) {
    return
  }

  const effect = createEffect(board, pending.booster, pending.activation, selectButtonBoxTarget)

  effects.push(effect)
  enqueueEffect(effect, board, queue, positions)
}

const getPendingBooster = (
  board: Board<BoardTileType>,
  queue: BoosterActivation[],
  activated: Set<string>
): { activation: BoosterActivation, booster: BoosterType } | null => {
  const activation = queue.shift()

  if (activation === undefined) {
    return null
  }

  return getUnactivatedBooster(board, activation, activated)
}

const getUnactivatedBooster = (
  board: Board<BoardTileType>,
  activation: BoosterActivation,
  activated: Set<string>
): { activation: BoosterActivation, booster: BoosterType } | null => {
  const key = getPositionKey(activation.source)
  const booster = getBoardTile(board, activation.source)

  if (activated.has(key) || !isBoosterType(booster)) {
    return null
  }

  activated.add(key)

  return { activation, booster }
}

const createEffect = (
  board: Board<BoardTileType>,
  booster: BoosterType,
  activation: BoosterActivation,
  selectButtonBoxTarget: SelectButtonBoxTarget
): BoardEffect => {
  if (booster === BoosterType.ButtonBox) {
    const targetType = activation.targetType ??
      selectButtonBoxTarget(getPresentTileTypes(board))

    return getButtonBoxEffect(board, activation.source, targetType)
  }

  return getBoosterEffect(
    booster,
    activation.source,
    board[0].length,
    board.length
  )
}

const enqueueEffect = (
  effect: BoardEffect,
  board: Board<BoardTileType>,
  queue: BoosterActivation[],
  positions: Map<string, Position>
): void => {
  effect.positions.forEach((position) => {
    positions.set(getPositionKey(position), position)

    if (isBoosterType(getBoardTile(board, position))) {
      queue.push({ source: position })
    }
  })
}

const getBoardTile = (board: Board<BoardTileType>, position: Position): BoardTileType | null => {
  return board[position.row]?.[position.column] ?? null
}

const getPositionKey = ({ row, column }: Position): string => `${row}-${column}`

const getSourceActivation = (
  sourceType: BoosterType,
  targetType: BoardTileType,
  source: Position
): BoosterActivation => {
  return sourceType === BoosterType.ButtonBox && isTileType(targetType)
    ? { source, targetType }
    : { source }
}
