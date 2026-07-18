import type TileGrid from '@/entities/TileGrid'
import type { BoosterCreation } from '@/entities/Match3BoosterRules'
import type { Position } from '@/entities/Match3Engine'

export const preserveCreatedBoosters = (
  grid: TileGrid,
  positions: Position[],
  boosters: BoosterCreation[]
): Position[] => {
  const preservedPositions = new Set<string>()

  boosters.forEach((booster) => {
    const tile = grid.getTileByIndex(booster.position.row, booster.position.column)

    if (tile !== null) {
      tile.type = booster.type
      preservedPositions.add(getPositionKey(booster.position))
    }
  })

  return positions.filter(position => !preservedPositions.has(getPositionKey(position)))
}

const getPositionKey = ({ row, column }: Position): string => `${row}-${column}`
