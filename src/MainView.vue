<template>
    <div class="d-flex flex-column h-100">
        <header class="bg-primary-dark">
            <b-container>
                <h1>Game</h1>
            </b-container>
        </header>

        <main class="flex-grow-1">
            <div class="py-3">
                <b-container class="text-center">
                    <div class="d-inline-flex">
                        <div class="b-game-objective mr-4">
                            <div
                                v-for="(objective, index) in objectivesComputed"
                                :key="index"
                                class="d-flex align-items-center p-3"
                            >
                                <b-game-tile :type="objective.type" :small="true" /> &times; {{ objective.count }}
                            </div>
                        </div>

                        <div class="b-game-ground">
                            <template v-for="(row, i) in grid.getTileList()">
                                <div
                                    v-for="(tile, j) in row"
                                    :key="i + '-' + j + '-cell-' + tile.type"
                                    :class="{ 'b-game-ground__cell--selected': tile.selected }"
                                    class="b-game-ground__cell"
                                    @click="onTileClick(tile)"
                                >
                                    <transition name="t-game-fade">
                                        <b-game-tile
                                            v-show="tile.type !== null"
                                            :key="i + '-' + j + '-tile-' + tile.type"
                                            :type="tile.type"
                                        />
                                    </transition>
                                </div>
                            </template>
                        </div>
                    </div>
                </b-container>
            </div>
        </main>

        <footer class="bg-primary-dark">
            <b-container class="pt-4 pb-5">
                <p>
                    Code:
                    <a href="https://github.com/cmath10" class="text-light">
                        https://github.com/cmath10
                    </a>
                </p>

                <p>
                    Artwork:
                    <a href="https://www.artstation.com/jackhook" class="text-light">
                        https://www.artstation.com/jackhook
                    </a>
                </p>
            </b-container>
        </footer>
    </div>
</template>

