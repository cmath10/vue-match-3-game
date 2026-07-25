import type { Tile } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'

export type GameCell = { key: string }

export const getBoardStyle = (width: number, height: number) => ({
  '--board-column-count': width,
  '--board-row-count': height,
})

export const getTileStyle = (tile: Tile) => ({
  transform: `translate(calc(${tile.column} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)), calc(${tile.row} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)))`,
})

export const getGridCells = (grid: TileGrid): GameCell[] => {
  return grid.getTileList()
    .flatMap((row, rowIndex) => row.map((_, columnIndex) => ({ key: `${rowIndex}-${columnIndex}` })))
}
