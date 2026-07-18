import type { BoosterWave } from '@/entities/Match3BoosterWave'

import { expect, test } from '@playwright/test'

import {
  getBoosterVisualEffects,
  getBoosterVisualEffectStyle,
} from '@/composables/useMatch3BoosterAnimation'

import { BOOSTER_TYPE, TILE_TYPE } from '@/enums/game'

test('visual effects include geometric boosters but keep button collection separate', () => {
  const wave: BoosterWave = {
    effects: [
      {
        source: { row: 2, column: 1 },
        positions: [{ row: 2, column: 1 }],
        booster: BOOSTER_TYPE.ROW_FIRECRACKER,
      },
      {
        source: { row: 1, column: 3 },
        positions: [{ row: 1, column: 3 }],
        booster: BOOSTER_TYPE.BUTTON_BOX,
        targetType: TILE_TYPE.SWEETS_FISH,
      },
      {
        source: { row: 4, column: 5 },
        positions: [{ row: 4, column: 5 }],
        booster: BOOSTER_TYPE.AREA_KETTLE,
      },
    ],
    positions: [],
  }

  expect(getBoosterVisualEffects(wave)).toEqual([
    {
      id: 'booster-row-firecracker-2-1-0',
      type: BOOSTER_TYPE.ROW_FIRECRACKER,
      source: { row: 2, column: 1 },
    },
    {
      id: 'booster-area-kettle-4-5-2',
      type: BOOSTER_TYPE.AREA_KETTLE,
      source: { row: 4, column: 5 },
    },
  ])
})

test('visual effect position is expressed through board coordinates', () => {
  expect(getBoosterVisualEffectStyle({
    id: 'effect',
    type: BOOSTER_TYPE.COLUMN_FIRECRACKER,
    source: { row: 3, column: 7 },
  })).toEqual({
    '--effect-row': 3,
    '--effect-column': 7,
  })
})
