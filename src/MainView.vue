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
                    :booster-combination="boosterCombination"
                    :button-flights="buttonFlights"
                    :cells="cells"
                    :collecting-tile-ids="collectingTileIds"
                    :combining-booster-tile-ids="combiningBoosterTileIds"
                    :cookie-break-effects="cookieBreakEffects"
                    :detonating-kettle-tile-ids="detonatingKettleTileIds"
                    :edge-guides="level.edgeGuides"
                    :landing-tile-ids="landingTileIds"
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
import type { FixedTileDefinition } from '@/domain/levels/types'
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
import { useTileLandingAnimation } from '@/composables/useTileLandingAnimation'

import { applyBoosterMovePositions } from '@/game/board/boardHits'
import { clearMatchedPositions } from '@/game/board/boardHits'
import { cloneBoard } from '@/domain/progress'
import { collapseGrid } from '@/game/board/boardTransitions'
import { collectDroppedMugs } from '@/game/board/specialTiles'
import { createAttemptRandom } from '@/domain/random'
import { createMatch3BoosterTurn } from '@/game/turns/boosterTurn'
import { createMatch3TileInput } from '@/input/tileInput'
import { findMatchedPositions, findMatchLines } from '@/domain/board/matches'
import { getBoardStyle } from '@/presentation/tiles'
import { getCascadeBoosterCreations } from '@/domain/boosters/creation'
import { getCatalogLevel } from '@/domain/levels/catalog'
import { getGameResult } from '@/domain/objectives'
import { getGridCells } from '@/presentation/tiles'
import { getGridTilePosition, getMatchableTileState } from '@/game/board/boardProjection'
import { getMatchPositions } from '@/domain/board/matches'
import { getMoveMatch } from '@/domain/boosters/creation'
import { getPointerTargetTile } from '@/input/tilePointerTarget'
import { initializePlayableLevel } from '@/game/setup'
import { isBoardCompatibleWithLevel } from '@/domain/levels/restore'
import { materializeInitialBoard } from '@/domain/levels/materializeInitialBoard'
import { placeCreatedBoosters } from '@/game/board/boardBoosters'
import { refillGrid } from '@/game/board/boardTransitions'
import { restoreAttemptRandom } from '@/domain/random'
import { usePlayerProgress } from '@/state/playerProgress'

import { TileType } from '@/domain/enums'

const COUNT_TURNS = 25
const ANIMATION_DELAY = 480

const props = defineProps<{
  levelId: number;
  resumeRequested: boolean;
}>()

const { t } = useI18n()
const router = useRouter()
const { state: playerState } = usePlayerProgress()
const level = getCatalogLevel(props.levelId)
const { width: boardWidth, height: boardHeight } = level.topology.bounds
let attemptRandom = createAttemptRandom()

const random = <T>(array: T[]): T => {
  if (array.length === 0) {
    throw new Error('Cannot select a random item from an empty array')
  }

  return attemptRandom.select(array as [T, ...T[]])
}

