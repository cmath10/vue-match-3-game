import type { BoardEdgeGuide, BoardTopology, CellKey } from '@/domain/levels/types'
import type { Tile } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'

import { parseCellKey } from '@/domain/levels/coordinates'

export type GameCell = {
  key: string
  edges: {
    bottom: boolean
    left: boolean
    right: boolean
    top: boolean
  }
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

export const getBoardEdgeGuideStyle = (guide: BoardEdgeGuide) => {
  const terminal = guide.kind === 'collector' ? guide.terminal : guide.terminals[0]

  return {
    '--guide-column': terminal.column,
    '--guide-row': terminal.row,
  }
}

export const createGameCell = (topology: BoardTopology, key: CellKey): GameCell => {
  const { row, column } = parseCellKey(key)
  const isVoid = (neighborRow: number, neighborColumn: number): boolean => (
    !topology.playableCells.has(`${neighborRow}:${neighborColumn}`)
  )

  return {
    key,
    edges: {
      bottom: isVoid(row + 1, column),
      left: isVoid(row, column - 1),
      right: isVoid(row, column + 1),
      top: isVoid(row - 1, column),
    },
    style: { gridColumn: column + 1, gridRow: row + 1 },
  }
}

export const getGridCells = (grid: TileGrid): GameCell[] => {
  const topology = grid.getTopology()

  return [...topology.playableCells].map(key => createGameCell(topology, key))
}
