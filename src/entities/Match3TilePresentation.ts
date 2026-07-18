import type TileGrid from '@/entities/TileGrid'
import type { Tile } from '@/types/game'

const CENTER_DIVISOR = 2

export type GameCell = { key: string }

export const getTileStyle = (tile: Tile) => ({
  transform: `translate(calc(${tile.column} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)), calc(${tile.row} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)))`,
})

export const getGridCells = (grid: TileGrid): GameCell[] => {
  return grid.getTileList()
    .flatMap((row, rowIndex) => row.map((_, columnIndex) => ({ key: `${rowIndex}-${columnIndex}` })))
}

export const getPointerTargetTile = (grid: TileGrid, event: PointerEvent): Tile | null => {
  const position = getNearestCellPosition(grid, event)

  return position === null ? null : grid.getTileByIndex(position.row, position.column)
}

const getNearestCellPosition = (
  grid: TileGrid,
  event: PointerEvent
): { row: number, column: number } | null => {
  const cells = [...document.querySelectorAll<HTMLElement>('.b-game-ground__cell')]
  const width = grid.getTileList()[0]?.length ?? 0

  if (cells.length === 0 || width === 0) {
    return null
  }

  const nearest = cells
    .map((cell, index) => ({ index, distance: getDistanceToCenter(cell, event) }))
    .reduce((closest, candidate) => candidate.distance < closest.distance ? candidate : closest)

  return {
    row: Math.floor(nearest.index / width),
    column: nearest.index % width,
  }
}

const getDistanceToCenter = (element: HTMLElement, event: PointerEvent): number => {
  const rect = element.getBoundingClientRect()

  return Math.hypot(
    rect.x + rect.width / CENTER_DIVISOR - event.clientX,
    rect.y + rect.height / CENTER_DIVISOR - event.clientY
  )
}
