import type TileGrid from '@/entities/TileGrid'
import { isBoosterType } from '@/entities/Match3BoosterEffects'
import { isMovableTile } from '@/entities/Match3SpecialTileConfig'
import type { Tile } from '@/types/game'

type TileInputOptions = {
  grid: TileGrid
  isLocked: () => boolean
  areNeighbors: (a: Tile, b: Tile) => boolean
  getPointerTarget: (event: PointerEvent) => Tile | null
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
  gesture: { source: Tile, pointerId: number } | null
  suppressClick: boolean
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
  if (!options.isLocked() && isBoosterType(tile.type)) {
    const pointerTarget = event.currentTarget as Element | null

    state.gesture = { source: tile, pointerId: event.pointerId }
    tile.selected = true
    pointerTarget?.setPointerCapture?.(event.pointerId)
  }
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
  const target = options.getPointerTarget(event)

  gesture.source.selected = false
  state.gesture = null
  if (isValidSwipeTarget(options, gesture.source, target)) {
    state.suppressClick = true
    options.swipeBooster(gesture.source, target)
  }
}

const onTileDoubleClick = (options: TileInputOptions, tile: Tile): void => {
  if (!options.isLocked() && isBoosterType(tile.type)) {
    options.activateBooster(tile)
  }
}

const isValidSwipeTarget = (
  options: TileInputOptions,
  source: Tile,
  target: Tile | null
): target is Tile => {
  return target !== null &&
    target !== source &&
    isMovableTile(target) &&
    options.areNeighbors(source, target)
}

const handleSelectedTileClick = (options: TileInputOptions, selectedTile: Tile, tile: Tile): void => {
  if (selectedTile !== tile) {
    if (options.areNeighbors(selectedTile, tile)) {
      options.moveTiles(selectedTile, tile)
    } else {
      tile.selected = true
    }
  }

  selectedTile.selected = false
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
