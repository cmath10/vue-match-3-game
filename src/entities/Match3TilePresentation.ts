import type TileGrid from '@/entities/TileGrid'
import type { Tile } from '@/types/game'

export type GameCell = { key: string }

export const getTileStyle = (tile: Tile) => ({
  transform: `translate(calc(${tile.column} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)), calc(${tile.row} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)))`,
})

export const getGridCells = (grid: TileGrid): GameCell[] => {
  return grid.getTileList()
    .flatMap((row, rowIndex) => row.map((_, columnIndex) => ({ key: `${rowIndex}-${columnIndex}` })))
}

export const getPointerTargetTile = (grid: TileGrid, event: PointerEvent): Tile | null => {
  const element = document.elementFromPoint(event.clientX, event.clientY)
  const tileElement = element?.closest<HTMLElement>('[data-tile-id]')
  const tileId = Number(tileElement?.dataset.tileId)

  return Number.isNaN(tileId) ? null : grid.find(tile => tile.id === tileId)
}
