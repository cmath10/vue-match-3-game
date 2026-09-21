import type { Counter, GameResult, Objective } from '@/domain/types'

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

const areObjectivesCompleted = (objectives: Objective[], counters: Counter[]): boolean => {
  return objectives.every((objective) => {
    const counter = counters.find((item: Counter) => item.type === objective.type)

    return (counter?.count || 0) >= objective.count
  })
}
