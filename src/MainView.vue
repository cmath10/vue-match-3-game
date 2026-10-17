<template>
    <div
        v-if="entry.ready"
        :style="boardStyle"
        class="b-game-layout"
    >
        <aside class="b-game-layout__menu">
            <BGameMenu
                :counters="gameResult === 'win' ? counters : displayedCounters"
                :level-id="props.levelId"
                :objectives="objectives"
                :result="gameResult"
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
                    :surface="boardSurface"
                    :tile-break-effects="tileBreakEffects"
                    :tile-movement-durations="tileMovementDurations"
                    :tiles="activeTiles"
                    @tile-click="onTileClick"
                    @tile-double-click="onTileDoubleClick"
                    @tile-pointer-cancel="onTilePointerCancel"
                    @tile-pointer-down="onTilePointerDown"
                    @tile-pointer-up="onTilePointerUp"
                />
            </div>

            <BGameFooter />

            <BGameResultOverlay
                v-if="gameResult"
                :next-level-available="nextLevelId !== null"
                :result="gameResult"
                @next-level="openNextLevel"
                @play-again="startNewGame"
            />
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
import type { GravityState } from '@/domain/levels/types'
import type { ObjectiveType } from '@/domain/enums'
import type { SpawnDefinition } from '@/domain/levels/types'

import {
  computed,
  onBeforeUnmount,
  reactive,
  ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import BGameBoard from '@/components/BGameBoard.vue'
import BGameFooter from '@/components/BGameFooter.vue'
import BGameMenu from '@/components/BGameMenu.vue'
import BGameObjectiveFlights from '@/components/BGameObjectiveFlights.vue'
import BGameResultOverlay from '@/components/BGameResultOverlay.vue'
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
import { useTileMovementAnimation } from '@/composables/useTileMovementAnimation'

import { applyBoosterMovePositions } from '@/game/board/boardHits'
import { clearMatchedPositions } from '@/game/board/boardHits'
import { cloneBoard } from '@/domain/progress'
import { collapseGrid } from '@/game/board/boardTransitions'
import { collectDroppedMugs } from '@/game/board/specialTiles'
import { createAttemptRandom } from '@/domain/random'
import { createGravityState } from '@/domain/levels/gravityState'
import { createMatch3BoosterTurn } from '@/game/turns/boosterTurn'
import { createMatch3TileInput } from '@/input/tileInput'
import { findMatchedPositions, findMatchLines } from '@/domain/board/matches'
import { getBoardStyle } from '@/presentation/tiles'
import { getBoardSurface } from '@/presentation/boardSurface'
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
import { isLevelId } from '@/domain/progress'
import { materializeInitialBoard } from '@/domain/levels/materializeInitialBoard'
import { placeCreatedBoosters } from '@/game/board/boardBoosters'
import { refillGrid } from '@/game/board/boardTransitions'
import { restoreAttemptRandom } from '@/domain/random'
import { restoreGravityState } from '@/domain/levels/gravityState'
import { snapshotGravityState } from '@/domain/levels/gravityState'
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
let gravityState: GravityState = createGravityState()

const random = <T>(array: T[]): T => {
  if (array.length === 0) {
    throw new Error('Cannot select a random item from an empty array')
  }

  return attemptRandom.select(array as [T, ...T[]])
}

const grid = reactive(new TileGrid(level.topology)) as TileGrid
const objectives = reactive<Objective[]>([])
const counters = reactive<Counter[]>([])
const displayedCounters = reactive<Counter[]>([])
const turns = ref(COUNT_TURNS)
const evaluating = ref(false)
const gameResult = ref<GameResult | null>(null)
const gameVersion = ref(0)
const nextTileId = ref(0)
const boardStyle = getBoardStyle(boardWidth, boardHeight)
const boardSurface = getBoardSurface(level.topology)
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
  getGravity: () => snapshotGravityState(gravityState),
  getBoard: () => grid.getTileList(),
  objectives,
  counters,
  turns,
  nextTileId,
})

const locked = computed(() => evaluating.value || gameResult.value !== null)
const nextLevelId = computed(() => {
  const levelId = props.levelId + 1

  return gameResult.value === 'win' && isLevelId(levelId) ? levelId : null
})
const activeTiles = computed(() => grid.getTiles().sort((a, b) => a.id - b.id))
const cells = computed(() => getGridCells(grid))

const createTile = (type: BoardTileType, row: number, column: number): Tile => (
  { id: nextTileId.value++, type, selected: false, row, column }
)

const getSpawnTileTypes = (spawn: SpawnDefinition): TileType[] => {
  const pool = level.tilePools.get(spawn.pool)

  if (pool === undefined) {
    throw new Error(`Missing spawn pool for ${spawn.id}`)
  }

  return [...pool.types]
}

