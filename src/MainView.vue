<template>
    <l-game-container>
        <h1>Game</h1>

        <div class="b-game-ground">
            <div
                v-for="cell in ground"
                :key="cell.point.x + '-' + cell.point.y + '-cell'"
                :class="{ 'b-game-ground__cell--selected': cell.selected }"
                class="b-game-ground__cell"
                @click="onCellClick(cell)"
            >
                <b-game-tile
                    v-if="getTile(cell.point)"
                    :key="cell.point.x + '-' + cell.point.y + '-tile'"
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

  import { TILE_TYPE } from '@/enums/game'

  const WIDTH = 9
  const HEIGHT = 7

  const AVAILABLE_TILE_TYPES = [
    TILE_TYPE.BLUE,
    TILE_TYPE.GREEN,
    TILE_TYPE.PURPLE,
    TILE_TYPE.RED,
    TILE_TYPE.YELLOW,
  ]

  const getRandom = (array: TILE_TYPE[]) => array[Math.floor(Math.random() * array.length)]

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
          type: this.generateType(cell),
        })
      })
    }

    generateType (cell: Cell) {
      const excluded: TILE_TYPE[] = [
        this.getTypeOfTwoPrevXIfRepeated(cell),
        this.getTypeOfTwoPrevYIfRepeated(cell),
      ]

      return getRandom(AVAILABLE_TILE_TYPES.filter(type => !excluded.includes(type)))
    }

    getTypeOfTwoPrevXIfRepeated ({ point }: Cell) {
      const prevX1 = this.getTile({ x: point.x - 1, y: point.y })
      // eslint-disable-next-line no-magic-numbers
      const prevX2 = this.getTile({ x: point.x - 2, y: point.y })

      if (prevX1 && prevX2 && prevX1.type === prevX2.type) {
        return prevX1.type
      }

      return undefined
    }

    getTypeOfTwoPrevYIfRepeated ({ point }: Cell) {
      const prevY1 = this.getTile({ x: point.x, y: point.y - 1 })
      // eslint-disable-next-line no-magic-numbers
      const prevY2 = this.getTile({ x: point.x, y: point.y - 2 })

      if (prevY1 && prevY2 && prevY1.type === prevY2.type) {
        return prevY1.type
      }

      return undefined
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
