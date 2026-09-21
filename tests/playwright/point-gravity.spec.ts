import type { BoardTopology, Direction } from '@/domain/levels/types'

import { expect, test } from '@playwright/test'

import { compileLevel } from '@/domain/levels/compiler'
import { createCatalogLevelDefinition } from '@/domain/levels/catalog'
import { createGravityState } from '@/domain/levels/gravityState'
import { getCatalogLevel } from '@/domain/levels/catalog'
import { getPointGravityNeighbors } from '@/domain/levels/pointGravityNeighbors'
import { getTileMovementSegments } from '@/presentation/tileMovementSegments'
import { parseCellKey } from '@/domain/levels/coordinates'
import { resolveGravity } from '@/domain/board/gravity'

test('level 11 drains its slope diagonally instead of alternating horizontal and vertical steps', () => {
  const level = getCatalogLevel(11)
  const occupancy: Array<Array<string | null>> = Array.from(
    { length: level.topology.bounds.height },
    () => Array.from({ length: level.topology.bounds.width }, (): null => null)
  )

  occupancy[4][0] = 'sliding-tile'
  const resolution = resolveGravity({
    state: { topology: level.topology, occupancy },
    graph: level.gravity,
    gravityState: createGravityState(),
    spawns: [],
    spawnTile: () => 'unused',
    getTileId: tile => tile,
  })
  const movement = resolution.movements.find(item => item.tileId === 'sliding-tile')!

  expect(movement.path).toEqual([
    { row: 5, column: 1 },
    { row: 6, column: 2 },
    { row: 7, column: 3 },
  ])
  expect(getTileMovementSegments({ row: 4, column: 0 }, movement.path)).toEqual([
    { position: { row: 7, column: 3 }, steps: 3 },
  ])
})

test('diagonal gravity cannot jump across two void cells at a closed corner', () => {
  const topology: BoardTopology = {
    bounds: { width: 2, height: 2 },
    playableCells: new Set(['0:0', '1:1']),
  }

  expect(getPointGravityNeighbors(topology, { row: 0, column: 0 })).toEqual([])
  expect(getPointGravityNeighbors({
    ...topology,
    playableCells: new Set(['0:0', '0:1', '1:1']),
  }, { row: 0, column: 0 })).toContain('1:1')
})

test('point gravity reports an invalid direction without throwing during graph construction', () => {
  const definition = structuredClone(createCatalogLevelDefinition(11))

  if (definition.gravity.kind !== 'point') {
    throw new Error('Expected point gravity')
  }
  definition.gravity.zones[0].tieBreak = ['down', 'up', 'left', 'diagonal' as Direction]
  const result = compileLevel(definition)

  expect(result.ok).toBe(false)
  if (result.ok === false) {
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: 'invalid-gravity-edge',
      path: ['gravity', 'zones', 0, 'tieBreak'],
    }))
  }
})

test('catalog point gravity stays inside its zone and never moves away from the marked side', () => {
  for (const levelId of [11, 12, 13, 14, 15]) {
    const level = getCatalogLevel(levelId)
    const definition = createCatalogLevelDefinition(levelId)

    if (definition.gravity.kind !== 'point') {
      throw new Error('Expected point gravity')
    }
    for (const zone of definition.gravity.zones) {
      const flowingCells = zone.cells.filter(key => level.gravity.nodes.get(key)!.next !== null)

      for (const key of flowingCells) {
        const next = level.gravity.nodes.get(key)!.next!

        expect(zone.cells).toContain(next)
        const source = parseCellKey(key)
        const target = parseCellKey(next)
        const progress = {
          bottom: target.row - source.row,
          top: source.row - target.row,
          left: source.column - target.column,
          right: target.column - source.column,
        }

        expect(progress[zone.target.side], `Level ${levelId}: ${key} -> ${next}`)
          .toBeGreaterThanOrEqual(0)
      }
    }
  }
})
