import type {
  BoardBounds,
  BoardEdgeAnchor,
  CellKey,
  Direction,
} from '@/domain/levels/types'
import type { Position } from '@/domain/types'

import { getCellKey } from '@/domain/levels/coordinates'

export const DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right']

export const DELTAS: Readonly<Record<Direction, Position>> = {
  down: { row: 1, column: 0 },
  up: { row: -1, column: 0 },
  left: { row: 0, column: -1 },
  right: { row: 0, column: 1 },
}

export const movePosition = (position: Position, direction: Direction): Position => ({
  row: position.row + DELTAS[direction].row,
  column: position.column + DELTAS[direction].column,
})

export const getNeighborKeys = (position: Position): Array<[Direction, CellKey]> => (
  DIRECTIONS.map(direction => [direction, getCellKey(movePosition(position, direction))])
)

export const isValidAnchor = (anchor: BoardEdgeAnchor, bounds: BoardBounds): boolean => (
  'column' in anchor
    ? anchor.column >= 0 && anchor.column < bounds.width
    : anchor.row >= 0 && anchor.row < bounds.height
)

export const getVirtualTarget = (anchor: BoardEdgeAnchor, bounds: BoardBounds): Position => {
  if ('column' in anchor) {
    return { row: anchor.side === 'top' ? -1 : bounds.height, column: anchor.column }
  }

  return { row: anchor.row, column: anchor.side === 'left' ? -1 : bounds.width }
}

export const getDirectionAnchor = (direction: Direction, terminal: Position): BoardEdgeAnchor => {
  if (direction === 'down' || direction === 'up') {
    return { side: direction === 'down' ? 'bottom' : 'top', column: terminal.column }
  }

  return { side: direction === 'left' ? 'left' : 'right', row: terminal.row }
}
