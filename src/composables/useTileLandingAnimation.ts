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

  void animatePhases(options, tileIds, state, movements, version)
}

const getMovementPhases = (movements: TileMovement[]): TileMovement[][] => {
  const phases = new Map<number, TileMovement[]>()

  movements.forEach((movement) => {
    phases.set(movement.phase, [...(phases.get(movement.phase) ?? []), movement])
  })
  return [...phases].sort(([first], [second]) => first - second).map(([, items]) => items)
}

const animatePhases = async (
  options: TileLandingAnimationOptions,
  tileIds: Ref<Set<number>>,
  state: AnimationState,
  movements: TileMovement[],
  version: number
): Promise<void> => {
  for (const phase of getMovementPhases(movements)) {
    if (version !== state.version) {
      return
    }
    tileIds.value = new Set(phase.map(movement => Number(movement.tileId)))
    await options.waitAnimation()
  }

  if (version === state.version) {
    tileIds.value = new Set()
  }
}

const cancel = (tileIds: Ref<Set<number>>, state: AnimationState): void => {
  state.version++
  tileIds.value = new Set()
}
