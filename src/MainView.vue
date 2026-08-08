<template>
    <div
        v-if="entry.ready"
        :style="boardStyle"
        class="b-game-layout"
    >
        <aside class="b-game-layout__menu">
            <BGameMenu
                :counters="counters"
                :level-id="props.levelId"
                :objectives="objectives"
                :turns="turns"
                @main-menu="openRoute('home')"
                @new-game="startNewGame"
            />
        </aside>

        <main class="b-game-layout__field">
            <div class="b-game-layout__board">
                <BGameBoard
                    :booster-effects="boosterVisualEffects"
                    :button-flights="buttonFlights"
                    :cells="cells"
                    :collecting-tile-ids="collectingTileIds"
                    :cookie-break-effects="cookieBreakEffects"
                    :result="gameResult"
                    :tile-break-effects="tileBreakEffects"
                    :tiles="activeTiles"
                    @play-again="startNewGame"
                    @tile-click="onTileClick"
                    @tile-double-click="onTileDoubleClick"
                    @tile-pointer-cancel="onTilePointerCancel"
                    @tile-pointer-down="onTilePointerDown"
                    @tile-pointer-up="onTilePointerUp"
                />
            </div>

            <BGameFooter />
        </main>

        <BGameObjectiveFlights :flights="objectiveFlights" />
    </div>

    <BLevelAttemptPrompt
        v-else-if="entry.pendingAttempt"
        :snapshot="entry.pendingAttempt"
        @back="openRoute('levels')"
        @continue="entry.continueAttempt"
        @restart="entry.restartAttempt"
    />

    <main v-else class="b-app-screen b-app-screen--immersive">
        <section class="b-app-screen__panel">
            {{ t('welcome.preparing') }}
        </section>
    </main>
</template>

<script lang="ts" setup>
import type {
  BoosterWave,
  Counter,
  GameResult,
  MoveMatch,
  Objective,
  ObjectiveCollection,
  Position,
  Tile,
  TileMovement,
} from '@/domain/types'

import type { BoardTileType } from '@/domain/enums'
import type { GameSnapshot } from '@/domain/progress'
import type { ObjectiveType } from '@/domain/enums'

import {
  computed,
  nextTick,
  reactive,
  ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import BGameBoard from '@/components/BGameBoard.vue'
import BGameFooter from '@/components/BGameFooter.vue'
import BGameMenu from '@/components/BGameMenu.vue'
import BGameObjectiveFlights from '@/components/BGameObjectiveFlights.vue'
import BLevelAttemptPrompt from '@/components/BLevelAttemptPrompt.vue'

import TileGrid from '@/game/board/TileGrid'

import { TILE_BREAK_ANIMATION_DURATION } from '@/composables/useTileBreakAnimation'
import { useBoosterAnimation } from '@/composables/useBoosterAnimation'
import { useCookieBreakAnimation } from '@/composables/useCookieBreakAnimation'
import { useGameProgress } from '@/composables/useGameProgress'
import { useLevelEntry } from '@/composables/useLevelEntry'
import { useObjectiveCollection } from '@/composables/useObjectiveCollection'
import { useTileBreakAnimation } from '@/composables/useTileBreakAnimation'

import { applyBoosterEffectPositions } from '@/game/board/boardHits'
import { clearMatchedPositions } from '@/game/board/boardHits'
import { cloneBoard } from '@/domain/progress'
import { collapseGrid } from '@/game/board/boardTransitions'
import { collectDroppedMugs } from '@/game/board/specialTiles'
import { createMatch3BoosterTurn } from '@/game/turns/boosterTurn'
import { createMatch3TileInput } from '@/input/tileInput'
import { findMatchedPositions, findMatchLines } from '@/domain/board/matches'
import { getBoardStyle } from '@/presentation/tiles'
import { getCascadeBoosterCreations } from '@/domain/boosters/creation'
import { getGameResult } from '@/domain/objectives'
import { getGridCells } from '@/presentation/tiles'
import { getGridTilePosition, getMatchableTileBoard } from '@/game/board/boardProjection'
import { getMatchPositions } from '@/domain/board/matches'
import { getMoveMatch } from '@/domain/boosters/creation'
import { getPointerTargetTile } from '@/input/tilePointerTarget'
import { initializePlayableLevel } from '@/game/setup'
import { placeCreatedBoosters } from '@/game/board/boardBoosters'
import { refillGrid } from '@/game/board/boardTransitions'
import { usePlayerProgress } from '@/state/playerProgress'

import { TileType } from '@/domain/enums'

import { AVAILABLE_TILE_TYPES } from '@/domain/config'
import { BOARD_HEIGHT, BOARD_WIDTH } from '@/domain/config'

const COUNT_TURNS = 25
const ANIMATION_DELAY = 480

const random = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)]

const props = defineProps<{
  levelId: number;
  resumeRequested: boolean;
}>()

const { t } = useI18n()
const router = useRouter()
const { state: playerState } = usePlayerProgress()

