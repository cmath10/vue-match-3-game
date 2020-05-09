<template>
    <div>
        <h1>Game</h1>

        <div class="b-game-ground">
            <div
                v-for="cell in ground"
                :key="cell.point.x + '-' + cell.point.y"
                class="b-game-ground__cell"
                :class="{ 'b-game-ground__cell--selected': cell.selected }"
                @click="onCellClick(cell)"
            >
                <div :class="`b-game-tile b-game-tile--${tileValue(cell)}`" />
            </div>
        </div>
    </div>
</template>

<!--suppress JSUnusedGlobalSymbols -->
<script lang="ts">
  import { Vue, Component } from 'vue-property-decorator'

  type Point2D = {
    x: number
    y: number
  }

  type Cell = {
    point: Point2D
    selected: boolean
  }

  type Tile = {
    point: Point2D
    value: string
  }

  const WIDTH = 9
  const HEIGHT = 7

  const TILE_RED = 'red'
  const TILE_BLUE = 'blue'
  const TILE_GREEN = 'green'
  const TILE_YELLOW = 'yellow'
  const TILE_PURPLE = 'purple'

  const TILE_ENUM = [
    TILE_RED,
    TILE_BLUE,
    TILE_GREEN,
    TILE_YELLOW,
    TILE_PURPLE
  ]

  @Component({
    name: 'MainView',
  })
  export default class MainView extends Vue {
    ground: Cell[] = []
    tiles: Tile[] = []

    created () {
      this.generateGround()
      this.generateTiles()
    }

    generateGround () {
      for (let i = 0; i < HEIGHT; i++) {
        for (let j = 0; j < WIDTH; j++) {
          this.ground.push({
            point: { x: i, y: j },
            selected: false,
          })
        }
      }
    }

    generateTiles () {
      this.ground.forEach((cell: Cell) => {
        this.tiles.push({
          point: cell.point,
          value: TILE_ENUM[Math.floor(Math.random() * TILE_ENUM.length)]
        })
      })
    }

    tileValue ({ point }: Cell) {
      const tile = this.getTile(point)
      return tile ? tile.value : 0
    }

    getTile (point: Point2D) {
      return this.tiles.find((tile: Tile) => tile.point.x === point.x && tile.point.y === point.y)
    }

    onCellClick (cell: Cell) {
      const selectedCell: Cell | undefined = this.ground.find((cell: Cell) => cell.selected)

      if (selectedCell !== undefined && this.isNeighbors(selectedCell, cell)) {
        this.swapTilesByCells(selectedCell, cell)
        selectedCell.selected = false
      } else {
        this.ground.forEach((cell: Cell) => { cell.selected = false })
        cell.selected = true
      }
    }

    swapTilesByCells (a: Cell, b: Cell) {
      const tileA = this.getTile(a.point)
      const tileB = this.getTile(b.point)
      if (tileA && tileB) {
        const point = tileA.point
        tileA.point = b.point
        tileB.point = point
      }
    }

    isNeighbors (a: Cell, b: Cell) {
      return (a.point.x === b.point.x && Math.abs(a.point.y - b.point.y) === 1) ||
        (a.point.y === b.point.y && Math.abs(a.point.x - b.point.x) === 1)
    }
  }
</script>

<style lang="scss">
    @import "./assets/scss/normalize";
    @import "assets/scss/blocks/b-game-ground";
    @import "assets/scss/blocks/b-game-tile";
</style>
