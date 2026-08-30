import type { BoardTileType } from '@/domain/enums'
import type { CollectObjective } from '@/domain/types'
import type { CollectorDefinition, GravityGraph } from '@/domain/levels/types'
import type { Position, Tile } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'

import { COOKIE_HEALTH } from '@/domain/config'
import { getCellKey } from '@/domain/levels/coordinates'
import { isMatchableTile } from '@/domain/tiles'
import { PACKAGE_HEALTH } from '@/domain/config'
import { parseCellKey } from '@/domain/levels/coordinates'
import { SPECIAL_TARGETS } from '@/domain/config'
import { SpecialTileType } from '@/domain/enums'

type CreateTile = (type: BoardTileType, row: number, column: number) => Tile
type Shuffle = <T>(items: readonly T[]) => T[]

export const placeSpecialTiles = (
  grid: TileGrid,
  width: number,
  height: number,
  createTile: CreateTile,
  shuffle: Shuffle
) => {
  placeMugs(grid, height, createTile, shuffle)
  placePackages(grid, shuffle)
  placeCookies(grid, height, createTile, shuffle)
}

export const collectDroppedMugs = (
  grid: TileGrid,
  gravity: GravityGraph,
  collectors: readonly CollectorDefinition[],
  collectObjective: CollectObjective
) => {
  collectors.forEach(collector => collectMugsAtCollector(grid, gravity, collector, collectObjective))
}

const collectMugsAtCollector = (
  grid: TileGrid,
  gravity: GravityGraph,
  collector: CollectorDefinition,
  collectObjective: CollectObjective
): void => {
  let key: `${number}:${number}` | undefined = getCellKey(collector.cell)

  while (key !== undefined) {
    if (!collectMug(grid, key, collectObjective)) {
      return
    }
    key = gravity.nodes.get(key)?.incoming[0]
  }
}

const collectMug = (
  grid: TileGrid,
  key: `${number}:${number}`,
  collectObjective: CollectObjective
): boolean => {
  const { row, column } = parseCellKey(key)
  const tile = grid.getTileByIndex(row, column)

  if (tile?.type !== SpecialTileType.Mug) {
    return false
  }

  collectObjective({ tileId: tile.id, type: SpecialTileType.Mug, position: { row, column } })
  grid.setTile(null, row, column)
  return true
}

const placeMugs = (grid: TileGrid, height: number, createTile: CreateTile, shuffle: Shuffle) => {
  getRandomPositions(grid, SPECIAL_TARGETS[SpecialTileType.Mug], (_, row) => row < height - 1, shuffle)
    .forEach(({ row, column }) => {
      grid.setTile(createTile(SpecialTileType.Mug, row, column), row, column)
    })
}

const placePackages = (grid: TileGrid, shuffle: Shuffle) => {
  getRandomPositions(grid, SPECIAL_TARGETS[SpecialTileType.Package], (tile) => (
    tile !== null && isMatchableTile(tile)
  ), shuffle).forEach(({ row, column }) => {
    const tile = grid.getTileByIndex(row, column)

    if (tile && isMatchableTile(tile)) {
      tile.blocker = { type: SpecialTileType.Package, health: PACKAGE_HEALTH }
    }
  })
}

const placeCookies = (grid: TileGrid, height: number, createTile: CreateTile, shuffle: Shuffle) => {
  getRandomPositions(grid, SPECIAL_TARGETS[SpecialTileType.Cookie], (tile, row) => (
    row > 0 && row < height - 1 && tile !== null && isMatchableTile(tile) && !tile.blocker
  ), shuffle).forEach(({ row, column }) => {
    const cookie = createTile(SpecialTileType.Cookie, row, column)

    cookie.health = COOKIE_HEALTH
    grid.setTile(cookie, row, column)
  })
}

const getRandomPositions = (
  grid: TileGrid,
  count: number,
  predicate: (tile: Tile | null, row: number, column: number) => boolean,
  shuffle: Shuffle
): Position[] => {
  const positions: Position[] = []

  grid.forEachCell((tile, row, column) => {
    if (predicate(tile, row, column)) {
      positions.push({ row, column })
    }
  })

  return shuffle(positions).slice(0, count)
}
