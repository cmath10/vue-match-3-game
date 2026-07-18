import {
  getBoosterEffect,
  getButtonBoxEffect,
  getPresentTileTypes,
  isBoosterType,
  isTileType,
  type BoardEffect,
} from '@/entities/Match3BoosterEffects'
import type { Board, Position } from '@/entities/Match3Engine'
import { BOOSTER_TYPE, type BoardTileType, type TILE_TYPE } from '@/enums/game'

export type BoosterActivation = {
  source: Position
  targetType?: TILE_TYPE
}

export type BoosterWave = {
  effects: BoardEffect[]
  positions: Position[]
}

export type SelectButtonBoxTarget = (types: TILE_TYPE[]) => TILE_TYPE | null

export const getBoosterSwipeActivations = (
  sourceType: BoardTileType,
  targetType: BoardTileType,
  sourceDestination: Position,
  targetDestination: Position
): BoosterActivation[] | null => {
  if (!isBoosterType(sourceType) || !isValidSwipeTarget(sourceType, targetType)) {
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
): { activation: BoosterActivation, booster: BOOSTER_TYPE } | null => {
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
): { activation: BoosterActivation, booster: BOOSTER_TYPE } | null => {
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
  booster: BOOSTER_TYPE,
  activation: BoosterActivation,
  selectButtonBoxTarget: SelectButtonBoxTarget
): BoardEffect => {
  if (booster === BOOSTER_TYPE.BUTTON_BOX) {
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

const isValidSwipeTarget = (sourceType: BOOSTER_TYPE, targetType: BoardTileType): boolean => {
  return sourceType !== BOOSTER_TYPE.BUTTON_BOX || isTileType(targetType) || isBoosterType(targetType)
}

const getSourceActivation = (
  sourceType: BOOSTER_TYPE,
  targetType: BoardTileType,
  source: Position
): BoosterActivation => {
  return sourceType === BOOSTER_TYPE.BUTTON_BOX && isTileType(targetType)
    ? { source, targetType }
    : { source }
}
