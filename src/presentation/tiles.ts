import type { BoardEdgeGuide } from '@/domain/levels/types'
import type { Tile } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'

import { parseCellKey } from '@/domain/levels/coordinates'

export type GameCell = {
  key: string
  style: {
    gridColumn: number
    gridRow: number
  }
}

export const getBoardStyle = (width: number, height: number) => ({
  '--board-column-count': width,
  '--board-row-count': height,
})

export const getTileStyle = (tile: Tile, movementDuration?: number) => ({
  '--tile-movement-duration': movementDuration === undefined ? undefined : `${movementDuration}ms`,
  transform: `translate(calc(${tile.column} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)), calc(${tile.row} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)))`,
})

export const getBoardEdgeGuideKey = (guide: BoardEdgeGuide): string => (
  guide.kind === 'collector'
    ? `collector-${guide.collectorId}`
    : `gravity-${guide.anchor.side}-${'column' in guide.anchor ? guide.anchor.column : guide.anchor.row}`
)

export const getBoardEdgeGuideClasses = (guide: BoardEdgeGuide) => ({
  'b-game-board-shell__guide': true,
  [`b-game-board-shell__guide--${guide.anchor.side}`]: true,
  [`b-game-board-shell__guide--${guide.kind}`]: true,
})

export const getBoardEdgeGuideStyle = (guide: BoardEdgeGuide) => ({
  '--guide-column': 'column' in guide.anchor ? guide.anchor.column : 0,
  '--guide-row': 'row' in guide.anchor ? guide.anchor.row : 0,
})

export const getGridCells = (grid: TileGrid): GameCell[] => {
  return [...grid.getTopology().playableCells].map((key) => {
    const { row, column } = parseCellKey(key)

    return {
      key,
      style: { gridColumn: column + 1, gridRow: row + 1 },
    }
  })
}