const grid = reactive(new TileGrid(BOARD_WIDTH, BOARD_HEIGHT)) as TileGrid
const objectives = reactive<Objective[]>([])
const counters = reactive<Counter[]>([])
const turns = ref(COUNT_TURNS)
const evaluating = ref(false)
const gameResult = ref<GameResult | null>(null)
const gameVersion = ref(0)
const nextTileId = ref(0)
const boardStyle = getBoardStyle(BOARD_WIDTH, BOARD_HEIGHT)
const {
  begin: beginProgress,
  persist: persistProgress,
  recordBooster,
  recordCollection,
  recordTurn,
  restore: restoreProgress,
} = useGameProgress({
  getLevelId: () => props.levelId,
  getBoard: () => grid.getTileList(),
  objectives,
  counters,
  turns,
  nextTileId,
})

const locked = computed(() => evaluating.value || gameResult.value !== null)
const activeTiles = computed(() => grid.getTiles().sort((a, b) => a.id - b.id))
const cells = computed(() => getGridCells(grid))

const createTile = (type: BoardTileType, row: number, column: number): Tile => (
  { id: nextTileId.value++, type, selected: false, row, column }
)

const generateType = (i: number, j: number): TileType => random(AVAILABLE_TILE_TYPES.filter(type => !createsMatch(type, i, j)))

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
const waitTileBreakAnimation = () => new Promise<void>(
  resolve => setTimeout(resolve, TILE_BREAK_ANIMATION_DURATION)
)
const nextAnimationFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
const {
  visualEffects: boosterVisualEffects, flights: buttonFlights, collectingTileIds,
  animateWave: animateBoosterWave, cancel: cancelBoosterAnimation,
} = useBoosterAnimation({ grid, waitAnimation, nextAnimationFrame })

const getTileTypeBoard = () => getMatchableTileBoard(grid)

const createsMatch = (type: TileType, i: number, j: number): boolean => {
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
} = useObjectiveCollection({
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
} = useCookieBreakAnimation({ waitAnimation, nextAnimationFrame })

const {
  effects: tileBreakEffects,
  animatePending: animateTileBreaks,
  cancel: cancelTileBreakAnimation,
  collect: collectTileBreak,
} = useTileBreakAnimation({ waitAnimation: waitTileBreakAnimation, nextAnimationFrame })

const collectTile = (collection: ObjectiveCollection): void => {
  recordCollection(collection.type)
  collectCookieBreak(collection)
  collectObjective(collection)
  collectTileBreak(collection)
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
  animateTileBreaks(),
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
  recordTurn()
  updateGameResult()
  evaluating.value = false
  persistProgress(gameResult.value)
}

const revertFailedMove = async (a: Tile, b: Tile, version: number) => {
  await waitAnimation()

  if (version !== gameVersion.value) {
    return
  }

  swapTiles(a, b)
  evaluating.value = false
}

const animateTrackedBoosterWave = async (wave: BoosterWave): Promise<void> => {
  wave.effects.forEach(effect => recordBooster(effect.booster))
  await animateBoosterWave(wave)
}

const { activateBooster, swipeBooster } = createMatch3BoosterTurn({
  grid,
  getVersion: () => gameVersion.value,
  isVersionCurrent: version => version === gameVersion.value,
  setEvaluating: value => evaluating.value = value,
  waitAnimation,
  settleGrid,
  resolvePositions: resolveBoosterPositions,
  animateWave: animateTrackedBoosterWave,
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

const resetRuntime = (): void => {
  gameVersion.value++
  evaluating.value = false
  gameResult.value = null
  cancelObjectiveCollection()
  cancelCookieBreakAnimation()
  cancelTileBreakAnimation()
  cancelBoosterAnimation()
  objectives.splice(0)
  counters.splice(0)
  grid.clear()
}

const startNewGame = () => {
  resetRuntime()
  turns.value = COUNT_TURNS
  initializePlayableLevel({
    grid, width: BOARD_WIDTH, height: BOARD_HEIGHT, objectives, counters, createTile, fillGrid,
    resetTileIds: () => nextTileId.value = 0, selectRandom: random,
  })
  beginProgress()
}

const restoreGame = (snapshot: GameSnapshot): void => {
  resetRuntime()
  turns.value = snapshot.turns
  nextTileId.value = snapshot.nextTileId
  restoreProgress(snapshot)
  objectives.push(...snapshot.objectives.map(objective => ({ ...objective })))
  counters.push(...snapshot.counters.map(counter => ({ ...counter })))
  cloneBoard(snapshot.board).forEach((row, rowIndex) => row.forEach((tile, columnIndex) => {
    grid.setTile(tile, rowIndex, columnIndex)
  }))
}

const openRoute = (name: 'home' | 'levels'): void => void router.push({ name })

const entry = reactive(useLevelEntry({
  getLevelId: () => props.levelId,
  isResumeRequested: () => props.resumeRequested,
  playerState,
  restoreGame,
  startGame: startNewGame,
  onLocked: () => void router.replace({ name: 'levels' }),
}))
</script>
