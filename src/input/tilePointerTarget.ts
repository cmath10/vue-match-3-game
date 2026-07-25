import type { PointerPosition } from '@/input/tileGesture'
import type { Position, Tile } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'

import { getDirectionalNeighbor, getSwipeDirection } from '@/input/tileGesture'

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
    : getNearestCellPosition(grid, end)
}

const getNearestCellPosition = (
  grid: TileGrid,
  pointer: PointerPosition
): Position | null => {
  const cells = [...document.querySelectorAll<HTMLElement>('.b-game-ground__cell')]
  const width = grid.getTileList()[0]?.length ?? 0

  if (cells.length === 0 || width === 0) {
    return null
  }

  const nearest = cells
    .map((cell, index) => ({ index, distance: getDistanceToCenter(cell, pointer) }))
    .reduce((closest, candidate) => candidate.distance < closest.distance ? candidate : closest)

  return {
    row: Math.floor(nearest.index / width),
    column: nearest.index % width,
  }
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
