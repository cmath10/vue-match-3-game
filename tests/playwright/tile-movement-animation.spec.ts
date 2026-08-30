import type { Position, TileMovement } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { getTileStyle } from '@/presentation/tiles'
import { TileType } from '@/domain/enums'
import { useTileMovementAnimation } from '@/composables/useTileMovementAnimation'

const movement = (
  phase: number,
  origin: TileMovement['origin'],
  path: TileMovement['path']
): TileMovement => ({ tileId: '1', origin, path, phase, resolutionOrder: phase })

test('straight gravity path uses one uninterrupted transition', async () => {
  const tile = { id: 1, type: TileType.SweetsFish, selected: false, row: 3, column: 0 }
  const positions: Position[] = []
  const durations: number[] = []
  const animation = useTileMovementAnimation({
    duration: 480,
    getSpawnOrigin: () => ({ row: -1, column: 0 }),
    getTile: () => tile,
    nextFrame: async () => undefined,
    wait: async (duration) => {
      durations.push(duration)
      positions.push({ row: tile.row, column: tile.column })
    },
  })

  await animation.animate([
    movement(0, { kind: 'cell', position: { row: 0, column: 0 } }, [
      { row: 1, column: 0 },
      { row: 2, column: 0 },
      { row: 3, column: 0 },
    ]),
  ])

  expect(positions).toEqual([{ row: 3, column: 0 }])
  expect(durations).toEqual([480])
})

test('movement animation preserves path turns and keeps phases sequential', async () => {
  const tile = { id: 1, type: TileType.SweetsFish, selected: false, row: 9, column: 9 }
  const positions: Position[] = []
  const durations: number[] = []
  const animation = useTileMovementAnimation({
    duration: 480,
    getSpawnOrigin: () => ({ row: -1, column: 0 }),
    getTile: () => tile,
    nextFrame: async () => { positions.push({ row: tile.row, column: tile.column }) },
    wait: async (duration) => {
      durations.push(duration)
      positions.push({ row: tile.row, column: tile.column })
    },
  })

  await animation.animate([
    movement(0, { kind: 'spawn', spawnId: 'top' }, [{ row: 0, column: 0 }]),
    movement(1, { kind: 'cell', position: { row: 0, column: 0 } }, [
      { row: 0, column: 1 },
      { row: 1, column: 1 },
    ]),
  ])

  expect(positions).toEqual([
    { row: -1, column: 0 },
    { row: -1, column: 0 },
    { row: 0, column: 0 },
    { row: 0, column: 1 },
    { row: 1, column: 1 },
  ])
  expect(durations).toEqual([480, 240, 240])
  expect(animation.durations.size).toBe(0)
  expect(getTileStyle(tile, 240)['--tile-movement-duration']).toBe('240ms')
})

test('cancel prevents later movement phases from restoring obsolete animation state', async () => {
  const tile = { id: 1, type: TileType.SweetsFish, selected: false, row: 0, column: 0 }
  let finishSegment: () => void = () => undefined
  const animation = useTileMovementAnimation({
    duration: 480,
    getSpawnOrigin: () => ({ row: -1, column: 0 }),
    getTile: () => tile,
    nextFrame: async () => undefined,
    wait: () => new Promise<void>((resolve) => { finishSegment = resolve }),
  })
  const pending = animation.animate([
    movement(0, { kind: 'cell', position: { row: 0, column: 0 } }, [{ row: 1, column: 0 }]),
    movement(1, { kind: 'cell', position: { row: 1, column: 0 } }, [{ row: 2, column: 0 }]),
  ])

  await Promise.resolve()
  await Promise.resolve()
  animation.cancel()
  finishSegment()
  await pending

  expect(tile.row).toBe(1)
  expect(animation.durations.size).toBe(0)
})
