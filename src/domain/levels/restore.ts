import type { CompiledLevel } from '@/domain/levels/types'

import { getCellKey } from '@/domain/levels/coordinates'

export const isBoardCompatibleWithLevel = <T>(
  level: CompiledLevel,
  board: Array<Array<T | null>>
): boolean => {
  const { width, height } = level.topology.bounds

  if (board.length !== height || board.some(row => row.length !== width)) {
    return false
  }

  return board.every((row, rowIndex) => row.every((tile, columnIndex) => (
    level.topology.playableCells.has(getCellKey({ row: rowIndex, column: columnIndex })) || tile === null
  )))
}
