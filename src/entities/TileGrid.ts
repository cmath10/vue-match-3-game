import { Tile } from '@/types/game'

export type TilePredicate = (tile: Tile, i: number, j: number) => boolean
export type TilePosition = {
  row: number
  column: number
}

export default class TileGrid {
  private readonly width: number
  private readonly height: number
  private tiles: Array<Array<Tile | null>> = []

  constructor (width: number, height: number) {
    this.width = width
    this.height = height
    for (let i = 0; i < height; i++) {
      const row: Array<Tile | null> = []

      for (let j = 0; j < width; j++) {
        row.push(null)
      }

      this.tiles.push(row)
    }
  }

  public getTileList (): Array<Array<Tile | null>> {
    return this.tiles
  }

  public getTiles (): Tile[] {
    const tiles: Tile[] = []

    this.forEach(tile => {
      tiles.push(tile)
    })

    return tiles
  }

  public getTileByIndex (i: number, j: number): Tile | null {
    return this.tiles[i] ? this.tiles[i][j] || null : null
  }

  public setTile (tile: Tile | null, i: number, j: number, position?: TilePosition): void {
    this.tiles[i][j] = tile

    if (tile) {
      tile.row = position ? position.row : i
      tile.column = position ? position.column : j
    }
  }

  public indexOf (tile: Tile): number[] | null {
    for (let i = 0; i < this.tiles.length; i++) {
      const j = this.tiles[i].indexOf(tile)
      if (j !== -1) {
        return [i, j]
      }
    }

    return null
  }

  public find (predicate: TilePredicate): Tile | null {
    for (let i = 0; i < this.tiles.length; i++) {
      for (let j = 0; j < this.tiles[i].length; j++) {
        const tile = this.tiles[i][j]

        if (tile && predicate(tile, i, j)) {
          return tile
        }
      }
    }

    return null
  }

  public forEach (fn: (tile: Tile, i: number, j: number) => void) {
    this.tiles.forEach((row, i) => row.forEach((tile, j) => {
      if (tile) {
        fn(tile, i, j)
      }
    }))
  }

  public forEachCell (fn: (tile: Tile | null, i: number, j: number) => void) {
    this.tiles.forEach((row, i) => row.forEach((tile, j) => {
      fn(tile, i, j)
    }))
  }

  public shake (): void {
    for (let j = 0; j < this.width; j++) {
      let targetRow = this.height - 1

      for (let i = this.height - 1; i >= 0; i--) {
        const tile = this.tiles[i][j]

        if (tile) {
          this.setTile(null, i, j)
          this.setTile(tile, targetRow, j)
          targetRow--
        }
      }
    }
  }

  public isNeighbors (a: Tile, b: Tile) {
    const indexOfA = this.indexOf(a)
    const indexOfB = this.indexOf(b)

    return indexOfA && indexOfB && (
      TileGrid.isNeighborsByRow(indexOfA, indexOfB) ||
      TileGrid.isNeighborsByColumn(indexOfA, indexOfB)
    )
  }

  private static isNeighborsByRow (indexOfA: number[], indexOfB: number[]) {
    const [ai, aj] = indexOfA
    const [bi, bj] = indexOfB

    return ai === bi && Math.abs(aj - bj) === 1
  }

  private static isNeighborsByColumn (indexOfA: number[], indexOfB: number[]) {
    const [ai, aj] = indexOfA
    const [bi, bj] = indexOfB

    return aj === bj && Math.abs(ai - bi) === 1
  }
}
