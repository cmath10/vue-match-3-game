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
  active: boolean
}

type ButtonCollectionOptions = {
  grid: TileGrid
  waitAnimation: () => Promise<void>
  nextAnimationFrame: () => Promise<void>
}

export const useButtonCollection = (options: ButtonCollectionOptions) => {
  const flights = ref<ButtonFlight[]>([])
  const collectingTileIds = computed(() => new Set(flights.value.map(flight => flight.tileId)))

  const cancel = (): void => {
    flights.value = []
  }

  return {
    flights,
    collectingTileIds,
    animateWave: (wave: BoosterWave) => animateWave(options, flights, wave),
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
  const position = flight.active ? flight.to : flight.from

  return {
    transform: `translate(calc(${position.column} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)), calc(${position.row} * (var(--cell-size) + var(--cell-gap)) + var(--tile-offset)))`,
  }
}

const startFlights = async (
  flights: ButtonFlight[],
  nextAnimationFrame: () => Promise<void>
): Promise<void> => {
  await nextTick()
  await nextAnimationFrame()
  await nextAnimationFrame()
  flights.forEach(flight => flight.active = true)
}

const animateWave = async (
  options: ButtonCollectionOptions,
  flights: Ref<ButtonFlight[]>,
  wave: BoosterWave
): Promise<void> => {
  flights.value = getButtonFlights(options.grid, wave)

  if (flights.value.length > 0) {
    await startFlights(flights.value, options.nextAnimationFrame)
    await options.waitAnimation()
    flights.value = []
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
  active: false,
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
