import type { BoosterCreation } from '@/domain/types'
import type TileGrid from '@/entities/TileGrid'

export const placeCreatedBoosters = (
  grid: TileGrid,
  boosters: BoosterCreation[]
): void => {
  boosters.forEach((booster) => {
    const tile = grid.getTileByIndex(booster.position.row, booster.position.column)

    if (tile !== null) {
      tile.type = booster.type
    }
  })
}
