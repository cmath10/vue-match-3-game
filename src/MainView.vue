<template>
    <l-game-container>
        <h1>Game</h1>

        <div class="b-game-ground">
            <div
                v-for="cell in ground"
                :key="cell.point.x + '-' + cell.point.y"
                class="b-game-ground__cell"
                :class="{ 'b-game-ground__cell--selected': cell.selected }"
                @click="onCellClick(cell)"
            >
                <b-game-tile
                    v-if="getTile(cell.point)"
                    :tile="getTile(cell.point)"
                />
            </div>
        </div>
    </l-game-container>
</template>

<!--suppress JSUnusedGlobalSymbols -->
<script lang="ts">
  import { Vue, Component } from 'vue-property-decorator'

  import BGameTile from '@/components/blocks/BGameTile.vue'
  import LGameContainer from '@/components/layout/LGameContainer.vue'

  import { Point2D } from '@/types/geometry'
  import {
    Cell,
    Tile,
  } from '@/types/game'

  import { TILE_TYPES } from '@/enums/game'

  const WIDTH = 9
  const HEIGHT = 7

  const AVAILABLE_TILE_TYPES = [
    TILE_TYPES.BLUE,
    TILE_TYPES.GREEN,
    TILE_TYPES.PURPLE,
    TILE_TYPES.RED,
    TILE_TYPES.YELLOW,
  ]

  const getRandomType = () => AVAILABLE_TILE_TYPES[Math.floor(Math.random() * AVAILABLE_TILE_TYPES.length)]

  @Component({
    name: 'MainView',

    components: {
      BGameTile,
      LGameContainer,
    },
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
          type: getRandomType(),
        })
      })
    }

    tileType ({ point }: Cell) {
      const tile = this.getTile(point)
      return tile ? tile.type : 0
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
    @import "assets/scss/normalize";
    @import "assets/scss/blocks/b-game-ground";
</style>
