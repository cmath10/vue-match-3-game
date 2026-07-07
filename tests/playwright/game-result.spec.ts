import { expect, test } from '@playwright/test'

import { getGameResult } from '../../src/entities/Match3GameResult'
import { TILE_TYPE } from '../../src/enums/game'
import type { Counter, Objective } from '../../src/types/game'

const objective = (type: TILE_TYPE, count: number): Objective => ({ type, count })
const counter = (type: TILE_TYPE, count: number): Counter => ({ type, count })

test('game result is based on objectives and remaining turns', () => {
  const objectives = [
    objective(TILE_TYPE.SWEETS_BARBARIS, 20),
    objective(TILE_TYPE.SWEETS_COOKIE, 30),
  ]

  expect(getGameResult(objectives, [
    counter(TILE_TYPE.SWEETS_BARBARIS, 20),
    counter(TILE_TYPE.SWEETS_COOKIE, 30),
  ], 0)).toBe('win')
  expect(getGameResult(objectives, [
    counter(TILE_TYPE.SWEETS_BARBARIS, 20),
    counter(TILE_TYPE.SWEETS_COOKIE, 29),
  ], 0)).toBe('lose')
  expect(getGameResult(objectives, [
    counter(TILE_TYPE.SWEETS_BARBARIS, 20),
    counter(TILE_TYPE.SWEETS_COOKIE, 29),
  ], 1)).toBeNull()
})