<!--suppress JSUnusedGlobalSymbols -->
<script lang="ts">
  import { Vue, Component } from 'vue-property-decorator'

  import { BContainer } from 'bootstrap-vue'
  import BGameTile from '@/components/blocks/BGameTile.vue'

  import {
    Counter,
    Objective,
    Tile,
  } from '@/types/game'

  import { TILE_TYPE } from '@/enums/game'
  import TileGrid from '@/entities/TileGrid'

  const WIDTH = 9
  const HEIGHT = 7

  const AVAILABLE_TILE_TYPES = [
    TILE_TYPE.AIR,
    TILE_TYPE.EARTH,
    TILE_TYPE.FIRE,
    TILE_TYPE.LIGHTNING,
    TILE_TYPE.WATER,
  ]

  const COUNT_SEED = 5
  const COUNT_MULTIPLIER_MIN = 3
  const COUNT_MULTIPLIER_MAX = 10

  const random = (array: unknown[]): unknown => array[Math.floor(Math.random() * array.length)]
  const range = (start: number, end: number): number[] => {
    return Array(end - start + 1).fill(1).map((_, idx) => start + idx)
  }

  @Component({
    name: 'MainView',

    components: {
      BContainer,
      BGameTile,
    },
  })
  export default class MainView extends Vue {
    grid: TileGrid = new TileGrid(WIDTH, HEIGHT)
    objectives: Objective[] = []
    counters: Counter[] = []
    evaluating = false
    updating = false

    get locked () {
      return this.evaluating || this.updating
    }

    get objectivesComputed () {
      const mapper = (o: Objective) => {
        const counter = this.counters.find(c => c.type === o.type)
        const collected = counter ? counter.count : 0

        return {
          type: o.type,
          count: o.count - collected,
        }
      }

      return this.objectives.map(mapper).filter(o => o.count > 0)
    }

    created () {
      this.init()
    }

    init () {
      this.objectives.push(this.generateObjective())
      this.objectives.push(this.generateObjective())
      this.grid.forEach((tile, i, j) => {
        tile.type = this.generateType(i, j)
      })
      AVAILABLE_TILE_TYPES.forEach(type => {
        this.counters.push({ type, count: 0 })
      })
    }

    generateObjective (): Objective {
      const excluded: TILE_TYPE[] = this.objectives.map(o => o.type)
      const multiplier: number = random(range(COUNT_MULTIPLIER_MIN, COUNT_MULTIPLIER_MAX)) as number

      return {
        type: random(AVAILABLE_TILE_TYPES.filter(type => !excluded.includes(type))) as TILE_TYPE,
        count: multiplier * COUNT_SEED
      }
    }

    generateType (i: number, j: number): TILE_TYPE {
      const excluded: TILE_TYPE[] = [
        this.getTypeOfTwoPrevXIfRepeated(i, j),
        this.getTypeOfTwoPrevYIfRepeated(i, j),
      ]

      return random(AVAILABLE_TILE_TYPES.filter(type => !excluded.includes(type))) as TILE_TYPE
    }

    getTypeOfTwoPrevXIfRepeated (i: number, j: number) {
      const prevY1 = this.grid.getTileByIndex(i, j - 1)
      // eslint-disable-next-line no-magic-numbers
      const prevY2 = this.grid.getTileByIndex(i, j - 2)

      if (prevY1 && prevY2 && prevY1.type === prevY2.type) {
        return prevY1.type
      }

      return null
    }

    getTypeOfTwoPrevYIfRepeated (i: number, j: number) {
      const prevX1 = this.grid.getTileByIndex(i - 1, j)
      // eslint-disable-next-line no-magic-numbers
      const prevX2 = this.grid.getTileByIndex(i - 2, j)

      if (prevX1 && prevX2 && prevX1.type === prevX2.type) {
        return prevX1.type
      }

      return null
    }

    onTileClick (tile: Tile) {
      if (this.locked) {
        return
      }

      const selectedTile = this.grid.find(tile => tile.selected)

      if (selectedTile !== null) {
        if (selectedTile !== tile) {
          if (this.grid.isNeighbors(selectedTile, tile)) {
            this.makeMove(selectedTile, tile)
          } else {
            tile.selected = true
          }
        }
        selectedTile.selected = false
      } else {
        tile.selected = true
      }
    }

    makeMove (a: Tile, b: Tile) {
      this.evaluating = true
      this.swapTiles(a, b)

      if (this.getFilled().length) {
        this.updateGrid()
      } else {
        this.delay(() => {
          this.swapTiles(a, b)
          this.evaluating = false
          this.$forceUpdate()
        })
      }
    }

    swapTiles (a: Tile, b: Tile) {
      const indexOfA = this.grid.indexOf(a)
      const indexOfB = this.grid.indexOf(b)

      if (indexOfA && indexOfB) {
        const [ai, aj] = indexOfA
        const [bi, bj] = indexOfB

        this.grid.setTile(a, bi, bj)
        this.grid.setTile(b, ai, aj)
      }
    }

    updateGrid () {
      this.updating = true
      this.delay(() => { this.clearFilled() })
        .then(() => this.delay(() => { this.grid.shake() }))
        .then(() => this.delay(() => { this.refillGrid() }))
        .then(() => this.delay(() => { this.clearFilled() }))
        .then(() => this.delay(() => {
          // eslint-disable-next-line max-nested-callbacks
          if (this.grid.find(tile => tile.type === null)) {
            this.updateGrid()
          } else {
            this.updating = false
            this.evaluating = false
          }
        }))
    }

    refillGrid () {
      this.grid.forEach(tile => {
        if (tile.type === null) {
          tile.type = random(AVAILABLE_TILE_TYPES) as TILE_TYPE
        }
      })
    }

    delay (callback: () => void) {
      const tick = 200
      return new Promise(resolve => {
        setTimeout(() => {
          this.$nextTick(callback)
          resolve()
        }, tick)
      })
    }

    clearFilled () {
      this.getFilled().forEach(tile => {
        const counter = this.counters.find(c => c.type === tile.type)

        if (counter) {
          counter.count++
        }

        tile.type = null
      })
    }

    // eslint-disable-next-line max-lines-per-function
    getFilled (): Tile[] {
      const filled: Tile[] = []
      const add = (tile: Tile) => {
        if (!filled.includes(tile)) {
          filled.push(tile)
        }
      }

      // eslint-disable-next-line complexity
      this.grid.forEach((tile, i, j) => {
        const byX1 = this.grid.getTileByIndex(i + 1, j)
        // eslint-disable-next-line no-magic-numbers
        const byX2 = this.grid.getTileByIndex(i + 2, j)
        const byY1 = this.grid.getTileByIndex(i, j + 1)
        // eslint-disable-next-line no-magic-numbers
        const byY2 = this.grid.getTileByIndex(i, j + 2)

        if (byX1 && byX2 && tile.type === byX1.type && byX1.type === byX2.type) {
          add(tile)
          add(byX1)
          add(byX2)
        }

        if (byY1 && byY2 && tile.type === byY1.type && byY1.type === byY2.type) {
          add(tile)
          add(byY1)
          add(byY2)
        }
      })

      return filled
    }
  }
</script>

<style lang="scss">
    @import "assets/scss/variables";
    @import "~bootstrap-scss/bootstrap";
    @import "assets/scss/normalize";

    @import "assets/scss/blocks/b-game-ground";
    @import "assets/scss/blocks/b-game-objective";
    @import "assets/scss/transitions/t-game-fade";
</style>
