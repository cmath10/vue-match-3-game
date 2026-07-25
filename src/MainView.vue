<template>
    <div :style="boardStyle" class="b-game-layout">
        <aside class="b-game-layout__menu">
            <b-game-menu
                :counters="counters"
                :objectives="objectives"
                :turns="turns"
                @new-game="startNewGame"
            />
        </aside>

        <main class="b-game-layout__field">
            <div class="b-game-layout__board">
                <div class="b-game-ground">
                    <div class="b-game-ground__cells">
                        <div
                            v-for="cell in cells"
                            :key="cell.key"
                            class="b-game-ground__cell"
                        />
                    </div>

                    <div class="b-game-ground__tiles">
                        <b-game-tile
                            v-for="tile in activeTiles"
                            :key="tile.id"
                            :class="{
                                'b-game-ground__tile--selected': tile.selected,
                                'b-game-ground__tile--collecting': collectingTileIds.has(tile.id),
                            }"
                            :data-tile-id="tile.id"
                            :blocker="tile.blocker?.type"
                            :health="tile.health"
                            :style="getTileStyle(tile)"
                            :type="tile.type"
                            class="b-game-ground__tile"
                            @click="onTileClick(tile)"
                            @dblclick="onTileDoubleClick(tile)"
                            @pointercancel="onTilePointerCancel"
                            @pointerdown="onTilePointerDown(tile, $event)"
                            @pointerup="onTilePointerUp($event)"
                        />

                        <b-game-button-flights :flights="buttonFlights" />
                        <b-game-booster-effects :effects="boosterVisualEffects" />
                        <b-game-cookie-break-effects :effects="cookieBreakEffects" />
                    </div>

                    <b-game-result-overlay
                        v-if="gameResult"
                        :result="gameResult"
                        @play-again="startNewGame"
                    />
                </div>
            </div>

            <footer class="b-game-layout__footer">
                <div class="b-game-layout__footer-panel">
                    <span>
                        {{ t('footer.code') }} <a href="https://github.com/cmath10" class="b-game-layout__link">https://github.com/cmath10</a>
                    </span>

                    <span>
                        {{ t('footer.artwork') }} <a href="https://www.artstation.com/jackhook" class="b-game-layout__link">https://www.artstation.com/jackhook</a>
                    </span>
                </div>
            </footer>
        </main>

        <b-game-objective-flights :flights="objectiveFlights" />
    </div>
</template>

<script lang="ts" setup>
import type { MoveMatch } from '@/entities/Match3BoosterRules'

import type { Counter, Objective, Tile } from '@/types/game'

import type { BoardTileType } from '@/enums/game'

import type { GameResult } from '@/entities/Match3GameResult'

import type { ObjectiveCollection } from '@/entities/Match3ObjectiveCollection'

import type { ObjectiveType } from '@/enums/game'

import type { Position } from '@/entities/Match3Engine'

import type { TileMovement } from '@/entities/Match3GridTransitions'

import {
  computed,
  nextTick,
  reactive,
  ref,
} from 'vue'
import { useI18n } from 'vue-i18n'

import BGameBoosterEffects from '@/components/blocks/BGameBoosterEffects.vue'
import BGameButtonFlights from '@/components/blocks/BGameButtonFlights.vue'
import BGameCookieBreakEffects from '@/components/blocks/BGameCookieBreakEffects.vue'
import BGameMenu from '@/components/blocks/BGameMenu.vue'
import BGameObjectiveFlights from '@/components/blocks/BGameObjectiveFlights.vue'
import BGameResultOverlay from '@/components/blocks/BGameResultOverlay.vue'
import BGameTile from '@/components/blocks/BGameTile.vue'

import { useMatch3BoosterAnimation } from '@/composables/useMatch3BoosterAnimation'
import {
  useMatch3CookieBreakAnimation,
} from '@/composables/useMatch3CookieBreakAnimation'
import { useMatch3ObjectiveCollection } from '@/composables/useMatch3ObjectiveCollection'

import { applyBoosterEffectPositions } from '@/entities/Match3BoardHits'
import { BOARD_HEIGHT, BOARD_WIDTH } from '@/entities/Match3BoardConfig'
import { placeCreatedBoosters } from '@/entities/Match3BoardBoosters'

import { AVAILABLE_TILE_TYPES } from '@/entities/Match3SpecialTiles'