const grid = reactive(new TileGrid(level.topology)) as TileGrid
const objectives = reactive<Objective[]>([])
const counters = reactive<Counter[]>([])
const turns = ref(COUNT_TURNS)
const evaluating = ref(false)
const gameResult = ref<GameResult | null>(null)
const gameVersion = ref(0)
const nextTileId = ref(0)
const boardStyle = getBoardStyle(boardWidth, boardHeight)
const {
  begin: beginProgress,
  persist: persistProgress,
  recordBooster,
  recordCollection,
  recordTurn,
  restore: restoreProgress,
} = useGameProgress({
  getLevel: () => ({ kind: 'catalog', levelId: level.id, levelRevision: level.revision }),
  getRandom: () => attemptRandom.snapshot(),
  getGravity: () => ({ nextIncomingIndexByCell: {} }),
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

const getSpawnTileTypes = (column: number): TileType[] => {
  const spawn = level.spawns.find(item => item.entry.column === column)
  const pool = spawn === undefined ? undefined : level.tilePools.get(spawn.pool)

  if (pool === undefined) {
    throw new Error(`Missing spawn pool for column ${column}`)
  }

  return [...pool.types]
}

const generateType = (i: number, j: number): TileType => (
  random(getSpawnTileTypes(j).filter(type => !createsMatch(type, i, j)))
)

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
  visualEffects: boosterVisualEffects, combination: boosterCombination,
  flights: buttonFlights, collectingTileIds, combiningTileIds: combiningBoosterTileIds,
  detonatingKettleTileIds,
  animateWave: animateBoosterWave, cancel: cancelBoosterAnimation,
} = useBoosterAnimation({ grid, waitAnimation, nextAnimationFrame })

const getTileTypeBoard = () => getMatchableTileState(grid)

const createsMatch = (type: TileType, i: number, j: number): boolean => {
  const board = getTileTypeBoard()

  board.occupancy[i][j] = type

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
  boardWidth,
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
const {
  tileIds: landingTileIds,
  animate: animateTileLandings,
  cancel: cancelTileLandingAnimation,
} = useTileLandingAnimation({ waitAnimation })

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
  clearMatchedPositions(grid, positions, boardWidth, boardHeight, collectTile)
  return transitionGrid()
}

const resolveBoosterPositions = (positions: Position[], match: MoveMatch): TileMovement[] => {
  applyBoosterMovePositions(grid, positions, match, boardWidth, boardHeight, collectTile)
  return transitionGrid()
}

const transitionGrid = (): TileMovement[] => {
  const movements = collapseGrid(grid, level.gravity)

  collectDroppedMugs(grid, level.gravity, level.collectors, collectTile)
  movements.push(...collapseGrid(grid, level.gravity, movements.length))
  movements.push(...refillGrid(
    grid,
    level.gravity,
    level.spawns,
    spawnTile,
    movements.length
  ))
  animateTileLandings(movements)

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
  wave.activatedBoosters.forEach(recordBooster)
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

const createMaterializedTile = (definition: FixedTileDefinition, row: number, column: number): Tile => {
  const tile = createTile(definition.type, row, column)

  if (definition.kind === 'ordinary') {
    tile.blocker = definition.blocker === undefined ? undefined : { ...definition.blocker }
  } else if (definition.kind === 'special' && 'health' in definition) {
    tile.health = definition.health
  }

  return tile
}

const fillGrid = () => materializeInitialBoard(level, attemptRandom).forEach((row, rowIndex) => (
  row.forEach((definition, columnIndex) => {
    if (definition !== null) {
      grid.setTile(createMaterializedTile(definition, rowIndex, columnIndex), rowIndex, columnIndex)
    }
  })
))

const resetRuntime = (): void => {
  gameVersion.value++
  evaluating.value = false
  gameResult.value = null
  cancelObjectiveCollection()
  cancelCookieBreakAnimation()
  cancelTileBreakAnimation()
  cancelTileLandingAnimation()
  cancelBoosterAnimation()
  objectives.splice(0)
  counters.splice(0)
  grid.clear()
}

const startNewGame = () => {
  resetRuntime()
  attemptRandom = createAttemptRandom()
  turns.value = COUNT_TURNS
  initializePlayableLevel({
    grid, width: boardWidth, height: boardHeight, objectives, counters, createTile, fillGrid,
    resetTileIds: () => nextTileId.value = 0, selectRandom: random,
    shuffle: items => attemptRandom.shuffle(items),
  })
  beginProgress()
}

const restoreGame = (snapshot: GameSnapshot): void => {
  if (snapshot.level.kind !== 'catalog' ||
    snapshot.level.levelId !== level.id ||
    snapshot.level.levelRevision !== level.revision ||
    !isBoardCompatibleWithLevel(level, snapshot.board)) {
    throw new Error('Saved attempt uses an incompatible level definition')
  }

  resetRuntime()
  attemptRandom = restoreAttemptRandom(snapshot.random)
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
