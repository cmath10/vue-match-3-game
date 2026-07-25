import type { BoardTileType } from '@/domain/enums'
import type { CollectObjective, Position, Tile } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'

import { COOKIE_HEALTH } from '@/domain/config'
import { isMatchableTile } from '@/domain/tiles'
import { PACKAGE_HEALTH, SPECIAL_TARGETS } from '@/domain/config'
import { SpecialTileType } from '@/domain/enums'

type CreateTile = (type: BoardTileType, row: number, column: number) => Tile

export const placeSpecialTiles = (
  grid: TileGrid,
  width: number,
  height: number,
  createTile: CreateTile
) => {
  placeMugs(grid, height, createTile)
  placePackages(grid)
  placeCookies(grid, height, createTile)
}

export const collectDroppedMugs = (
  grid: TileGrid,
  width: number,
  height: number,
  collectObjective: CollectObjective
) => {
  for (let column = 0; column < width; column++) {
    collectMugsInColumn(grid, height, column, collectObjective)
  }
}

const collectMugsInColumn = (
  grid: TileGrid,
  height: number,
  column: number,
  collectObjective: CollectObjective
): void => {
  for (let row = height - 1; row >= 0; row--) {
    const tile = grid.getTileByIndex(row, column)

    if (tile?.type !== SpecialTileType.Mug) {
      break
    }

    collectObjective({ tileId: tile.id, type: SpecialTileType.Mug, position: { row, column } })
    grid.setTile(null, row, column)
  }
}

const placeMugs = (grid: TileGrid, height: number, createTile: CreateTile) => {
  getRandomPositions(grid, SPECIAL_TARGETS[SpecialTileType.Mug], (_, row) => row < height - 1)
    .forEach(({ row, column }) => {
      grid.setTile(createTile(SpecialTileType.Mug, row, column), row, column)
    })
}

const placePackages = (grid: TileGrid) => {
  getRandomPositions(grid, SPECIAL_TARGETS[SpecialTileType.Package], (tile) => (
    tile !== null && isMatchableTile(tile)
  )).forEach(({ row, column }) => {
    const tile = grid.getTileByIndex(row, column)

    if (tile && isMatchableTile(tile)) {
      tile.blocker = { type: SpecialTileType.Package, health: PACKAGE_HEALTH }
    }
  })
}

const placeCookies = (grid: TileGrid, height: number, createTile: CreateTile) => {
  getRandomPositions(grid, SPECIAL_TARGETS[SpecialTileType.Cookie], (tile, row) => (
    row > 0 && row < height - 1 && tile !== null && isMatchableTile(tile) && !tile.blocker
  )).forEach(({ row, column }) => {
    const cookie = createTile(SpecialTileType.Cookie, row, column)

    cookie.health = COOKIE_HEALTH
    grid.setTile(cookie, row, column)
  })
}

const getRandomPositions = (
  grid: TileGrid,
  count: number,
  predicate: (tile: Tile | null, row: number, column: number) => boolean
): Position[] => {
  const positions: Position[] = []

  grid.forEachCell((tile, row, column) => {
    if (predicate(tile, row, column)) {
      positions.push({ row, column })
    }
  })

  return shuffle(positions).slice(0, count)
}

const shuffle = <T>(items: T[]): T[] => {
  const result = [...items]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const item = result[i]

    result[i] = result[j]
    result[j] = item
  }

  return result
}
