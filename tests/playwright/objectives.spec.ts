import { expect, test } from '@playwright/test'

import { generateObjectives } from '@/entities/Objectives'
import { TileType } from '@/domain/enums'

const repeatType = (type: TileType, count: number): TileType[] => Array(count).fill(type)

test('objectives are generated from frequent starting board tile types', () => {
  const objectives = generateObjectives([
    ...repeatType(TileType.SweetsBarbaris, 12),
    ...repeatType(TileType.SweetsFish, 11),
    ...repeatType(TileType.SweetsRooster, 10),
    ...repeatType(TileType.SweetsPillow, 2),
    ...repeatType(TileType.SweetsBird, 1),
  ])
  const objectiveTypes = objectives.map(objective => objective.type)
  const frequentTypes = [
    TileType.SweetsBarbaris,
    TileType.SweetsFish,
    TileType.SweetsRooster,
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
