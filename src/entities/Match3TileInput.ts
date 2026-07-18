import type { PointerPosition } from '@/entities/Match3TileGesture'
import type { Tile } from '@/types/game'
import type TileGrid from '@/entities/TileGrid'

import { isBoosterType } from '@/entities/Match3BoosterEffects'
import { isMovableTile } from '@/entities/Match3SpecialTileConfig'

type TileInputOptions = {
  grid: TileGrid
  isLocked: () => boolean
  areNeighbors: (a: Tile, b: Tile) => boolean
  getPointerTarget: (source: Tile, start: PointerPosition, end: PointerPosition) => Tile | null
  moveTiles: (a: Tile, b: Tile) => void
  activateBooster: (tile: Tile) => void
  swipeBooster: (source: Tile, target: Tile) => void
}

export const createMatch3TileInput = (options: TileInputOptions) => {
  const state: TileInputState = { gesture: null, suppressClick: false }

  return {
    onTileClick: (tile: Tile) => onTileClick(options, state, tile),
    onTileDoubleClick: (tile: Tile) => onTileDoubleClick(options, tile),
    onTilePointerDown: (tile: Tile, event: PointerEvent) => onTilePointerDown(options, state, tile, event),
    onTilePointerUp: (event: PointerEvent) => onTilePointerUp(options, state, event),
    onTilePointerCancel: () => cancelPointerGesture(state),
  }
}

type TileInputState = {
  gesture: PointerGesture | null
  suppressClick: boolean
}

type PointerGesture = {
  source: Tile
  pointerId: number
  start: PointerPosition
}

const onTileClick = (options: TileInputOptions, state: TileInputState, tile: Tile): void => {
  if (state.suppressClick) {
    state.suppressClick = false
    return
  }

  if (options.isLocked()) {
    return
  }

  const selectedTile = options.grid.find(item => item.selected)

  if (!isMovableTile(tile)) {
    clearSelectedTile(selectedTile)
  } else if (selectedTile === null) {
    tile.selected = true
  } else {
    handleSelectedTileClick(options, selectedTile, tile)
  }
}

const onTilePointerDown = (
  options: TileInputOptions,
  state: TileInputState,
  tile: Tile,
  event: PointerEvent
): void => {
  if (options.isLocked() || !isMovableTile(tile)) {
    return
  }

  state.gesture = {
    source: tile,
    pointerId: event.pointerId,
    start: { x: event.clientX, y: event.clientY },
  }
  tile.selected = true
  capturePointer(event)
}

const onTilePointerUp = (
  options: TileInputOptions,
  state: TileInputState,
  event: PointerEvent
): void => {
  const gesture = state.gesture
  if (gesture === null || gesture.pointerId !== event.pointerId) {
    return
  }
  const target = getGestureTarget(options, gesture, event)

  gesture.source.selected = false
  state.gesture = null
  if (isValidGestureTarget(options, gesture.source, target)) {
    state.suppressClick = true
    resolveTileGesture(options, gesture.source, target)
  }
}

const getGestureTarget = (
  options: TileInputOptions,
  gesture: PointerGesture,
  event: PointerEvent
): Tile | null => {
  return options.getPointerTarget(
    gesture.source,
    gesture.start,
    { x: event.clientX, y: event.clientY }
  )
}

const onTileDoubleClick = (options: TileInputOptions, tile: Tile): void => {
  if (!options.isLocked() && isBoosterType(tile.type)) {
    options.activateBooster(tile)
  }
}

const isValidGestureTarget = (
  options: TileInputOptions,
  source: Tile,
  target: Tile | null
): target is Tile => {
  return target !== null &&
    target !== source &&
    isMovableTile(target) &&
    options.areNeighbors(source, target)
}

const hasBooster = (source: Tile, target: Tile): boolean => (
  isBoosterType(source.type) || isBoosterType(target.type)
)

const capturePointer = (event: PointerEvent): void => {
  const pointerTarget = event.currentTarget as Element | null

  pointerTarget?.setPointerCapture?.(event.pointerId)
}

const swipeTiles = (options: TileInputOptions, source: Tile, target: Tile): void => {
  if (isBoosterType(source.type)) {
    options.swipeBooster(source, target)
  } else {
    options.swipeBooster(target, source)
  }
}

const resolveTileGesture = (options: TileInputOptions, source: Tile, target: Tile): void => {
  if (hasBooster(source, target)) {
    swipeTiles(options, source, target)
  } else {
    options.moveTiles(source, target)
  }
}

const handleSelectedTileClick = (options: TileInputOptions, selectedTile: Tile, tile: Tile): void => {
  if (selectedTile !== tile) {
    handleSecondTileClick(options, selectedTile, tile)
  }

  selectedTile.selected = false
}

const handleSecondTileClick = (options: TileInputOptions, selectedTile: Tile, tile: Tile): void => {
  if (!options.areNeighbors(selectedTile, tile)) {
    tile.selected = true
  } else if (hasBooster(selectedTile, tile)) {
    swipeTiles(options, selectedTile, tile)
  } else {
    options.moveTiles(selectedTile, tile)
  }
}

const clearSelectedTile = (tile: Tile | null): void => {
  if (tile !== null) {
    tile.selected = false
  }
}

const cancelPointerGesture = (state: TileInputState): void => {
  if (state.gesture !== null) {
    state.gesture.source.selected = false
    state.gesture = null
  }
}
