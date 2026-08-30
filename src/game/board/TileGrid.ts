import type { BoardState } from '@/domain/types'
import type { BoardTopology } from '@/domain/levels/types'
import type { Position, Tile } from '@/domain/types'

import { createRectangularTopology } from '@/domain/board/topology'
import { getCellKey } from '@/domain/levels/coordinates'

type TilePredicate = (tile: Tile, row: number, column: number) => boolean

export default class TileGrid {
  private readonly topology: BoardTopology
  private readonly width: number
  private readonly height: number
  private tiles: Array<Array<Tile | null>> = []

  constructor (topology: BoardTopology)
  constructor (width: number, height: number)
  constructor (topologyOrWidth: BoardTopology | number, height?: number) {
    this.topology = typeof topologyOrWidth === 'number'
      ? createRectangularTopology(topologyOrWidth, height ?? 0)
      : topologyOrWidth
    this.width = this.topology.bounds.width
    this.height = this.topology.bounds.height
    for (let i = 0; i < this.height; i++) {
      const row: Array<Tile | null> = []

      for (let j = 0; j < this.width; j++) {
        row.push(null)
      }

      this.tiles.push(row)
    }
  }

  public getTileList (): Array<Array<Tile | null>> {
    return this.tiles
  }

  public getState (): BoardState<Tile> {
    return { topology: this.topology, occupancy: this.tiles }
  }

  public getTopology (): BoardTopology {
    return this.topology
  }

  public getTiles (): Tile[] {
    const tiles: Tile[] = []

    this.forEach(tile => {
      tiles.push(tile)
    })

    return tiles
  }

  public getTileByIndex (i: number, j: number): Tile | null {
    if (!this.isPlayable(i, j)) {
      return null
    }

    return this.tiles[i] ? this.tiles[i][j] || null : null
  }

  public setTile (tile: Tile | null, i: number, j: number, position?: Position): void {
    if (tile !== null && !this.isPlayable(i, j)) {
      throw new Error(`Cannot place a tile in void cell ${i}:${j}`)
    }

    this.tiles[i][j] = tile

    if (tile !== null) {
      const tilePosition = position ?? { row: i, column: j }

      tile.row = tilePosition.row
      tile.column = tilePosition.column
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
      if (this.isPlayable(i, j)) {
        fn(tile, i, j)
      }
    }))
  }

  public clear (): void {
    this.forEachCell((_, i, j) => {
      this.setTile(null, i, j)
    })
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

  private isPlayable (row: number, column: number): boolean {
    return this.topology.playableCells.has(getCellKey({ row, column }))
  }
}
