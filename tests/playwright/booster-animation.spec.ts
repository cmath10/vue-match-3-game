import type { BoosterWave } from '@/domain/types'

import { expect, test } from '@playwright/test'

import {
  FIRECRACKER_ANIMATION_DURATION,
  getBoosterVisualEffects,
  getBoosterVisualEffectStyle,
  KETTLE_ANIMATION_DURATION,
} from '@/composables/useBoosterAnimation'

import { BoosterType, TileType } from '@/domain/enums'

test('visual effects include geometric boosters but keep button collection separate', () => {
  const wave: BoosterWave = {
    effects: [
      {
        source: { row: 2, column: 1 },
        positions: [{ row: 2, column: 1 }],
        booster: BoosterType.RowFirecracker,
      },
      {
        source: { row: 1, column: 3 },
        positions: [{ row: 1, column: 3 }],
        booster: BoosterType.ButtonBox,
        targetType: TileType.SweetsFish,
      },
      {
        source: { row: 4, column: 5 },
        positions: [{ row: 4, column: 5 }],
        booster: BoosterType.AreaKettle,
      },
    ],
    positions: [],
    activatedBoosters: [],
    combination: null,
  }

  expect(getBoosterVisualEffects(wave)).toEqual([
    {
      id: 'booster-row-firecracker-2-1-0',
      type: BoosterType.RowFirecracker,
      source: { row: 2, column: 1 },
    },
    {
      id: 'booster-area-kettle-4-5-2',
      type: BoosterType.AreaKettle,
      source: { row: 4, column: 5 },
    },
  ])
})

test('visual effect position is expressed through board coordinates', () => {
  expect(getBoosterVisualEffectStyle({
    id: 'effect',
    type: BoosterType.ColumnFirecracker,
    source: { row: 3, column: 7 },
  })).toEqual({
    '--effect-row': 3,
    '--effect-column': 7,
    '--effect-duration': `${FIRECRACKER_ANIMATION_DURATION}ms`,
  })
})

test('kettle visual effect carries its domain area dimensions', () => {
  expect(getBoosterVisualEffectStyle({
    id: 'effect',
    type: BoosterType.AreaKettle,
    source: { row: 3, column: 7 },
  })).toEqual({
    '--effect-row': 3,
    '--effect-column': 7,
    '--effect-area-radius': 2,
    '--effect-area-size': 5,
    '--effect-duration': `${KETTLE_ANIMATION_DURATION}ms`,
  })
})
