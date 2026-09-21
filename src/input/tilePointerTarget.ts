import type { CellKey } from '@/domain/levels/types'
import type { PointerPosition } from '@/input/tileGesture'
import type { Position, Tile } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'

import { getDirectionalNeighbor, getSwipeDirection } from '@/input/tileGesture'
import { parseCellKey } from '@/domain/levels/coordinates'

const CENTER_DIVISOR = 2
const SWIPE_THRESHOLD_RATIO = 0.18

export const getPointerTargetTile = (
  grid: TileGrid,
  source: Tile,
  start: PointerPosition,
  end: PointerPosition
): Tile | null => {
  const position = getPointerTargetPosition(grid, source, start, end)

  return position === null ? null : grid.getTileByIndex(position.row, position.column)
}

const getPointerTargetPosition = (
  grid: TileGrid,
  source: Tile,
  start: PointerPosition,
  end: PointerPosition
): Position | null => {
  const sourcePosition = getGridPosition(grid, source)
  const direction = getSwipeDirection(start, end, getSwipeThreshold())

  return sourcePosition !== null && direction !== null
    ? getDirectionalNeighbor(sourcePosition, direction)
    : getNearestCellPosition(end)
}

const getNearestCellPosition = (
  pointer: PointerPosition
): Position | null => {
  const cells = [...document.querySelectorAll<HTMLElement>('.b-game-ground__cell')]

  if (cells.length === 0) {
    return null
  }

  const nearest = cells
    .map(cell => ({ cell, distance: getDistanceToCenter(cell, pointer) }))
    .reduce((closest, candidate) => candidate.distance < closest.distance ? candidate : closest)

  const key = nearest.cell.dataset.cellKey

  return key === undefined ? null : parseCellKey(key as CellKey)
}

const getSwipeThreshold = (): number => {
  const cell = document.querySelector<HTMLElement>('.b-game-ground__cell')
  const rect = cell?.getBoundingClientRect()

  return rect === undefined ? 0 : Math.min(rect.width, rect.height) * SWIPE_THRESHOLD_RATIO
}

const getGridPosition = (grid: TileGrid, tile: Tile): Position | null => {
  const index = grid.indexOf(tile)

  return index === null ? null : { row: index[0], column: index[1] }
}

const getDistanceToCenter = (element: HTMLElement, pointer: PointerPosition): number => {
  const rect = element.getBoundingClientRect()

  return Math.hypot(
    rect.x + rect.width / CENTER_DIVISOR - pointer.x,
    rect.y + rect.height / CENTER_DIVISOR - pointer.y
  )
}
