<template>
    <l-game-container>
        <h1>Game</h1>

        <div class="b-game-ground">
            <template v-for="(row, i) in tiles">
                <div
                    v-for="(tile, j) in row"
                    :key="i + '-' + j + '-cell'"
                    :class="{ 'b-game-ground__cell--selected': tile.selected }"
                    class="b-game-ground__cell"
                    @click="onTileClick(tile)"
                >
                    <b-game-tile
                        :key="i + '-' + j + '-tile'"
                        :tile="tile"
                    />
                </div>
            </template>
        </div>
    </l-game-container>
</template>

<!--suppress JSUnusedGlobalSymbols -->
<script lang="ts">
  import { Vue, Component } from 'vue-property-decorator'

  import BGameTile from '@/components/blocks/BGameTile.vue'
  import LGameContainer from '@/components/layout/LGameContainer.vue'

  import { Tile } from '@/types/game'

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
    tiles: Tile[][] = []

    created () {
      this.generateTiles()
      this.fillTiles()
    }

    generateTiles () {
      this.tiles = []

      for (let i = 0; i < HEIGHT; i++) {
        const row: Tile[] = []

        for (let j = 0; j < WIDTH; j++) {
          row.push({ type: null, selected: false })
        }

        this.tiles.push(row)
      }
    }

    fillTiles () {
      this.tiles.forEach((row, i) => {
        row.forEach((tile, j) => {
          tile.type = this.generateType(i, j)
        })
      })
    }

    generateType (i: number, j: number) {
      const excluded: TILE_TYPE[] = [
        this.getTypeOfTwoPrevXIfRepeated(i, j),
        this.getTypeOfTwoPrevYIfRepeated(i, j),
      ]

      return getRandom(AVAILABLE_TILE_TYPES.filter(type => !excluded.includes(type)))
    }

    getTypeOfTwoPrevXIfRepeated (i: number, j: number) {
      const prevX1 = this.getTile(i - 1, j)
      // eslint-disable-next-line no-magic-numbers
      const prevX2 = this.getTile(i - 2, j)

      if (prevX1 && prevX2 && prevX1.type === prevX2.type) {
        return prevX1.type
      }

      return null
    }

    getTypeOfTwoPrevYIfRepeated (i: number, j: number) {
      const prevY1 = this.getTile(i, j - 1)
      // eslint-disable-next-line no-magic-numbers
      const prevY2 = this.getTile(i, j - 2)

      if (prevY1 && prevY2 && prevY1.type === prevY2.type) {
        return prevY1.type
      }

      return null
    }

    swapTiles (a: Tile, b: Tile) {
      const indexOfA = this.getTileIndex(a)
      const indexOfB = this.getTileIndex(b)

      if (indexOfA && indexOfB) {
        this.tiles[indexOfA[0]][indexOfA[1]] = b
        this.tiles[indexOfB[0]][indexOfB[1]] = a
      }
    }

    onTileClick (tile: Tile) {
      const selectedTile = this.getSelectedTile()

      if (selectedTile !== null && selectedTile !== tile && this.isNeighbors(selectedTile, tile)) {
        this.swapTiles(selectedTile, tile)
        selectedTile.selected = false
      } else {
        this.forEachTile(tile => { tile.selected = false })
        tile.selected = true
      }
    }

    // eslint-disable-next-line complexity
    isNeighbors (a: Tile, b: Tile) {
      const indexOfA = this.getTileIndex(a)
      const indexOfB = this.getTileIndex(b)

      return indexOfA &&
        indexOfB &&
        (
          (indexOfA[0] === indexOfB[0] && Math.abs(indexOfA[1] - indexOfB[1]) === 1) ||
          (indexOfA[1] === indexOfB[1] && Math.abs(indexOfA[0] - indexOfB[0]) === 1)
        )
    }

    getTile (i: number, j: number): Tile | null {
      return this.tiles[i] ? this.tiles[i][j] || null : null
    }

    getTileIndex (tile: Tile): number[] | undefined {
      for (let i = 0; i < this.tiles.length; i++) {
        const j = this.tiles[i].indexOf(tile)

        if (j !== -1) {
          return [i, j]
        }
      }

      return undefined
    }

    getSelectedTile (): Tile | null {
      for (let i = 0; i < this.tiles.length; i++) {
        for (let j = 0; j < this.tiles[i].length; j++) {
          if (this.tiles[i][j].selected) {
            return this.tiles[i][j]
          }
        }
      }

      return null
    }

    forEachTile (fn: (tile: Tile, i: number, j: number) => void) {
      this.tiles.forEach((row, i) => row.forEach((tile, j) => {
        fn(tile, i, j)
      }))
    }
  }
</script>

<style lang="scss">
    @import "assets/scss/normalize";
    @import "assets/scss/blocks/b-game-ground";
</style>
