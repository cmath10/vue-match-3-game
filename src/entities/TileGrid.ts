import { Tile } from '@/types/game'

export type TilePredicate = (tile: Tile, i: number, j: number) => boolean

export default class TileGrid {
  private readonly width: number
  private readonly height: number
  private tiles: Tile[][] = []

  constructor (width: number, height: number) {
    this.width = width
    this.height = height
    for (let i = 0; i < height; i++) {
      const row: Tile[] = []

      for (let j = 0; j < width; j++) {
        row.push({ type: null, selected: false })
      }

      this.tiles.push(row)
    }
  }

  public getTileList (): Tile[][] {
    return this.tiles
  }

  public getTileByIndex (i: number, j: number): Tile | null {
    return this.tiles[i] ? this.tiles[i][j] || null : null
  }

  public setTile (tile: Tile, i: number, j: number): void {
    this.tiles[i][j] = tile
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
        if (predicate(this.tiles[i][j], i, j)) {
          return this.tiles[i][j]
        }
      }
    }

    return null
  }

  public forEach (fn: (tile: Tile, i: number, j: number) => void) {
    this.tiles.forEach((row, i) => row.forEach((tile, j) => {
      fn(tile, i, j)
    }))
  }

  // eslint-disable-next-line complexity
  public shake (): void {
    for (let i = this.height - 1; i >= 0; i--) {
      for (let j = 0; j < this.width; j++) {
        if (this.tiles[i][j].type === null) {
          // eslint-disable-next-line max-depth
          for (let k = i; k >= 0; k--) {
            // eslint-disable-next-line max-depth
            if (this.tiles[k][j].type !== null) {
              const _tile = this.tiles[k][j]
              this.tiles[k][j] = this.tiles[i][j]
              this.tiles[i][j] = _tile
              break
            }
          }
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
