import type { Counter, GameResult, Objective } from '@/domain/types'

import { TileType } from '@/domain/enums'

const OBJECTIVE_COUNT = 2
const OBJECTIVE_POOL_DIVISOR = 2
const OBJECTIVE_TARGET_BUDGET = 50
const OBJECTIVE_TARGET_STEP = 5
const OBJECTIVE_TARGET_MIN = 20

type TileTypeCount = {
  type: TileType
  count: number
}

export const generateObjectives = (tileTypes: TileType[]): Objective[] => {
  const pool = getObjectiveTypePool(tileTypes)
  const objectiveTypes: TileTypeCount[] = []

  while (objectiveTypes.length < OBJECTIVE_COUNT && pool.length) {
    const [tileTypeCount] = pool.splice(randomIndex(pool), 1)

    objectiveTypes.push(tileTypeCount)
  }

  const targets = distributeObjectiveTargets(objectiveTypes)

  return objectiveTypes.map((tileTypeCount, index) => ({
    type: tileTypeCount.type,
    count: targets[index],
  }))
}

export const getGameResult = (
  objectives: Objective[],
  counters: Counter[],
  turns: number
): GameResult | null => {
  if (areObjectivesCompleted(objectives, counters)) {
    return 'win'
  }

  return turns === 0 ? 'lose' : null
}

const getObjectiveTypePool = (tileTypes: TileType[]): TileTypeCount[] => {
  const counts = getTileTypeCounts(tileTypes).sort((a, b) => b.count - a.count)
  const poolSize = Math.max(OBJECTIVE_COUNT, Math.ceil(counts.length / OBJECTIVE_POOL_DIVISOR))

  return counts.slice(0, poolSize)
}

const getTileTypeCounts = (tileTypes: TileType[]): TileTypeCount[] => {
  const counts = new Map<TileType, number>()

  tileTypes.forEach(type => counts.set(type, (counts.get(type) || 0) + 1))

  return [...counts.entries()].map(([type, count]) => ({ type, count }))
}

const distributeObjectiveTargets = (objectiveTypes: TileTypeCount[]): number[] => {
  const countTotal = objectiveTypes.reduce((total, tileTypeCount) => total + tileTypeCount.count, 0)
  let remainingBudget = OBJECTIVE_TARGET_BUDGET

  return objectiveTypes.map((tileTypeCount, index) => {
    if (index === objectiveTypes.length - 1) {
      return remainingBudget
    }

    const remainingObjectives = objectiveTypes.length - index
    const maxTarget = remainingBudget - OBJECTIVE_TARGET_MIN * (remainingObjectives - 1)
    const weightedTarget = roundToTargetStep(OBJECTIVE_TARGET_BUDGET * tileTypeCount.count / countTotal)
    const target = clamp(weightedTarget, OBJECTIVE_TARGET_MIN, maxTarget)

    remainingBudget -= target

    return target
  })
}

const areObjectivesCompleted = (objectives: Objective[], counters: Counter[]): boolean => {
  return objectives.every((objective) => {
    const counter = counters.find((item: Counter) => item.type === objective.type)

    return (counter?.count || 0) >= objective.count
  })
}

const randomIndex = <T>(array: T[]): number => Math.floor(Math.random() * array.length)
const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)
const roundToTargetStep = (value: number): number => Math.round(value / OBJECTIVE_TARGET_STEP) * OBJECTIVE_TARGET_STEP
