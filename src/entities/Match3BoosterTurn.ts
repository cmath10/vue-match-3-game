import type TileGrid from '@/entities/TileGrid'
import {
  getBoosterSwipeActivations,
  resolveBoosterWave,
  type BoosterActivation,
  type SelectButtonBoxTarget,
} from '@/entities/Match3BoosterWave'
import {
  getBoardTileTypeBoard,
  getGridTilePosition,
} from '@/entities/Match3GridBoard'
import type { TileMovement } from '@/entities/Match3GridTransitions'
import type { Position } from '@/entities/Match3Engine'
import type { Tile } from '@/types/game'

type BoosterTurnOptions = {
  grid: TileGrid
  getVersion: () => number
  isVersionCurrent: (version: number) => boolean
  setEvaluating: (evaluating: boolean) => void
  waitAnimation: () => Promise<void>
  settleGrid: (version: number, movements: TileMovement[]) => Promise<void>
  resolvePositions: (positions: Position[]) => TileMovement[]
  finishTurn: () => void
  swapTiles: (a: Tile, b: Tile) => void
  selectButtonBoxTarget: SelectButtonBoxTarget
}

export const createMatch3BoosterTurn = (options: BoosterTurnOptions) => ({
  activateBooster: (tile: Tile) => activateBooster(options, tile),
  swipeBooster: (source: Tile, target: Tile) => swipeBooster(options, source, target),
})

const activateBooster = (options: BoosterTurnOptions, tile: Tile): void => {
  const position = getGridTilePosition(options.grid, tile)

  if (position !== null) {
    void runBoosterTurn(options, [{ source: position }], false)
  }
}

const swipeBooster = (options: BoosterTurnOptions, source: Tile, target: Tile): void => {
  const sourceDestination = getGridTilePosition(options.grid, target)
  const targetDestination = getGridTilePosition(options.grid, source)

  if (sourceDestination === null || targetDestination === null) {
    return
  }

  startBoosterSwipe(options, source, target, sourceDestination, targetDestination)
}

const startBoosterSwipe = (
  options: BoosterTurnOptions,
  source: Tile,
  target: Tile,
  sourceDestination: Position,
  targetDestination: Position
): void => {
  const activations = getBoosterSwipeActivations(
    source.type,
    target.type,
    sourceDestination,
    targetDestination
  )

  if (activations !== null) {
    options.swapTiles(source, target)
    void runBoosterTurn(options, activations, true)
  }
}

const runBoosterTurn = async (
  options: BoosterTurnOptions,
  activations: BoosterActivation[],
  animateSwap: boolean
): Promise<void> => {
  const version = options.getVersion()

  options.setEvaluating(true)
  if (!await waitForSwap(options, version, animateSwap)) {
    return
  }

  const wave = resolveTurnWave(options, activations)

  await options.settleGrid(version, options.resolvePositions(wave.positions))

  if (options.isVersionCurrent(version)) {
    options.finishTurn()
  }
}

const resolveTurnWave = (
  options: BoosterTurnOptions,
  activations: BoosterActivation[]
) => {
  return resolveBoosterWave(
    getBoardTileTypeBoard(options.grid),
    activations,
    options.selectButtonBoxTarget
  )
}

const waitForSwap = async (
  options: BoosterTurnOptions,
  version: number,
  animateSwap: boolean
): Promise<boolean> => {
  if (animateSwap) {
    await options.waitAnimation()
  }

  return options.isVersionCurrent(version)
}
