<template>
    <div class="b-game-layout d-flex flex-column flex-lg-row">
        <aside class="b-game-layout__menu bg-primary-dark p-4 d-flex flex-column">
            <b-game-menu
                :counters="counters"
                :objectives="objectives"
                :turns="turns"
                @new-game="startNewGame"
            />
        </aside>

        <main class="b-game-layout__field flex-grow-1 d-flex flex-column p-3 p-lg-4">
            <div class="b-game-layout__board flex-grow-1 d-flex align-items-center justify-content-center">
                <div class="b-game-ground">
                    <div class="b-game-ground__cells">
                        <div
                            v-for="cell in cells"
                            :key="cell.key"
                            :class="{ 'b-game-ground__cell--selected': cell.tile?.selected }"
                            class="b-game-ground__cell"
                        />
                    </div>

                    <div class="b-game-ground__tiles">
                        <b-game-tile
                            v-for="tile in activeTiles"
                            :key="tile.id"
                            :class="{ 'b-game-ground__tile--selected': tile.selected }"
                            :data-tile-id="tile.id"
                            :style="getTileStyle(tile)"
                            :type="tile.type"
                            class="b-game-ground__tile"
                            @click="onTileClick(tile)"
                        />
                    </div>
                </div>
            </div>

            <footer class="b-game-layout__footer pt-3 mt-3">
                <div class="d-flex flex-column flex-sm-row gap-2 gap-sm-4 justify-content-center">
                    <span>
                        Code:
                        <a href="https://github.com/cmath10" class="b-game-layout__link">
                            https://github.com/cmath10
                        </a>
                    </span>

                    <span>
                        Artwork:
                        <a href="https://www.artstation.com/jackhook" class="b-game-layout__link">
                            https://www.artstation.com/jackhook
                        </a>
                    </span>
                </div>
            </footer>
        </main>
    </div>
</template>

<script lang="ts" setup>
import type { Counter, Objective, Tile } from '@/types/game'

import { computed, nextTick, reactive, ref } from 'vue'

import BGameMenu from '@/components/blocks/BGameMenu.vue'
import BGameTile from '@/components/blocks/BGameTile.vue'

import TileGrid from '@/entities/TileGrid'

import { TILE_TYPE } from '@/enums/game'

type Cell = { key: string; tile: Tile | null }
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
const ANIMATION_DELAY = 320

const random = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)]
const range = (start: number, end: number): number[] => {
  return Array(end - start + 1).fill(1).map((_, idx) => start + idx)
}

defineOptions({ name: 'MainView' })

const grid = reactive(new TileGrid(WIDTH, HEIGHT)) as TileGrid
const objectives = reactive<Objective[]>([])
const counters = reactive<Counter[]>([])
const turns = ref(COUNT_TURNS)
const evaluating = ref(false)
const gameVersion = ref(0)
const nextTileId = ref(0)

const locked = computed(() => evaluating.value)
const activeTiles = computed(() => grid.getTiles())
const cells = computed(() => getCells())

const createTile = (type: TILE_TYPE, row: number, column: number): Tile => (
  { id: nextTileId.value++, type, selected: false, row, column }
)

const getTileStyle = (tile: Tile) => {
  return {
    transform: `translate(calc(${tile.column} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)), calc(${tile.row} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)))`,
  }
}

const getCells = (): Cell[] => {
  const cells: Cell[] = []

  grid.forEachCell((tile: Tile | null, i: number, j: number) => {
    cells.push({ key: `${i}-${j}`, tile })
  })

  return cells
}

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

const waitAnimation = () => new Promise<void>(resolve => setTimeout(resolve, ANIMATION_DELAY))
const nextAnimationFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

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
    const index = grid.indexOf(tile)
    const counter = counters.find((c: Counter) => c.type === tile.type)

    if (counter) {
      counter.count++
    }

    tile.selected = false

    if (index) {
      const [i, j] = index
      grid.setTile(null, i, j)
    }
  })
}

const refillGrid = () => {
  for (let j = 0; j < WIDTH; j++) {
    let spawnRow = -1

    for (let i = HEIGHT - 1; i >= 0; i--) {
      if (grid.getTileByIndex(i, j) === null) {
        spawnTile(i, j, spawnRow)
        spawnRow--
      }
    }
  }
}

const spawnTile = (i: number, j: number, spawnRow: number) => {
  const tile = createTile(random(AVAILABLE_TILE_TYPES), spawnRow, j)

  grid.setTile(tile, i, j, {
    row: spawnRow,
    column: j,
  })

  void moveSpawnedTileToCell(tile, i, j)
}

const moveSpawnedTileToCell = async (tile: Tile, i: number, j: number) => {
  await nextTick()
  await nextAnimationFrame()
  await nextAnimationFrame()

  const currentTile = grid.getTileByIndex(i, j)

  if (currentTile?.id === tile.id) {
    moveTileToCell(currentTile, i, j)
  }
}

const moveTileToCell = (tile: Tile, i: number, j: number) => {
  tile.row = i
  tile.column = j
}

const updateGrid = () => {
  while (getFilled().length) {
    clearFilled()
    grid.shake()
    refillGrid()
  }
}

const makeMove = async (a: Tile, b: Tile) => {
  if (turns.value === 0) {
    alert('Game ended')

    return
  }

  const version = gameVersion.value

  evaluating.value = true
  swapTiles(a, b)

  if (getFilled().length) {
    await applySuccessfulMove(version)
  } else {
    await revertFailedMove(a, b, version)
  }
}

const applySuccessfulMove = async (version: number) => {
  await waitAnimation()

  if (version !== gameVersion.value) {
    return
  }

  updateGrid()
  turns.value--
  evaluating.value = false
}

const revertFailedMove = async (a: Tile, b: Tile, version: number) => {
  await waitAnimation()

  if (version !== gameVersion.value) {
    return
  }

  swapTiles(a, b)
  evaluating.value = false
}

const onTileClick = (tile: Tile) => {
  if (locked.value) {
    return
  }

  const selectedTile = grid.find((tile: Tile) => tile.selected)

  if (selectedTile !== null) {
    handleSelectedTileClick(selectedTile, tile)
  } else {
    tile.selected = true
  }
}

const handleSelectedTileClick = (selectedTile: Tile, tile: Tile) => {
  if (selectedTile !== tile) {
    if (grid.isNeighbors(selectedTile, tile)) {
      void makeMove(selectedTile, tile)
    } else {
      tile.selected = true
    }
  }

  selectedTile.selected = false
}

const initObjectives = () => {
  objectives.push(generateObjective())
  objectives.push(generateObjective())
}

const initCounters = () => {
  AVAILABLE_TILE_TYPES.forEach(type => {
    counters.push({ type, count: 0 })
  })
}

const fillGrid = () => {
  grid.forEachCell((tile: Tile | null, i: number, j: number) => {
    if (tile === null) {
      grid.setTile(createTile(generateType(i, j), i, j), i, j)
    }
  })
}

const startNewGame = () => {
  gameVersion.value++
  evaluating.value = false
  turns.value = COUNT_TURNS
  objectives.splice(0)
  counters.splice(0)
  grid.clear()

  initObjectives()
  fillGrid()
  initCounters()
}

startNewGame()
</script>

<style lang="scss">
@import "assets/scss/variables";
@import "bootstrap/scss/bootstrap";
@import "assets/scss/normalize";
@import "assets/scss/blocks/b-game-layout";
@import "assets/scss/blocks/b-game-ground";
@import "assets/scss/transitions/t-game-fade";
</style>
