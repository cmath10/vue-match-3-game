import type {
  BoosterCombination,
  BoosterWave,
  GeometricBoosterType,
  Position,
} from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'

import type { Ref } from 'vue'

import { ref } from 'vue'

import { BoosterType } from '@/domain/enums'
import { KETTLE_AREA_RADIUS, KETTLE_AREA_SIZE } from '@/domain/boosters/effects'

import { useButtonCollection } from '@/composables/useButtonCollection'

export const FIRECRACKER_ANIMATION_DURATION = 920

export type BoosterVisualEffect = {
  id: string
  type: GeometricBoosterType
  source: Position
}

type BoosterAnimationOptions = {
  grid: TileGrid
  waitAnimation: () => Promise<void>
  waitDuration: (duration: number) => Promise<void>
  nextAnimationFrame: () => Promise<void>
}

type BoosterAnimationState = {
  version: number
  visualEffects: Ref<BoosterVisualEffect[]>
  combination: Ref<BoosterCombination | null>
  combiningTileIds: Ref<Set<number>>
  detonatingKettleTileIds: Ref<Set<number>>
}

const GEOMETRIC_BOOSTERS = new Set<BoosterType>([
  BoosterType.RowFirecracker,
  BoosterType.ColumnFirecracker,
  BoosterType.AreaKettle,
])

export const useBoosterAnimation = (options: BoosterAnimationOptions) => {
  const state = createAnimationState()
  const buttonCollection = useButtonCollection(options)

  return {
    visualEffects: state.visualEffects,
    combination: state.combination,
    combiningTileIds: state.combiningTileIds,
    detonatingKettleTileIds: state.detonatingKettleTileIds,
    flights: buttonCollection.flights,
    collectingTileIds: buttonCollection.collectingTileIds,
    animateWave: (wave: BoosterWave) => animateWave(options, buttonCollection, state, wave),
    cancel: () => cancelAnimation(buttonCollection, state),
  }
}

const createAnimationState = (): BoosterAnimationState => ({
  version: 0,
  visualEffects: ref([]),
  combination: ref(null),
  combiningTileIds: ref(new Set()),
  detonatingKettleTileIds: ref(new Set()),
})

const animateWave = async (
  options: BoosterAnimationOptions,
  buttonCollection: ReturnType<typeof useButtonCollection>,
  state: BoosterAnimationState,
  wave: BoosterWave
): Promise<void> => {
  const version = state.version

  startCombinationPhase(options.grid, state, wave)
  if (wave.combination !== null) {
    await options.waitAnimation()
    if (version !== state.version) {
      return
    }
    state.combination.value = null
  }
  await animateEffects(options, buttonCollection, state, wave)
  finishAnimation(state, version)
}

const animateEffects = async (
  options: BoosterAnimationOptions,
  buttonCollection: ReturnType<typeof useButtonCollection>,
  state: BoosterAnimationState,
  wave: BoosterWave
): Promise<void> => {
  state.visualEffects.value = getBoosterVisualEffects(wave)
  state.detonatingKettleTileIds.value = getDetonatingKettleTileIds(options.grid, wave)
  const visualAnimation = state.visualEffects.value.length > 0
    ? waitForVisualEffects(options, state.visualEffects.value) : Promise.resolve()

  await Promise.all([visualAnimation, buttonCollection.animateWave(wave)])
}

const waitForVisualEffects = (options: BoosterAnimationOptions, effects: BoosterVisualEffect[]) => {
  return effects.some(effect => effect.type !== BoosterType.AreaKettle)
    ? options.waitDuration(FIRECRACKER_ANIMATION_DURATION)
    : options.waitAnimation()
}

const cancelAnimation = (
  buttonCollection: ReturnType<typeof useButtonCollection>,
  state: BoosterAnimationState
): void => {
  state.version++
  clearAnimationState(state)
  buttonCollection.cancel()
}

const startCombinationPhase = (
  grid: TileGrid,
  state: BoosterAnimationState,
  wave: BoosterWave
): void => {
  state.combination.value = wave.combination
  state.combiningTileIds.value = getTileIds(grid, wave.combination?.participants ?? [])
}

const finishAnimation = (state: BoosterAnimationState, version: number): void => {
  if (version === state.version) {
    clearAnimationState(state)
  }
}

const clearAnimationState = (state: BoosterAnimationState): void => {
  state.visualEffects.value = []
  state.combination.value = null
  state.combiningTileIds.value = new Set()
  state.detonatingKettleTileIds.value = new Set()
}

const getDetonatingKettleTileIds = (grid: TileGrid, wave: BoosterWave): Set<number> => getTileIds(
  grid,
  wave.effects
    .filter(effect => effect.booster === BoosterType.AreaKettle)
    .map(effect => effect.source)
)

const getTileIds = (grid: TileGrid, positions: Position[]): Set<number> => new Set(
  positions.flatMap((position) => {
    const tile = grid.getTileByIndex(position.row, position.column)

    return tile === null ? [] : [tile.id]
  })
)

export const getBoosterVisualEffects = (wave: BoosterWave): BoosterVisualEffect[] => {
  return wave.effects.flatMap((effect, index) => {
    if (!isGeometricBooster(effect.booster)) {
      return []
    }

    return [{
      id: `${effect.booster}-${effect.source.row}-${effect.source.column}-${index}`,
      type: effect.booster,
      source: effect.source,
    }]
  })
}

export const getBoosterVisualEffectStyle = (effect: BoosterVisualEffect) => {
  const position = {
    '--effect-row': effect.source.row,
    '--effect-column': effect.source.column,
  }

  return effect.type === BoosterType.AreaKettle
    ? {
        ...position,
        '--effect-area-radius': KETTLE_AREA_RADIUS,
        '--effect-area-size': KETTLE_AREA_SIZE,
      }
    : { ...position, '--effect-duration': `${FIRECRACKER_ANIMATION_DURATION}ms` }
}

const isGeometricBooster = (type: BoosterType): type is GeometricBoosterType => {
  return GEOMETRIC_BOOSTERS.has(type)
}
