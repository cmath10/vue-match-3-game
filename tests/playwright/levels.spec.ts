import type { FixedTileDefinition, LevelDefinition } from '@/domain/levels/types'

import { expect, test } from '@playwright/test'

import { AttemptRandom } from '@/domain/random'
import { BoosterType } from '@/domain/enums'
import { compileLevel, compileLevelOrThrow } from '@/domain/levels/compiler'
import { getBoosterEffect } from '@/domain/boosters/effects'
import { getGridCells } from '@/presentation/tiles'
import { isBoardCompatibleWithLevel } from '@/domain/levels/restore'
import { materializeInitialBoard } from '@/domain/levels/materializeInitialBoard'
import { resolveGravity } from '@/domain/board/gravity'
import { restoreAttemptRandom } from '@/domain/random'
import { SpecialTileType } from '@/domain/enums'
import TileGrid from '@/game/board/TileGrid'
import { TileType } from '@/domain/enums'

const pool = {
  types: [
    TileType.SweetsBarbaris,
    TileType.SweetsFish,
    TileType.SweetsBird,
  ],
} as const

const createDefinition = (overrides: Partial<LevelDefinition> = {}): LevelDefinition => ({
  id: 1,
  revision: 1,
  initialBoard: {
    layout: [
      'AAA',
      'A.A',
      'AAA',
    ],
    legend: { A: { kind: 'random', pool: 'main' } },
  },
  tilePools: { main: pool },
  gravity: { kind: 'direction', direction: 'down' },
  spawns: [
    { id: 'left', entry: { row: 0, column: 0 }, pool: 'main' },
    { id: 'upper-middle', entry: { row: 0, column: 1 }, pool: 'main' },
    { id: 'lower-middle', entry: { row: 2, column: 1 }, pool: 'main' },
    { id: 'right', entry: { row: 0, column: 2 }, pool: 'main' },
  ],
  collectors: [{
    id: 'mug-exit',
    cell: { row: 2, column: 1 },
    accepts: [SpecialTileType.Mug],
  }],
  objectives: [],
  ...overrides,
})

const serializeBoard = (board: Array<Array<FixedTileDefinition | null>>): string[][] => (
  board.map(row => row.map(tile => tile === null ? '.' : tile.type))
)

test('compiles topology, disconnected vertical segments and external guides', () => {
  const level = compileLevelOrThrow(createDefinition())

  expect(level.topology.bounds).toEqual({ width: 3, height: 3 })
  expect([...level.topology.playableCells]).not.toContain('1:1')
  expect(level.gravity.nodes.get('0:1')).toEqual({ next: null, incoming: [] })
  expect(level.gravity.nodes.get('2:1')).toEqual({ next: null, incoming: [] })
  expect(level.gravity.settlementOrder[0]).toBe('2:0')
  expect(level.edgeGuides).toContainEqual({
    kind: 'collector',
    anchor: { side: 'bottom', column: 1 },
    terminal: { row: 2, column: 1 },
    collectorId: 'mug-exit',
  })
})

test('reports definition paths for unknown tokens and unreachable cells', () => {
  const result = compileLevel(createDefinition({
    initialBoard: {
      layout: ['AB'],
      legend: { A: { kind: 'random', pool: 'missing' } },
    },
    spawns: [],
    collectors: [],
  }))

  expect(result.ok).toBe(false)
  if (result.ok === false) {
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'unknown-layout-token',
      path: ['initialBoard', 'layout', 0, 1],
    }))
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'invalid-tile-pool',
      path: ['initialBoard', 'legend', 'A', 'pool'],
    }))
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'unreachable-cell' }))
  }
})

test('materializes random zones deterministically without initial matches', () => {
  const definition = createDefinition({
    initialBoard: {
      layout: Array.from({ length: 8 }, () => 'AAAAAAAA'),
      legend: { A: { kind: 'random', pool: 'main' } },
    },
    spawns: Array.from({ length: 8 }, (_, column) => ({
      id: `spawn-${column}`,
      entry: { row: 0, column },
      pool: 'main',
    })),
    collectors: [],
  })
  const level = compileLevelOrThrow(definition)
  const first = serializeBoard(materializeInitialBoard(level, new AttemptRandom(42)))
  const second = serializeBoard(materializeInitialBoard(level, new AttemptRandom(42)))

  expect(first).toEqual(second)
  expect(new Set(first.flat())).toEqual(new Set(pool.types))
})

test('restores the exact attempt random sequence', () => {
  const random = new AttemptRandom(2026)

  random.next()
  const snapshot = random.snapshot()
  const expected = [random.next(), random.next(), random.next()]
  const restored = restoreAttemptRandom(snapshot)

  expect([restored.next(), restored.next(), restored.next()]).toEqual(expected)
})

test('vertical gravity treats cells separated by void as independent streams', () => {
  const level = compileLevelOrThrow(createDefinition())
  const resolution = resolveGravity({
    state: {
      topology: level.topology,
      occupancy: [
        ['left', 'upper-middle', 'right'],
        [null, null, 'right-lower'],
        [null, null, 'right-bottom'],
      ],
    },
    graph: level.gravity,
    spawns: [],
    spawnTile: () => 'spawned',
    getTileId: tile => tile,
  })

  expect(resolution.state.occupancy[0][1]).toBe('upper-middle')
  expect(resolution.state.occupancy[2][1]).toBeNull()
  expect(resolution.movements.find(item => item.tileId === 'left')?.path).toEqual([
    { row: 1, column: 0 },
    { row: 2, column: 0 },
  ])
})

test('spatial effects stop at void while topology area can route around it', () => {
  const level = compileLevelOrThrow(createDefinition())
  const row = getBoosterEffect(
    BoosterType.RowFirecracker,
    { row: 1, column: 0 },
    level.topology
  )
  const area = getBoosterEffect(
    BoosterType.AreaKettle,
    { row: 0, column: 1 },
    level.topology
  )

  expect(row.positions).toEqual([{ row: 1, column: 0 }])
  expect(area.positions).not.toContainEqual({ row: 1, column: 1 })
  expect(area.positions).toContainEqual({ row: 1, column: 2 })
})

test('TileGrid rejects writes to void and preserves authored cell coordinates', () => {
  const level = compileLevelOrThrow(createDefinition())
  const grid = new TileGrid(level.topology)

  expect(() => grid.setTile({
    id: 1,
    type: TileType.SweetsFish,
    selected: false,
    row: 1,
    column: 1,
  }, 1, 1)).toThrow('Cannot place a tile in void cell 1:1')
  expect(getGridCells(grid)).toContainEqual({
    key: '2:1',
    style: { gridColumn: 2, gridRow: 3 },
  })
  expect(getGridCells(grid)).toHaveLength(8)
})

test('snapshot board validation rejects tiles in void and wrong bounds', () => {
  const level = compileLevelOrThrow(createDefinition())
  const tile = { type: TileType.SweetsFish }
  const valid: Array<Array<typeof tile | null>> = Array.from(
    { length: 3 },
    () => Array.from({ length: 3 }, (): null => null)
  )

  expect(isBoardCompatibleWithLevel(level, valid)).toBe(true)
  valid[1][1] = tile
  expect(isBoardCompatibleWithLevel(level, valid)).toBe(false)
  expect(isBoardCompatibleWithLevel(level, valid.slice(1))).toBe(false)
})
