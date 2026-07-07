import type TileGrid from '@/entities/TileGrid'
import type { BoardTileType, ObjectiveType } from '@/enums/game'
import type { Tile } from '@/types/game'
import type { Position } from '@/entities/Match3Engine'
import { SPECIAL_TILE_TYPE } from '@/enums/game'
import { COOKIE_HEALTH, isMatchableTile, PACKAGE_HEALTH, SPECIAL_TARGETS } from '@/entities/Match3SpecialTileConfig'

export { AVAILABLE_TILE_TYPES, COUNTER_TYPES, isMatchableTile, isMovableTile, SPECIAL_OBJECTIVE_TYPES, SPECIAL_TARGETS } from '@/entities/Match3SpecialTileConfig'

type CreateTile = (type: BoardTileType, row: number, column: number) => Tile
type IncrementCounter = (type: ObjectiveType) => void

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

export const clearMatchedPositions = (
  grid: TileGrid,
  positions: Position[],
  width: number,
  height: number,
  incrementCounter: IncrementCounter
) => {
  const adjacentCookies = new Set<Tile>()

  positions.forEach((position) => {
    collectAdjacentCookies(grid, position, width, height, adjacentCookies)
    clearMatchedPosition(grid, position, incrementCounter)
  })

  adjacentCookies.forEach(tile => damageCookie(grid, tile, incrementCounter))
}

export const collectDroppedMugs = (
  grid: TileGrid,
  width: number,
  height: number,
  incrementCounter: IncrementCounter
) => {
  for (let column = 0; column < width; column++) {
    const tile = grid.getTileByIndex(height - 1, column)

    if (tile?.type === SPECIAL_TILE_TYPE.MUG) {
      incrementCounter(SPECIAL_TILE_TYPE.MUG)
      grid.setTile(null, height - 1, column)
    }
  }
}

const clearMatchedPosition = (grid: TileGrid, { row, column }: Position, incrementCounter: IncrementCounter) => {
  const tile = grid.getTileByIndex(row, column)

  if (tile === null) {
    return
  }

  tile.selected = false

  if (tile.blocker) {
    damagePackage(tile, incrementCounter)

    return
  }

  if (isMatchableTile(tile)) {
    incrementCounter(tile.type)
    grid.setTile(null, row, column)
  }
}

const collectAdjacentCookies = (
  grid: TileGrid,
  { row, column }: Position,
  width: number,
  height: number,
  cookies: Set<Tile>
) => {
  getNeighborPositions(row, column, width, height).forEach((position) => {
    const tile = grid.getTileByIndex(position.row, position.column)

    if (tile?.type === SPECIAL_TILE_TYPE.COOKIE) {
      cookies.add(tile)
    }
  })
}

const damagePackage = (tile: Tile, incrementCounter: IncrementCounter) => {
  if (!tile.blocker) {
    return
  }

  tile.blocker.health--

  if (tile.blocker.health <= 0) {
    tile.blocker = undefined
    incrementCounter(SPECIAL_TILE_TYPE.PACKAGE)
  }
}

const damageCookie = (grid: TileGrid, tile: Tile, incrementCounter: IncrementCounter) => {
  if (tile.type !== SPECIAL_TILE_TYPE.COOKIE || tile.health === undefined) {
    return
  }

  tile.health--

  if (tile.health <= 0) {
    const index = grid.indexOf(tile)

    if (index) {
      const [row, column] = index

      incrementCounter(SPECIAL_TILE_TYPE.COOKIE)
      grid.setTile(null, row, column)
    }
  }
}

const placeMugs = (grid: TileGrid, height: number, createTile: CreateTile) => {
  getRandomPositions(grid, SPECIAL_TARGETS[SPECIAL_TILE_TYPE.MUG], (_, row) => row < height - 1)
    .forEach(({ row, column }) => {
      grid.setTile(createTile(SPECIAL_TILE_TYPE.MUG, row, column), row, column)
    })
}

const placePackages = (grid: TileGrid) => {
  getRandomPositions(grid, SPECIAL_TARGETS[SPECIAL_TILE_TYPE.PACKAGE], (tile) => (
    tile !== null && isMatchableTile(tile)
  )).forEach(({ row, column }) => {
    const tile = grid.getTileByIndex(row, column)

    if (tile && isMatchableTile(tile)) {
      tile.blocker = { type: SPECIAL_TILE_TYPE.PACKAGE, health: PACKAGE_HEALTH }
    }
  })
}

const placeCookies = (grid: TileGrid, height: number, createTile: CreateTile) => {
  getRandomPositions(grid, SPECIAL_TARGETS[SPECIAL_TILE_TYPE.COOKIE], (tile, row) => (
    row > 0 && row < height - 1 && tile !== null && isMatchableTile(tile) && !tile.blocker
  )).forEach(({ row, column }) => {
    const cookie = createTile(SPECIAL_TILE_TYPE.COOKIE, row, column)

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

const getNeighborPositions = (row: number, column: number, width: number, height: number): Position[] => {
  return [
    { row: row - 1, column },
    { row: row + 1, column },
    { row, column: column - 1 },
    { row, column: column + 1 },
  ].filter(position => position.row >= 0 && position.row < height && position.column >= 0 && position.column < width)
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
