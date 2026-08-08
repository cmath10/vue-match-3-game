import type { TileMovement } from '@/domain/types'

import type { Ref } from 'vue'

import { ref } from 'vue'

type TileLandingAnimationOptions = {
  waitAnimation: () => Promise<void>
}

type AnimationState = {
  version: number
}

export const useTileLandingAnimation = (options: TileLandingAnimationOptions) => {
  const tileIds = ref<Set<number>>(new Set())
  const state = { version: 0 }

  return {
    tileIds,
    animate: (movements: TileMovement[]) => animate(options, tileIds, state, movements),
    cancel: () => cancel(tileIds, state),
  }
}

const animate = (
  options: TileLandingAnimationOptions,
  tileIds: Ref<Set<number>>,
  state: AnimationState,
  movements: TileMovement[]
): void => {
  const version = ++state.version

  tileIds.value = new Set(movements.map(movement => Number(movement.tileId)))
  void clearAfterAnimation(options, tileIds, state, version)
}

const clearAfterAnimation = async (
  options: TileLandingAnimationOptions,
  tileIds: Ref<Set<number>>,
  state: AnimationState,
  version: number
): Promise<void> => {
  await options.waitAnimation()

  if (version === state.version) {
    tileIds.value = new Set()
  }
}

const cancel = (tileIds: Ref<Set<number>>, state: AnimationState): void => {
  state.version++
  tileIds.value = new Set()
}
