import type {
  Board,
  BoardEffect,
  BoosterActivation,
  BoosterCombination,
  BoosterWave,
  Position,
  SelectButtonBoxTarget,
} from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'

import { BoosterType } from '@/domain/enums'
import { getBoosterCombinationEffects } from '@/domain/boosters/combinations'
import {
  getBoosterEffect,
  getButtonBoxEffect,
  getPresentTileTypes,
} from '@/domain/boosters/effects'
import { isBoosterType } from '@/domain/tiles'

type WaveResolution = {
  queue: BoosterActivation[]
  activated: Set<string>
  positions: Map<string, Position>
  effects: BoardEffect[]
  activatedBoosters: BoosterType[]
}

export const resolveBoosterWave = (
  board: Board<BoardTileType>,
  activations: BoosterActivation[],
  selectButtonBoxTarget: SelectButtonBoxTarget,
  combination: BoosterCombination | null = null
): BoosterWave => {
  const resolution = createWaveResolution(board, activations, combination)

  resolution.effects.forEach(effect => enqueueEffect(
    effect, board, resolution.queue, resolution.positions
  ))
  resolveActivationQueue(board, resolution, selectButtonBoxTarget)

  return {
    effects: resolution.effects,
    positions: [...resolution.positions.values()],
    activatedBoosters: resolution.activatedBoosters,
    combination,
  }
}

const createWaveResolution = (
  board: Board<BoardTileType>,
  activations: BoosterActivation[],
  combination: BoosterCombination | null
): WaveResolution => ({
  queue: [...activations],
  activated: new Set(combination?.participants.map(getPositionKey) ?? []),
  positions: new Map(),
  effects: getBoosterCombinationEffects(combination, board[0].length, board.length),
  activatedBoosters: [...(combination?.boosters ?? [])],
})

const resolveActivationQueue = (
  board: Board<BoardTileType>,
  resolution: WaveResolution,
  selectButtonBoxTarget: SelectButtonBoxTarget
): void => {
  while (resolution.queue.length > 0) {
    resolveNextActivation(board, resolution, selectButtonBoxTarget)
  }
}

const resolveNextActivation = (
  board: Board<BoardTileType>,
  resolution: WaveResolution,
  selectButtonBoxTarget: SelectButtonBoxTarget
): void => {
  const pending = getPendingBooster(board, resolution.queue, resolution.activated)

  if (pending === null) {
    return
  }

  const effect = createEffect(board, pending.booster, pending.activation, selectButtonBoxTarget)

  resolution.effects.push(effect)
  resolution.activatedBoosters.push(pending.booster)
  enqueueEffect(effect, board, resolution.queue, resolution.positions)
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
