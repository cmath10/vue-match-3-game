import type { Board, Position, Tile } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'
import type { TileMovement } from '@/domain/types'

import { collapseBoard } from '@/domain/board/transitions'

type SpawnTile = (row: number, column: number, spawnRow: number) => Tile

export const collapseGrid = (grid: TileGrid, orderOffset = 0): TileMovement[] => {
  const positionsBefore = getTilePositions(grid)
  const tilesById = new Map(grid.getTiles().map(tile => [tile.id.toString(), tile]))
  const collapsedBoard = collapseBoard(getTileIdBoard(grid))

  grid.clear()
  collapsedBoard.forEach((row, rowIndex) => row.forEach((tileId, columnIndex) => {
    const tile = tileId === null ? undefined : tilesById.get(tileId)

    if (tile !== undefined) {
      grid.setTile(tile, rowIndex, columnIndex)
    }
  }))

  return getMovedTiles(grid, positionsBefore, orderOffset)
}

export const refillGrid = (
  grid: TileGrid,
  width: number,
  height: number,
  spawnTile: SpawnTile,
  orderOffset = 0
): TileMovement[] => {
  const movements: TileMovement[] = []

  for (let column = 0; column < width; column++) {
    movements.push(...refillColumn(grid, column, height, spawnTile))
  }

  return movements.map((movement, index) => ({ ...movement, order: orderOffset + index }))
}

const getTileIdBoard = (grid: TileGrid): Board<string> => {
  return grid.getTileList().map(row => row.map((tile: Tile | null) => tile?.id.toString() ?? null))
}

const getTilePositions = (grid: TileGrid): Map<string, Position> => {
  const positions = new Map<string, Position>()

  grid.forEach((tile, row, column) => positions.set(tile.id.toString(), { row, column }))

  return positions
}

const getMovedTiles = (
  grid: TileGrid,
  positionsBefore: Map<string, Position>,
  orderOffset: number
): TileMovement[] => {
  const movements: TileMovement[] = []

  grid.forEach((tile, row, column) => {
    const from = positionsBefore.get(tile.id.toString())
    const to = { row, column }

    if (from !== undefined && !isSamePosition(from, to)) {
      movements.push({ tileId: tile.id.toString(), from, to, order: orderOffset + movements.length })
    }
  })

  return movements
}

const refillColumn = (
  grid: TileGrid,
  column: number,
  height: number,
  spawnTile: SpawnTile
): TileMovement[] => {
  const movements: TileMovement[] = []
  let spawnRow = -1

  for (let row = height - 1; row >= 0; row--) {
    if (grid.getTileByIndex(row, column) === null) {
      const tile = spawnTile(row, column, spawnRow--)

      movements.push({ tileId: tile.id.toString(), from: null, to: { row, column }, order: 0 })
    }
  }

  return movements
}

const isSamePosition = (a: Position, b: Position): boolean => {
  return a.row === b.row && a.column === b.column
}
