import type { BoardBounds, CellKey } from '@/domain/levels/types'
import type { Position } from '@/domain/types'

export const getCellKey = ({ row, column }: Position): CellKey => `${row}:${column}`

export const parseCellKey = (key: CellKey): Position => {
  const [row, column] = key.split(':').map(Number)

  return { row, column }
}

export const isInsideBounds = (position: Position, bounds: BoardBounds): boolean => (
  position.row >= 0 && position.row < bounds.height &&
  position.column >= 0 && position.column < bounds.width
)

export const isPlayablePosition = (
  playableCells: ReadonlySet<CellKey>,
  position: Position
): boolean => playableCells.has(getCellKey(position))