import { clearMatchedPositions } from '@/entities/Match3SpecialTiles'
import { collapseGrid } from '@/entities/Match3GridTransitions'
import { collectDroppedMugs } from '@/entities/Match3SpecialTiles'
import { createMatch3BoosterTurn } from '@/entities/Match3BoosterTurn'
import { createMatch3TileInput } from '@/entities/Match3TileInput'
import { findMatchedPositions, findMatchLines } from '@/entities/Match3Engine'

import { getBoardStyle } from '@/entities/Match3TilePresentation'
import { getCascadeBoosterCreations } from '@/entities/Match3BoosterRules'
import { getGameResult } from '@/entities/Match3GameResult'
import { getGridCells } from '@/entities/Match3TilePresentation'
import { getGridTilePosition, getMatchableTileBoard } from '@/entities/Match3GridBoard'
import { getMatchPositions } from '@/entities/Match3Engine'
import { getMoveMatch } from '@/entities/Match3BoosterRules'
import { getPointerTargetTile, getTileStyle } from '@/entities/Match3TilePresentation'
import { initializeGameGoals } from '@/entities/Match3GameSetup'

import { placeSpecialTiles } from '@/entities/Match3SpecialTiles'

import { refillGrid } from '@/entities/Match3GridTransitions'
import { TILE_TYPE } from '@/enums/game'
import TileGrid from '@/entities/TileGrid'

const COUNT_TURNS = 25
const ANIMATION_DELAY = 480
const random = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)]
defineOptions({ name: 'MainView' })

const { t } = useI18n()

const grid = reactive(new TileGrid(BOARD_WIDTH, BOARD_HEIGHT)) as TileGrid
const objectives = reactive<Objective[]>([])
const counters = reactive<Counter[]>([])
const turns = ref(COUNT_TURNS)
const evaluating = ref(false)
const gameResult = ref<GameResult | null>(null)
const gameVersion = ref(0)
const nextTileId = ref(0)
const boardStyle = getBoardStyle(BOARD_WIDTH, BOARD_HEIGHT)

const locked = computed(() => evaluating.value || gameResult.value !== null)
const activeTiles = computed(() => grid.getTiles().sort((a, b) => a.id - b.id))
const cells = computed(() => getGridCells(grid))

const createTile = (type: BoardTileType, row: number, column: number): Tile => (
  { id: nextTileId.value++, type, selected: false, row, column }
)

const generateType = (i: number, j: number): TILE_TYPE => random(AVAILABLE_TILE_TYPES.filter(type => !createsMatch(type, i, j)))

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
const {
  visualEffects: boosterVisualEffects, flights: buttonFlights, collectingTileIds,
  animateWave: animateBoosterWave, cancel: cancelBoosterAnimation,
} = useMatch3BoosterAnimation({ grid, waitAnimation, nextAnimationFrame })

const getTileTypeBoard = () => getMatchableTileBoard(grid)

const createsMatch = (type: TILE_TYPE, i: number, j: number): boolean => {
  const board = getTileTypeBoard()

  board[i][j] = type

  return findMatchedPositions(board).some(position => position.row === i && position.column === j)
}

const getTileMoveMatch = (movedTile: Tile, swappedTile: Tile): MoveMatch => {
  const positionA = getGridTilePosition(grid, movedTile)
  const positionB = getGridTilePosition(grid, swappedTile)

  if (positionA === null || positionB === null) {
    return { positions: [], boosters: [] }
  }

  return getMoveMatch(getTileTypeBoard(), positionA, positionB)
}

const incrementCounter = (type: ObjectiveType) => {
  const counter = counters.find((c: Counter) => c.type === type)

  if (counter) {
    counter.count++
  }
}

const {
  flights: objectiveFlights,
  animatePending: animateObjectiveCollections,
  cancel: cancelObjectiveCollection,
  collect: collectObjective,
} = useMatch3ObjectiveCollection({
  objectives,
  counters,
  boardWidth: BOARD_WIDTH,
  incrementCounter,
  waitAnimation,
  nextAnimationFrame,
})

const {
  effects: cookieBreakEffects,
  animatePending: animateCookieBreaks,
  cancel: cancelCookieBreakAnimation,
  collect: collectCookieBreak,
} = useMatch3CookieBreakAnimation({ waitAnimation, nextAnimationFrame })

const collectTile = (collection: ObjectiveCollection): void => {
  collectCookieBreak(collection)
  collectObjective(collection)
}

