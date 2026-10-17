import type { TileType } from '@/domain/enums'

import type { BoardEffect, BoosterWave, Position } from '@/domain/types'
import type TileGrid from '@/game/board/TileGrid'

import type { Ref } from 'vue'

import { computed, nextTick, ref } from 'vue'

import { isMatchableTile } from '@/domain/tiles'

import { BoosterType } from '@/domain/enums'

export type ButtonFlight = {
  id: string
  tileId: number
  type: TileType
  from: Position
  to: Position
  phase: 'targeting' | 'highlighted' | 'transformed' | 'fading' | 'flying'
}

export const BUTTON_PREPARATION_PHASES = ['targeting', 'highlighted', 'transformed', 'fading'] as const
export const BUTTON_PHASE_DURATIONS = {
  targeting: 240,
  highlighted: 180,
  transformed: 180,
  fading: 240,
} as const

type ButtonCollectionOptions = {
  grid: TileGrid
  waitAnimation: () => Promise<void>
  waitDuration: (duration: number) => Promise<void>
  nextAnimationFrame: () => Promise<void>
}

type ButtonCollectionState = { flights: Ref<ButtonFlight[]>; version: number }

export const useButtonCollection = (options: ButtonCollectionOptions) => {
  const flights = ref<ButtonFlight[]>([])
  const state: ButtonCollectionState = { flights, version: 0 }
  const collectingTileIds = computed(() => new Set(flights.value.map(flight => flight.tileId)))

  const cancel = (): void => {
    state.version++
    flights.value = []
  }

  return {
    flights,
    collectingTileIds,
    animateWave: (wave: BoosterWave) => animateWave(options, state, wave),
    cancel,
  }
}

export const getButtonFlights = (grid: TileGrid, wave: BoosterWave): ButtonFlight[] => {
  const claimedPositions = new Set<string>()

  return wave.effects
    .filter(effect => effect.booster === BoosterType.ButtonBox && effect.targetType !== undefined)
    .flatMap(effect => getEffectFlights(grid, effect, claimedPositions))
}

export const getButtonFlightStyle = (flight: ButtonFlight) => {
  const position = flight.phase === 'flying' ? flight.to : flight.from

  return {
    '--button-phase-duration': `${BUTTON_PHASE_DURATIONS.transformed}ms`,
    transform: `translate(calc(${position.column} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)), calc(${position.row} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)))`,
  }
}

const prepareFlights = async (
  options: ButtonCollectionOptions,
  state: ButtonCollectionState,
  version: number
): Promise<boolean> => {
  await nextTick()
  await options.nextAnimationFrame()
  await options.nextAnimationFrame()
  for (const phase of BUTTON_PREPARATION_PHASES) {
    if (version !== state.version) {
      return false
    }
    state.flights.value.forEach(flight => flight.phase = phase)
    await options.waitDuration(BUTTON_PHASE_DURATIONS[phase])
  }
  return version === state.version
}

const animateWave = async (
  options: ButtonCollectionOptions,
  state: ButtonCollectionState,
  wave: BoosterWave
): Promise<void> => {
  const version = ++state.version

  state.flights.value = getButtonFlights(options.grid, wave)
  if (state.flights.value.length === 0 || !await prepareFlights(options, state, version)) {
    return
  }
  state.flights.value.forEach(flight => flight.phase = 'flying')
  await options.waitAnimation()
  if (version === state.version) {
    state.flights.value = []
  }
}

const getEffectFlights = (
  grid: TileGrid,
  effect: BoardEffect,
  claimedPositions: Set<string>
): ButtonFlight[] => {
  return effect.positions.flatMap((position) => {
    const key = getPositionKey(position)
    const tile = grid.getTileByIndex(position.row, position.column)

    if (claimedPositions.has(key) || !isCollectableTile(tile, effect.targetType)) {
      return []
    }

    claimedPositions.add(key)

    return [createButtonFlight(tile, position, effect.source)]
  })
}

const createButtonFlight = (
  tile: NonNullable<ReturnType<TileGrid['getTileByIndex']>> & { type: TileType },
  from: Position,
  to: Position
): ButtonFlight => ({
  id: `${getPositionKey(to)}-${tile.id}`,
  tileId: tile.id,
  type: tile.type,
  from,
  to,
  phase: 'targeting',
})

const isCollectableTile = (
  tile: ReturnType<TileGrid['getTileByIndex']>,
  targetType: TileType | undefined
): tile is NonNullable<typeof tile> & { type: TileType } => {
  return targetType !== undefined &&
    tile !== null &&
    !tile.blocker &&
    isMatchableTile(tile) &&
    tile.type === targetType
}

const getPositionKey = ({ row, column }: Position): string => `${row}-${column}`