const generateType = (spawn: SpawnDefinition, i: number, j: number): TileType => (
  random(getSpawnTileTypes(spawn).filter(type => !createsMatch(type, i, j)))
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
const waitDuration = (duration: number) => new Promise<void>(resolve => setTimeout(resolve, duration))
const {
  visualEffects: boosterVisualEffects, combination: boosterCombination,
  flights: buttonFlights, collectingTileIds, combiningTileIds: combiningBoosterTileIds,
  detonatingKettleTileIds,
  animateWave: animateBoosterWave, cancel: cancelBoosterAnimation,
} = useBoosterAnimation({ grid, waitAnimation, waitDuration, nextAnimationFrame })

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

const incrementCounter = (collectionCounters: Counter[], type: ObjectiveType) => {
  const counter = collectionCounters.find((c: Counter) => c.type === type)

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
  counters: displayedCounters,
  boardWidth,
  incrementCounter: type => incrementCounter(displayedCounters, type),
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

const getSpawnOriginById = (spawnId: string, spawnIndex: number): Position => {
  const spawn = level.spawns.find(item => item.id === spawnId)

  if (spawn === undefined) {
    throw new Error(`Unknown spawn: ${spawnId}`)
  }
  return getSpawnOrigin(spawn, spawnIndex)
}

const {
  durations: tileMovementDurations,
  animate: animateTileMovements,
  cancel: cancelTileMovementAnimation,
} = useTileMovementAnimation({
  duration: ANIMATION_DELAY,
  getSpawnOrigin: getSpawnOriginById,
  getTile: tileId => grid.getTiles().find(tile => tile.id.toString() === tileId),
  nextFrame: nextAnimationFrame,
  wait: waitDuration,
})

const collectTile = (collection: ObjectiveCollection): void => {
  incrementCounter(counters, collection.type)
  recordCollection(collection.type)
  collectCookieBreak(collection)
  collectObjective(collection)
  collectTileBreak(collection)
}

const getSpawnOrigin = (spawn: SpawnDefinition, spawnIndex: number): Position => {
  const nextKey = level.gravity.nodes.get(`${spawn.entry.row}:${spawn.entry.column}`)?.next

  if (nextKey === null || nextKey === undefined) {
    return { ...spawn.entry }
  }
  const [nextRow, nextColumn] = nextKey.split(':').map(Number)
  const distance = spawnIndex + 1

  return {
    row: spawn.entry.row - (nextRow - spawn.entry.row) * distance,
    column: spawn.entry.column - (nextColumn - spawn.entry.column) * distance,
  }
}

const spawnTile = (spawn: SpawnDefinition, target: Position, spawnIndex: number): Tile => {
  const origin = getSpawnOrigin(spawn, spawnIndex)

  return createTile(generateType(spawn, target.row, target.column), origin.row, origin.column)
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

const waitForResolutionAnimations = (movements: TileMovement[]) => Promise.all([
  animateTileMovements(movements),
  animateObjectiveCollections(),
  animateCookieBreaks(),
  animateTileBreaks(),
])

const finishWinningTurn = (): void => {
  if (gameResult.value === null && getGameResult(objectives, counters, turns.value) === 'win') {
    finishTurn()
  }
}

const settleGrid = async (version: number, initialMovements: TileMovement[]) => {
  let movements = initialMovements

  while (true) {
    finishWinningTurn()
    await waitForResolutionAnimations(movements)

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

const settleCollectors = (movements: TileMovement[]): number => {
  let phase = 0

  while (collectDroppedMugs(grid, level.collectors, collectTile) > 0) {
    phase++
    const collapsed = collapseGrid(grid, level.gravity, gravityState, {
      phase,
      resolutionOrder: movements.length,
    })

    movements.push(...collapsed)
  }
  return phase
}

const transitionGrid = (): TileMovement[] => {
  const movements = collapseGrid(grid, level.gravity, gravityState)
  const refillPhase = settleCollectors(movements)

  movements.push(...refillGrid(
    grid,
    level.gravity,
    gravityState,
    level.spawns,
    spawnTile,
    { phase: refillPhase, resolutionOrder: movements.length }
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
  if (gameResult.value === null) {
    turns.value--
    recordTurn()
    updateGameResult()
  }
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
  if (gameResult.value !== null) {
    persistProgress(gameResult.value)
  }
  gameVersion.value++
  evaluating.value = false
  gameResult.value = null
  cancelObjectiveCollection()
  cancelCookieBreakAnimation()
  cancelTileBreakAnimation()
  cancelTileLandingAnimation()
  cancelTileMovementAnimation()
  cancelBoosterAnimation()
  objectives.splice(0)
  counters.splice(0)
  displayedCounters.splice(0)
  grid.clear()
}

const startNewGame = () => {
  resetRuntime()
  attemptRandom = createAttemptRandom()
  gravityState = createGravityState()
  turns.value = COUNT_TURNS
  initializePlayableLevel({
    grid,
    objectives,
    counters,
    initialObjectives: level.objectives,
    fillGrid,
    resetTileIds: () => nextTileId.value = 0,
  })
  displayedCounters.push(...counters.map(counter => ({ ...counter })))
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
  gravityState = restoreGravityState(snapshot.gravity, level.gravity)
  turns.value = snapshot.turns
  nextTileId.value = snapshot.nextTileId
  restoreProgress(snapshot)
  objectives.push(...snapshot.objectives.map(objective => ({ ...objective })))
  restoreCounters(snapshot.counters)
  cloneBoard(snapshot.board).forEach((row, rowIndex) => row.forEach((tile, columnIndex) => {
    grid.setTile(tile, rowIndex, columnIndex)
  }))
}

const restoreCounters = (savedCounters: Counter[]): void => {
  counters.push(...savedCounters.map(counter => ({ ...counter })))
  displayedCounters.push(...savedCounters.map(counter => ({ ...counter })))
}

const openRoute = (name: 'home' | 'levels'): void => void router.push({ name })
const openNextLevel = (): void => {
  if (nextLevelId.value !== null) {
    void router.push({ name: 'game', params: { levelId: nextLevelId.value } })
  }
}

const entry = reactive(useLevelEntry({
  getLevelId: () => props.levelId,
  isResumeRequested: () => props.resumeRequested,
  playerState,
  restoreGame,
  startGame: startNewGame,
  onLocked: () => void router.replace({ name: 'levels' }),
}))

onBeforeUnmount(() => {
  if (gameResult.value !== null) {
    resetRuntime()
  }
})
</script>
