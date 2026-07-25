import type { Tile } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { BoosterType } from '@/domain/enums'
import { createMatch3TileInput } from '@/input/tileInput'
import TileGrid from '@/game/board/TileGrid'
import { TileType } from '@/domain/enums'

const createTile = (id: number, type: Tile['type'], column: number): Tile => ({
  id,
  type,
  selected: false,
  row: 0,
  column,
})

test('pointer gesture emits one booster swipe and suppresses its trailing click', () => {
  const grid = new TileGrid(2, 1)
  const booster = createTile(1, BoosterType.ButtonBox, 0)
  const ordinary = createTile(2, TileType.SweetsFish, 1)
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
  const ordinary = createTile(1, TileType.SweetsFish, 0)
  const booster = createTile(2, BoosterType.AreaKettle, 1)
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
  const source = createTile(1, TileType.SweetsFish, 0)
  const target = createTile(2, TileType.SweetsBarbaris, 1)
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

for (const selectedType of [BoosterType.RowFirecracker, TileType.SweetsBarbaris]) {
  test(`adjacent click fallback activates a booster when selected type is ${selectedType}`, () => {
    const grid = new TileGrid(2, 1)
    const firecracker = createTile(1, BoosterType.RowFirecracker, 0)
    const barbaris = createTile(2, TileType.SweetsBarbaris, 1)
    const selected = selectedType === BoosterType.RowFirecracker ? firecracker : barbaris
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
