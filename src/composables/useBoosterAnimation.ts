import type { BoosterWave, GeometricBoosterType, Position } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'

import type { Ref } from 'vue'

import { ref } from 'vue'

import { BoosterType } from '@/domain/enums'

import { useButtonCollection } from '@/composables/useButtonCollection'

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

const GEOMETRIC_BOOSTERS = new Set<BoosterType>([
  BoosterType.RowFirecracker,
  BoosterType.ColumnFirecracker,
  BoosterType.AreaKettle,
])

export const useBoosterAnimation = (options: BoosterAnimationOptions) => {
  const visualEffects = ref<BoosterVisualEffect[]>([])
  const buttonCollection = useButtonCollection(options)

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
  buttonCollection: ReturnType<typeof useButtonCollection>,
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
  buttonCollection: ReturnType<typeof useButtonCollection>,
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

const isGeometricBooster = (type: BoosterType): type is GeometricBoosterType => {
  return GEOMETRIC_BOOSTERS.has(type)
}
