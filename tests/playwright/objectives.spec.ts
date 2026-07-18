import { expect, test } from '@playwright/test'

import { generateObjectives } from '@/entities/Match3Objectives'
import { TILE_TYPE } from '@/enums/game'

const repeatType = (type: TILE_TYPE, count: number): TILE_TYPE[] => Array(count).fill(type)

test('objectives are generated from frequent starting board tile types', () => {
  const objectives = generateObjectives([
    ...repeatType(TILE_TYPE.SWEETS_BARBARIS, 12),
    ...repeatType(TILE_TYPE.SWEETS_FISH, 11),
    ...repeatType(TILE_TYPE.SWEETS_ROOSTER, 10),
    ...repeatType(TILE_TYPE.SWEETS_PILLOW, 2),
    ...repeatType(TILE_TYPE.SWEETS_BIRD, 1),
  ])
  const objectiveTypes = objectives.map(objective => objective.type)
  const frequentTypes = [
    TILE_TYPE.SWEETS_BARBARIS,
    TILE_TYPE.SWEETS_FISH,
    TILE_TYPE.SWEETS_ROOSTER,
  ]

  expect(objectives).toHaveLength(2)
  expect(new Set(objectiveTypes).size).toBe(objectives.length)
  objectiveTypes.forEach(type => expect(frequentTypes).toContain(type))
  expect(objectives.reduce((total, objective) => total + objective.count, 0)).toBe(50)
  objectives.forEach((objective) => {
    expect(objective.count).toBeGreaterThanOrEqual(20)
    expect(objective.count).toBeLessThanOrEqual(30)
    expect(objective.count % 5).toBe(0)
  })
})
