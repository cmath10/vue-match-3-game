import type { BoosterWave } from '@/entities/Match3BoosterWave'
import type { GeometricBoosterType } from '@/entities/Match3BoosterEffects'
import type { Position } from '@/entities/Match3Engine'
import type TileGrid from '@/entities/TileGrid'

import type { Ref } from 'vue'

import { ref } from 'vue'

import { BOOSTER_TYPE } from '@/enums/game'

import { useMatch3ButtonCollection } from '@/composables/useMatch3ButtonCollection'

export type BoosterVisualEffect = {
  id: string
  type: GeometricBoosterType
  source: Position
}

type BoosterAnimationOptions = {
  grid: TileGrid
  waitAnimation: () => Promise<void>
  nextAnimationFrame: () => Promise<void>
}

const GEOMETRIC_BOOSTERS = new Set<BOOSTER_TYPE>([
  BOOSTER_TYPE.ROW_FIRECRACKER,
  BOOSTER_TYPE.COLUMN_FIRECRACKER,
  BOOSTER_TYPE.AREA_KETTLE,
])

export const useMatch3BoosterAnimation = (options: BoosterAnimationOptions) => {
  const visualEffects = ref<BoosterVisualEffect[]>([])
  const buttonCollection = useMatch3ButtonCollection(options)

  return {
    visualEffects,
    flights: buttonCollection.flights,
    collectingTileIds: buttonCollection.collectingTileIds,
    animateWave: (wave: BoosterWave) => animateWave(options, buttonCollection, visualEffects, wave),
    cancel: () => cancelAnimation(buttonCollection, visualEffects),
  }
}

const animateWave = async (
  options: BoosterAnimationOptions,
  buttonCollection: ReturnType<typeof useMatch3ButtonCollection>,
  visualEffects: Ref<BoosterVisualEffect[]>,
  wave: BoosterWave
): Promise<void> => {
  visualEffects.value = getBoosterVisualEffects(wave)
  const visualAnimation = visualEffects.value.length > 0
    ? options.waitAnimation()
    : Promise.resolve()

  await Promise.all([visualAnimation, buttonCollection.animateWave(wave)])
  visualEffects.value = []
}

const cancelAnimation = (
  buttonCollection: ReturnType<typeof useMatch3ButtonCollection>,
  visualEffects: Ref<BoosterVisualEffect[]>
): void => {
  visualEffects.value = []
  buttonCollection.cancel()
}

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

export const getBoosterVisualEffectStyle = (effect: BoosterVisualEffect) => ({
  '--effect-row': effect.source.row,
  '--effect-column': effect.source.column,
})

const isGeometricBooster = (type: BOOSTER_TYPE): type is GeometricBoosterType => {
  return GEOMETRIC_BOOSTERS.has(type)
}
