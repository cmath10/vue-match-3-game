import type { ObjectiveCollection } from '@/entities/Match3ObjectiveCollection'
import type { Position } from '@/entities/Match3Engine'

import type { Ref } from 'vue'

import { nextTick, ref } from 'vue'

import { SPECIAL_TILE_TYPE } from '@/enums/game'

export type CookieBreakEffect = {
  id: string
  position: Position
  active: boolean
}

type CookieBreakAnimationOptions = {
  waitAnimation: () => Promise<void>
  nextAnimationFrame: () => Promise<void>
}

type AnimationState = {
  version: number
}

export const useMatch3CookieBreakAnimation = (options: CookieBreakAnimationOptions) => {
  const effects = ref<CookieBreakEffect[]>([])
  const pending: CookieBreakEffect[] = []
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

export const getCookieBreakEffectStyle = (effect: CookieBreakEffect) => ({
  transform: `translate(calc(${effect.position.column} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)), calc(${effect.position.row} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)))`,
})

const collect = (pending: CookieBreakEffect[], collection: ObjectiveCollection): void => {
  if (collection.type === SPECIAL_TILE_TYPE.COOKIE) {
    pending.push({
      id: `${collection.type}-${collection.tileId}`,
      position: { ...collection.position },
      active: false,
    })
  }
}

const animatePending = async (
  options: CookieBreakAnimationOptions,
  effects: Ref<CookieBreakEffect[]>,
  pending: CookieBreakEffect[],
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
  effects: Ref<CookieBreakEffect[]>,
  batch: CookieBreakEffect[],
  state: AnimationState
): number => {
  effects.value = batch

  return state.version
}

const finishBatch = (
  effects: Ref<CookieBreakEffect[]>,
  version: number,
  state: AnimationState
): void => {
  if (version === state.version) {
    effects.value = []
  }
}

const startAnimation = async (options: CookieBreakAnimationOptions): Promise<void> => {
  await nextTick()
  await options.nextAnimationFrame()
  await options.nextAnimationFrame()
}
