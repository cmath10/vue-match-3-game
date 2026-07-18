import type { Position } from '@/entities/Match3Engine'

export type PointerPosition = {
  x: number
  y: number
}

export type SwipeDirection = 'up' | 'right' | 'down' | 'left'

export const getSwipeDirection = (
  start: PointerPosition,
  end: PointerPosition,
  threshold: number
): SwipeDirection | null => {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y

  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) <= threshold) {
    return null
  }

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX < 0 ? 'left' : 'right'
  }

  return deltaY < 0 ? 'up' : 'down'
}

export const getDirectionalNeighbor = (
  source: Position,
  direction: SwipeDirection
): Position => {
  if (direction === 'up') {
    return { row: source.row - 1, column: source.column }
  }

  if (direction === 'right') {
    return { row: source.row, column: source.column + 1 }
  }

  if (direction === 'down') {
    return { row: source.row + 1, column: source.column }
  }

  return { row: source.row, column: source.column - 1 }
}
