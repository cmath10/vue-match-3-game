import type { CollectObjective } from '@/domain/types'
import type { CollectorDefinition } from '@/domain/levels/types'
import type TileGrid from '@/game/board/TileGrid'

import { getCellKey } from '@/domain/levels/coordinates'
import { parseCellKey } from '@/domain/levels/coordinates'
import { SpecialTileType } from '@/domain/enums'

export const collectDroppedMugs = (
  grid: TileGrid,
  collectors: readonly CollectorDefinition[],
  collectObjective: CollectObjective
): number => collectors.filter(collector => (
  collectMug(grid, getCellKey(collector.cell), collectObjective)
)).length

const collectMug = (
  grid: TileGrid,
  key: `${number}:${number}`,
  collectObjective: CollectObjective
): boolean => {
  const { row, column } = parseCellKey(key)
  const tile = grid.getTileByIndex(row, column)

  if (tile?.type !== SpecialTileType.Mug) {
    return false
  }

  collectObjective({ tileId: tile.id, type: SpecialTileType.Mug, position: { row, column } })
  grid.setTile(null, row, column)
  return true
}
