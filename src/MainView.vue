<template>
    <div class="d-flex flex-column h-100">
        <header class="bg-primary-dark">
            <div class="container">
                <h1>Game</h1>
            </div>
        </header>

        <main class="flex-grow-1">
            <div class="py-3">
                <div class="container text-center">
                    <div class="d-inline-flex">
                        <div class="b-game-objective me-4">
                            <div
                                v-for="(objective, index) in objectivesComputed"
                                :key="index"
                                class="d-flex align-items-center p-3"
                            >
                                <b-game-tile :type="objective.type" :small="true" /> &times; {{ objective.count }}
                            </div>

                            <div>
                                Turns: {{ turns }}
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
                                            v-if="tile.type !== null"
                                            :key="i + '-' + j + '-tile-' + tile.type"
                                            :type="tile.type"
                                        />
                                    </transition>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <footer class="bg-primary-dark">
            <div class="container pt-4 pb-5">
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
            </div>
        </footer>
    </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, reactive, ref } from 'vue'

import BGameTile from '@/components/blocks/BGameTile.vue'

import type {
  Counter,
  Objective,
  Tile,
} from '@/types/game'

import { TILE_TYPE } from '@/enums/game'
import TileGrid from '@/entities/TileGrid'

const WIDTH = 9
const HEIGHT = 7

const AVAILABLE_TILE_TYPES = [
  TILE_TYPE.SWEETS_BARBARIS,
  TILE_TYPE.SWEETS_COOKIE,
  TILE_TYPE.SWEETS_LOLLIPOP,
  TILE_TYPE.SWEETS_PILLOW,
  TILE_TYPE.SWEETS_SOUFFLE,
]

const COUNT_TURNS = 20
const COUNT_SEED = 5
const COUNT_MULTIPLIER_MIN = 3
const COUNT_MULTIPLIER_MAX = 10

const random = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)]
const range = (start: number, end: number): number[] => {
  return Array(end - start + 1).fill(1).map((_, idx) => start + idx)
}

defineOptions({
  name: 'MainView',
})

const grid = reactive(new TileGrid(WIDTH, HEIGHT)) as TileGrid
const objectives = reactive<Objective[]>([])
const counters = reactive<Counter[]>([])
const turns = ref(COUNT_TURNS)
const evaluating = ref(false)
const updating = ref(false)

const locked = computed(() => evaluating.value || updating.value)
const objectivesComputed = computed(() => {
  const mapper = (o: Objective) => {
    const counter = counters.find((c: Counter) => c.type === o.type)
    const collected = counter ? counter.count : 0

    return {
      type: o.type,
      count: o.count - collected,
    }
  }

  return objectives.map(mapper)
})

const generateType = (i: number, j: number): TILE_TYPE => {
  const excluded: Array<TILE_TYPE | null> = [
    getTypeOfTwoPrevXIfRepeated(i, j),
    getTypeOfTwoPrevYIfRepeated(i, j),
  ]

  return random(AVAILABLE_TILE_TYPES.filter(type => !excluded.includes(type)))
}

const generateObjective = (): Objective => {
  const excluded: TILE_TYPE[] = objectives.map((o: Objective) => o.type)
  const multiplier: number = random(range(COUNT_MULTIPLIER_MIN, COUNT_MULTIPLIER_MAX))

  return {
    type: random(AVAILABLE_TILE_TYPES.filter(type => !excluded.includes(type))),
    count: multiplier * COUNT_SEED,
  }
}

function getTypeOfTwoPrevXIfRepeated (i: number, j: number): TILE_TYPE | null {
  const prevY1 = grid.getTileByIndex(i, j - 1)
  // eslint-disable-next-line no-magic-numbers
  const prevY2 = grid.getTileByIndex(i, j - 2)

  if (prevY1 && prevY2 && prevY1.type === prevY2.type) {
    return prevY1.type
  }

  return null
}

