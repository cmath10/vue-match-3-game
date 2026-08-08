import type { ObjectiveCollection } from '@/domain/types'
import type { ObjectiveType } from '@/domain/enums'
import type { Position } from '@/domain/types'
import type { TileType } from '@/domain/enums'

import type { Ref } from 'vue'

import { nextTick, ref } from 'vue'

import { TileType as TileTypeEnum } from '@/domain/enums'

export type TileBreakEffect = {
  id: string
  type: TileType
  position: Position
  active: boolean
}

type TileBreakAnimationOptions = {
  waitAnimation: () => Promise<void>
  nextAnimationFrame: () => Promise<void>
}

type AnimationState = {
  version: number
}

const ORDINARY_TILE_TYPES = new Set<ObjectiveType>(Object.values(TileTypeEnum))

export const useTileBreakAnimation = (options: TileBreakAnimationOptions) => {
  const effects = ref<TileBreakEffect[]>([])
  const pending: TileBreakEffect[] = []
  const animationState = { version: 0 }

  const cancel = (): void => {
    animationState.version++
    pending.splice(0)
    effects.value = []
  }

  return {
    effects,
    collect: (collection: ObjectiveCollection) => collect(pending, collection),
    animatePending: () => animatePending(options, effects, pending, animationState),
    cancel,
  }
}

export const getTileBreakEffectStyle = (effect: TileBreakEffect) => ({
  transform: `translate(calc(${effect.position.column} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)), calc(${effect.position.row} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)))`,
})

const collect = (pending: TileBreakEffect[], collection: ObjectiveCollection): void => {
  if (isOrdinaryTileType(collection.type)) {
    pending.push({
      id: `${collection.type}-${collection.tileId}`,
      type: collection.type,
      position: { ...collection.position },
      active: false,
    })
  }
}

const animatePending = async (
  options: TileBreakAnimationOptions,
  effects: Ref<TileBreakEffect[]>,
  pending: TileBreakEffect[],
  state: AnimationState
): Promise<void> => {
  const batch = pending.splice(0)
  if (batch.length === 0) {
    return
  }
  const version = startBatch(effects, batch, state)
  await startAnimation(options)
  if (version !== state.version) {
    return
  }

  effects.value.forEach(effect => effect.active = true)
  await options.waitAnimation()
  finishBatch(effects, version, state)
}

const startBatch = (
  effects: Ref<TileBreakEffect[]>,
  batch: TileBreakEffect[],
  state: AnimationState
): number => {
  effects.value = batch

  return state.version
}

const finishBatch = (
  effects: Ref<TileBreakEffect[]>,
  version: number,
  state: AnimationState
): void => {
  if (version === state.version) {
    effects.value = []
  }
}

const startAnimation = async (options: TileBreakAnimationOptions): Promise<void> => {
  await nextTick()
  await options.nextAnimationFrame()
  await options.nextAnimationFrame()
}

const isOrdinaryTileType = (type: ObjectiveType): type is TileType => (
  ORDINARY_TILE_TYPES.has(type)
)
