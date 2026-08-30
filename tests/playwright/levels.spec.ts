import type { FixedTileDefinition, LevelDefinition } from '@/domain/levels/types'

import { expect, test } from '@playwright/test'

import { AttemptRandom } from '@/domain/random'
import { BoosterType } from '@/domain/enums'
import { compileLevel, compileLevelOrThrow } from '@/domain/levels/compiler'
import { createGravityState } from '@/domain/levels/gravityState'
import { getBoosterEffect } from '@/domain/boosters/effects'
import { getGridCells } from '@/presentation/tiles'
import { isBoardCompatibleWithLevel } from '@/domain/levels/restore'
import { materializeInitialBoard } from '@/domain/levels/materializeInitialBoard'
import { resolveGravity } from '@/domain/board/gravity'
import { restoreAttemptRandom } from '@/domain/random'
import { restoreGravityState, snapshotGravityState } from '@/domain/levels/gravityState'
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
    gravityState: createGravityState(),
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

test('point gravity routes deterministically around void using tieBreak', () => {
  const level = compileLevelOrThrow(createDefinition({
    gravity: {
      kind: 'point',
      target: { side: 'bottom', column: 1 },
      tieBreak: ['right', 'down', 'left', 'up'],
    },
    spawns: [
      { id: 'upper-left', entry: { row: 0, column: 0 }, pool: 'main' },
      { id: 'upper-middle', entry: { row: 0, column: 1 }, pool: 'main' },
    ],
  }))

  expect(level.gravity.nodes.get('0:1')?.next).toBe('0:2')
  expect(level.gravity.nodes.get('0:2')?.next).toBe('1:2')
  expect(level.gravity.nodes.get('1:2')?.next).toBe('2:2')
  expect(level.gravity.nodes.get('2:2')?.next).toBe('2:1')
  expect(level.edgeGuides).toContainEqual({
    kind: 'collector',
    anchor: { side: 'bottom', column: 1 },
    terminal: { row: 2, column: 1 },
    collectorId: 'mug-exit',
  })
})

const createConvergingDefinition = (): LevelDefinition => createDefinition({
  initialBoard: {
    layout: ['A.A', 'AAA', '.A.'],
    legend: { A: { kind: 'random', pool: 'main' } },
  },
  gravity: {
    kind: 'flow',
    nextByCell: {
      '0:0': '1:0',
      '0:2': '1:2',
      '1:0': '1:1',
      '1:1': '2:1',
      '1:2': '1:1',
      '2:1': null,
    },
    edgeTargets: [{ anchor: { side: 'bottom', column: 1 }, terminals: ['2:1'] }],
  },
  spawns: [
    { id: 'left', entry: { row: 0, column: 0 }, pool: 'main' },
    { id: 'right', entry: { row: 0, column: 2 }, pool: 'main' },
  ],
})

test('flow gravity returns an indirect path and preserves round-robin cursor', () => {
  const level = compileLevelOrThrow(createConvergingDefinition())
  const gravityState = createGravityState()
  const first = resolveGravity({
    state: {
      topology: level.topology,
      occupancy: [['left', null, null], [null, null, null], [null, null, null]],
    },
    graph: level.gravity,
    gravityState,
    spawns: [],
    spawnTile: () => 'spawned',
    getTileId: tile => tile,
  })

  expect(first.movements[0]).toEqual(expect.objectContaining({
    tileId: 'left',
    path: [
      { row: 1, column: 0 },
      { row: 1, column: 1 },
      { row: 2, column: 1 },
    ],
  }))
  expect(gravityState.nextIncomingIndexByCell.get('1:1')).toBe(1)

  const restored = restoreGravityState(snapshotGravityState(gravityState), level.gravity)
  const second = resolveGravity({
    state: {
      topology: level.topology,
      occupancy: [[null, null, 'right'], [null, null, null], [null, null, null]],
    },
    graph: level.gravity,
    gravityState: restored,
    spawns: [],
    spawnTile: () => 'spawned',
    getTileId: tile => tile,
  })

  expect(second.movements[0].tileId).toBe('right')
  expect(restored.nextIncomingIndexByCell.get('1:1')).toBe(0)
})

test('flow gravity rejects cycles and unbound terminal cells', () => {
  const cycle = compileLevel(createDefinition({
    initialBoard: {
      layout: ['AA'],
      legend: { A: { kind: 'random', pool: 'main' } },
    },
    gravity: {
      kind: 'flow',
      nextByCell: { '0:0': '0:1', '0:1': '0:0' },
      edgeTargets: [],
    },
    spawns: [{ id: 'left', entry: { row: 0, column: 0 }, pool: 'main' }],
    collectors: [],
  }))

  const unbound = compileLevel(createDefinition({
    initialBoard: {
      layout: ['A'],
      legend: { A: { kind: 'random', pool: 'main' } },
    },
    gravity: { kind: 'flow', nextByCell: { '0:0': null }, edgeTargets: [] },
    spawns: [{ id: 'only', entry: { row: 0, column: 0 }, pool: 'main' }],
    collectors: [],
  }))

  expect(cycle.ok).toBe(false)
  expect(unbound.ok).toBe(false)
  if (cycle.ok === false && unbound.ok === false) {
    expect(cycle.errors).toContainEqual(expect.objectContaining({ code: 'gravity-cycle' }))
    expect(unbound.errors).toContainEqual(expect.objectContaining({ code: 'invalid-edge-target' }))
  }
})

test('point gravity requires a complete tieBreak and restore validates merge cursors', () => {
  const invalidPoint = compileLevel(createDefinition({
    gravity: {
      kind: 'point',
      target: { side: 'bottom', column: 1 },
      tieBreak: ['left', 'right'],
    },
    spawns: [
      { id: 'upper-left', entry: { row: 0, column: 0 }, pool: 'main' },
      { id: 'upper-middle', entry: { row: 0, column: 1 }, pool: 'main' },
    ],
  }))
  const flow = compileLevelOrThrow(createConvergingDefinition())

  expect(invalidPoint.ok).toBe(false)
  expect(() => restoreGravityState({
    nextIncomingIndexByCell: { '1:1': 2 },
  }, flow.gravity)).toThrow('Invalid gravity cursor at 1:1')
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