function getTypeOfTwoPrevYIfRepeated (i: number, j: number): TILE_TYPE | null {
  const prevX1 = grid.getTileByIndex(i - 1, j)
  // eslint-disable-next-line no-magic-numbers
  const prevX2 = grid.getTileByIndex(i - 2, j)

  if (prevX1 && prevX2 && prevX1.type === prevX2.type) {
    return prevX1.type
  }

  return null
}

const swapTiles = (a: Tile, b: Tile) => {
  const indexOfA = grid.indexOf(a)
  const indexOfB = grid.indexOf(b)

  if (indexOfA && indexOfB) {
    const [ai, aj] = indexOfA
    const [bi, bj] = indexOfB

    grid.setTile(a, bi, bj)
    grid.setTile(b, ai, aj)
  }
}

const delay = (callback: () => void) => {
  const tick = 200
  return new Promise<void>(resolve => {
    setTimeout(() => {
      nextTick(callback)
      resolve()
    }, tick)
  })
}

// eslint-disable-next-line max-lines-per-function
const getFilled = (): Tile[] => {
  const filled: Tile[] = []
  const add = (tile: Tile) => {
    if (!filled.includes(tile)) {
      filled.push(tile)
    }
  }

  // eslint-disable-next-line complexity
  grid.forEach((tile: Tile, i: number, j: number) => {
    const byX1 = grid.getTileByIndex(i + 1, j)
    // eslint-disable-next-line no-magic-numbers
    const byX2 = grid.getTileByIndex(i + 2, j)
    const byY1 = grid.getTileByIndex(i, j + 1)
    // eslint-disable-next-line no-magic-numbers
    const byY2 = grid.getTileByIndex(i, j + 2)

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

const clearFilled = () => {
  getFilled().forEach((tile: Tile) => {
    const counter = counters.find((c: Counter) => c.type === tile.type)

    if (counter) {
      counter.count++
    }

    tile.type = null
  })
}

const refillGrid = () => {
  grid.forEach((tile: Tile) => {
    if (tile.type === null) {
      tile.type = random(AVAILABLE_TILE_TYPES)
    }
  })
}

const updateGrid = () => {
  updating.value = true
  delay(() => { clearFilled() })
    .then(() => delay(() => { grid.shake() }))
    .then(() => delay(() => { refillGrid() }))
    .then(() => delay(() => { clearFilled() }))
    .then(() => delay(() => {
      // eslint-disable-next-line max-nested-callbacks
      if (grid.find((tile: Tile) => tile.type === null)) {
        updateGrid()
      } else {
        updating.value = false
        evaluating.value = false
      }
    }))
}

const makeMove = (a: Tile, b: Tile) => {
  if (turns.value === 0) {
    alert('Game ended')

    return
  }

  evaluating.value = true
  swapTiles(a, b)

  if (getFilled().length) {
    updateGrid()
    turns.value--
  } else {
    delay(() => {
      swapTiles(a, b)
      evaluating.value = false
    })
  }
}

const onTileClick = (tile: Tile) => {
  if (locked.value) {
    return
  }

  const selectedTile = grid.find((tile: Tile) => tile.selected)

  if (selectedTile !== null) {
    if (selectedTile !== tile) {
      if (grid.isNeighbors(selectedTile, tile)) {
        makeMove(selectedTile, tile)
      } else {
        tile.selected = true
      }
    }
    selectedTile.selected = false
  } else {
    tile.selected = true
  }
}

const init = () => {
  objectives.push(generateObjective())
  objectives.push(generateObjective())
  grid.forEach((tile: Tile, i: number, j: number) => {
    tile.type = generateType(i, j)
  })
  AVAILABLE_TILE_TYPES.forEach(type => {
    counters.push({ type, count: 0 })
  })
}

init()
</script>

<style lang="scss">
@import "assets/scss/variables";
@import "bootstrap/scss/bootstrap";
@import "assets/scss/normalize";

@import "assets/scss/blocks/b-game-ground";
@import "assets/scss/blocks/b-game-objective";
@import "assets/scss/transitions/t-game-fade";
</style>
