import type { Counter, Objective } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { getGameResult } from '@/domain/objectives'
import { TileType } from '@/domain/enums'

const objective = (type: TileType, count: number): Objective => ({ type, count })
const counter = (type: TileType, count: number): Counter => ({ type, count })

test('game result is based on objectives and remaining turns', () => {
  const objectives = [
    objective(TileType.SweetsBarbaris, 20),
    objective(TileType.SweetsFish, 30),
  ]

  expect(getGameResult(objectives, [
    counter(TileType.SweetsBarbaris, 20),
    counter(TileType.SweetsFish, 30),
  ], 0)).toBe('win')
  expect(getGameResult(objectives, [
    counter(TileType.SweetsBarbaris, 20),
    counter(TileType.SweetsFish, 29),
  ], 0)).toBe('lose')
  expect(getGameResult(objectives, [
    counter(TileType.SweetsBarbaris, 20),
    counter(TileType.SweetsFish, 29),
  ], 1)).toBeNull()
})
