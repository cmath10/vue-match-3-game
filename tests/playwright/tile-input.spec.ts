import { expect, test } from '@playwright/test'

import TileGrid from '../../src/entities/TileGrid'
import { createMatch3TileInput } from '../../src/entities/Match3TileInput'
import { BOOSTER_TYPE, TILE_TYPE } from '../../src/enums/game'
import type { Tile } from '../../src/types/game'

const createTile = (id: number, type: Tile['type'], column: number): Tile => ({
  id,
  type,
  selected: false,
  row: 0,
  column,
})

test('pointer gesture emits one booster swipe and suppresses its trailing click', () => {
  const grid = new TileGrid(2, 1)
  const booster = createTile(1, BOOSTER_TYPE.BUTTON_BOX, 0)
  const ordinary = createTile(2, TILE_TYPE.SWEETS_FISH, 1)
  const swipes: Array<[Tile, Tile]> = []
  let moves = 0

  grid.setTile(booster, 0, 0)
  grid.setTile(ordinary, 0, 1)

  const input = createMatch3TileInput({
    grid,
    isLocked: () => false,
    areNeighbors: () => true,
    getPointerTarget: () => ordinary,
    moveTiles: () => moves++,
    activateBooster: () => undefined,
    swipeBooster: (source, target) => swipes.push([source, target]),
  })

  input.onTilePointerDown(booster, { pointerId: 7 } as PointerEvent)
  input.onTilePointerUp({ pointerId: 7 } as PointerEvent)
  input.onTileClick(booster)

  expect(swipes).toEqual([[booster, ordinary]])
  expect(moves).toBe(0)
  expect(booster.selected).toBe(false)
})

test('pointer gesture can start from a non-booster and still activates the adjacent booster', () => {
  const grid = new TileGrid(2, 1)
  const ordinary = createTile(1, TILE_TYPE.SWEETS_FISH, 0)
  const booster = createTile(2, BOOSTER_TYPE.AREA_KETTLE, 1)
  const swipes: Array<[Tile, Tile]> = []

  grid.setTile(ordinary, 0, 0)
  grid.setTile(booster, 0, 1)

  const input = createMatch3TileInput({
    grid,
    isLocked: () => false,
    areNeighbors: () => true,
    getPointerTarget: () => booster,
    moveTiles: () => undefined,
    activateBooster: () => undefined,
    swipeBooster: (source, target) => swipes.push([source, target]),
  })

  input.onTilePointerDown(ordinary, { pointerId: 8 } as PointerEvent)
  input.onTilePointerUp({ pointerId: 8 } as PointerEvent)

  expect(swipes).toEqual([[booster, ordinary]])
})

test('pointer gesture between ordinary tiles emits a regular move', () => {
  const grid = new TileGrid(2, 1)
  const source = createTile(1, TILE_TYPE.SWEETS_FISH, 0)
  const target = createTile(2, TILE_TYPE.SWEETS_BARBARIS, 1)
  const moves: Array<[Tile, Tile]> = []

  grid.setTile(source, 0, 0)
  grid.setTile(target, 0, 1)

  const input = createMatch3TileInput({
    grid,
    isLocked: () => false,
    areNeighbors: () => true,
    getPointerTarget: () => target,
    moveTiles: (from, to) => moves.push([from, to]),
    activateBooster: () => undefined,
    swipeBooster: () => undefined,
  })

  input.onTilePointerDown(source, { pointerId: 9 } as PointerEvent)
  input.onTilePointerUp({ pointerId: 9 } as PointerEvent)

  expect(moves).toEqual([[source, target]])
})

for (const selectedType of [BOOSTER_TYPE.ROW_FIRECRACKER, TILE_TYPE.SWEETS_BARBARIS]) {
  test(`adjacent click fallback activates a booster when selected type is ${selectedType}`, () => {
    const grid = new TileGrid(2, 1)
    const firecracker = createTile(1, BOOSTER_TYPE.ROW_FIRECRACKER, 0)
    const barbaris = createTile(2, TILE_TYPE.SWEETS_BARBARIS, 1)
    const selected = selectedType === BOOSTER_TYPE.ROW_FIRECRACKER ? firecracker : barbaris
    const clicked = selected === firecracker ? barbaris : firecracker
    const swipes: Array<[Tile, Tile]> = []
    let moves = 0

    grid.setTile(firecracker, 0, 0)
    grid.setTile(barbaris, 0, 1)
    selected.selected = true

    const input = createMatch3TileInput({
      grid,
      isLocked: () => false,
      areNeighbors: () => true,
      getPointerTarget: () => null,
      moveTiles: () => moves++,
      activateBooster: () => undefined,
      swipeBooster: (source, target) => swipes.push([source, target]),
    })

    input.onTileClick(clicked)

    expect(swipes).toEqual([[firecracker, barbaris]])
    expect(moves).toBe(0)
  })
}
