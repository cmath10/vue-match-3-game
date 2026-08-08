import type {
  BoosterActivation,
  BoosterCombination,
  BoosterSwipe,
  BoosterWave,
  MoveMatch,
  Position,
  SelectButtonBoxTarget,
  Tile,
  TileMovement,
} from '@/domain/types'

import type TileGrid from '@/game/board/TileGrid'

import { getBoardTileTypeBoard } from '@/game/board/boardProjection'
import { getBoosterSwipe } from '@/domain/boosters/combinations'
import { getGridTilePosition } from '@/game/board/boardProjection'
import { getMatchableTileBoard } from '@/game/board/boardProjection'
import { getMoveMatch } from '@/domain/boosters/creation'
import { resolveBoosterWave } from '@/domain/boosters/chain'

type BoosterTurnOptions = {
  grid: TileGrid
  getVersion: () => number
  isVersionCurrent: (version: number) => boolean
  setEvaluating: (evaluating: boolean) => void
  waitAnimation: () => Promise<void>
  settleGrid: (version: number, movements: TileMovement[]) => Promise<void>
  resolvePositions: (positions: Position[], match: MoveMatch) => TileMovement[]
  animateWave: (wave: BoosterWave) => Promise<void>
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
    void runBoosterTurn(options, [{ source: position }], false, { positions: [], boosters: [] }, null)
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
  const swipe = getSwipe(source, target, sourceDestination, targetDestination)

  if (swipe === null) {
    return
  }

  options.swapTiles(source, target)
  const match = getBoosterMoveMatch(options, sourceDestination, targetDestination)

  void runBoosterTurn(options, swipe.activations, true, match, swipe.combination)
}

const getSwipe = (
  source: Tile,
  target: Tile,
  sourceDestination: Position,
  targetDestination: Position
): BoosterSwipe | null => getBoosterSwipe(
  source.type,
  target.type,
  sourceDestination,
  targetDestination
)

const runBoosterTurn = async (
  options: BoosterTurnOptions,
  activations: BoosterActivation[],
  animateSwap: boolean,
  match: MoveMatch,
  combination: BoosterCombination | null
): Promise<void> => {
  const version = options.getVersion()
  options.setEvaluating(true)
  if (!await waitForSwap(options, version, animateSwap)) {
    return
  }
  const wave = resolveTurnWave(options, activations, combination)
  if (!await animateTurnWave(options, wave, version)) {
    return
  }
  await options.settleGrid(version, options.resolvePositions(wave.positions, match))

  finishCurrentTurn(options, version)
}

const getBoosterMoveMatch = (
  options: BoosterTurnOptions,
  sourceDestination: Position,
  targetDestination: Position
): MoveMatch => getMoveMatch(
  getMatchableTileBoard(options.grid),
  sourceDestination,
  targetDestination
)

const finishCurrentTurn = (options: BoosterTurnOptions, version: number): void => {
  if (options.isVersionCurrent(version)) {
    options.finishTurn()
  }
}

const animateTurnWave = async (
  options: BoosterTurnOptions,
  wave: BoosterWave,
  version: number
): Promise<boolean> => {
  await options.animateWave(wave)

  return options.isVersionCurrent(version)
}

const resolveTurnWave = (
  options: BoosterTurnOptions,
  activations: BoosterActivation[],
  combination: BoosterCombination | null
) => {
  return resolveBoosterWave(
    getBoardTileTypeBoard(options.grid),
    activations,
    options.selectButtonBoxTarget,
    combination
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