const spawnTile = (i: number, j: number, spawnRow: number): Tile => {
  const tile = createTile(generateType(i, j), spawnRow, j)

  grid.setTile(tile, i, j, {
    row: spawnRow,
    column: j,
  })

  void moveSpawnedTileToCell(tile, i, j)

  return tile
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
  tile.row = i; tile.column = j
}

const updateGrid = async (
  version: number,
  matchedPositions: Position[],
  boosters: MoveMatch['boosters']
) => {
  if (matchedPositions.length > 0) {
    placeCreatedBoosters(grid, boosters)
    await settleGrid(version, resolveMatchedPositions(matchedPositions))
  }
}

const waitForResolutionAnimations = () => Promise.all([
  waitAnimation(),
  animateObjectiveCollections(),
  animateCookieBreaks(),
])

const settleGrid = async (version: number, initialMovements: TileMovement[]) => {
  let movements = initialMovements

  while (true) {
    await waitForResolutionAnimations()

    if (version !== gameVersion.value) {
      return
    }

    const positionsToClear = getCascadePositions(movements)

    if (positionsToClear.length === 0) {
      return
    }

    movements = resolveMatchedPositions(positionsToClear)
  }
}

const getCascadePositions = (movements: TileMovement[]): Position[] => {
  const lines = findMatchLines(getTileTypeBoard())
  const boosters = getCascadeBoosterCreations(lines, movements)
  const positions = getMatchPositions(lines)

  placeCreatedBoosters(grid, boosters)

  return positions
}

const resolveMatchedPositions = (positions: Position[]): TileMovement[] => {
  clearMatchedPositions(grid, positions, BOARD_WIDTH, BOARD_HEIGHT, collectTile)
  return transitionGrid()
}

const resolveBoosterPositions = (positions: Position[]): TileMovement[] => {
  applyBoosterEffectPositions(grid, positions, BOARD_WIDTH, BOARD_HEIGHT, collectTile)
  return transitionGrid()
}

const transitionGrid = (): TileMovement[] => {
  const movements = collapseGrid(grid)

  collectDroppedMugs(grid, BOARD_WIDTH, BOARD_HEIGHT, collectTile)
  movements.push(...collapseGrid(grid, movements.length))
  movements.push(...refillGrid(grid, BOARD_WIDTH, BOARD_HEIGHT, spawnTile, movements.length))

  return movements
}

const makeMove = async (a: Tile, b: Tile) => {
  const version = gameVersion.value

  evaluating.value = true
  swapTiles(a, b)

  const match = getTileMoveMatch(a, b)

  if (match.positions.length) {
    await applySuccessfulMove(version, match)
  } else {
    await revertFailedMove(a, b, version)
  }
}

const applySuccessfulMove = async (version: number, match: MoveMatch) => {
  await waitAnimation()

  if (version !== gameVersion.value) {
    return
  }

  await updateGrid(version, match.positions, match.boosters)

  if (version !== gameVersion.value) {
    return
  }

  finishTurn()
}

const updateGameResult = () => {
  gameResult.value = getGameResult(objectives, counters, turns.value)
}

const finishTurn = () => {
  turns.value--
  updateGameResult()
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

const { activateBooster, swipeBooster } = createMatch3BoosterTurn({
  grid,
  getVersion: () => gameVersion.value,
  isVersionCurrent: version => version === gameVersion.value,
  setEvaluating: value => evaluating.value = value,
  waitAnimation,
  settleGrid,
  resolvePositions: resolveBoosterPositions,
  animateWave: animateBoosterWave,
  finishTurn,
  swapTiles,
  selectButtonBoxTarget: types => types.length === 0 ? null : random(types),
})

const {
  onTileClick,
  onTileDoubleClick,
  onTilePointerCancel,
  onTilePointerDown,
  onTilePointerUp,
} = createMatch3TileInput({
  grid,
  isLocked: () => locked.value,
  areNeighbors: (a, b) => Boolean(grid.isNeighbors(a, b)),
  getPointerTarget: (source, start, end) => getPointerTargetTile(grid, source, start, end),
  moveTiles: (a, b) => void makeMove(a, b),
  activateBooster,
  swipeBooster,
})

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
  gameResult.value = null
  turns.value = COUNT_TURNS
  cancelObjectiveCollection()
  cancelCookieBreakAnimation()
  objectives.splice(0)
  counters.splice(0)
  cancelBoosterAnimation()
  grid.clear()
  fillGrid()
  placeSpecialTiles(grid, BOARD_WIDTH, BOARD_HEIGHT, createTile)
  initializeGameGoals(grid, objectives, counters, random)
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
