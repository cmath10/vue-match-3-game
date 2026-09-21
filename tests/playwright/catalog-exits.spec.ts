import type { BoardBounds, BoardEdgeAnchor } from '@/domain/levels/types'
import type { Position } from '@/domain/types'

import { expect, test } from '@playwright/test'

import { getCatalogLevel } from '@/domain/levels/catalog'
import { getCellKey } from '@/domain/levels/coordinates'
import { getLevelIds } from '@/domain/progress'
import { parseCellKey } from '@/domain/levels/coordinates'
import { SpecialTileType } from '@/domain/enums'

const isOnSide = (cell: Position, bounds: BoardBounds, side: BoardEdgeAnchor['side']): boolean => ({
  top: cell.row === 0,
  bottom: cell.row === bounds.height - 1,
  left: cell.column === 0,
  right: cell.column === bounds.width - 1,
})[side]

for (const levelId of getLevelIds()) {
  test(`level ${levelId} has real exits across every marked outer side`, () => {
    const level = getCatalogLevel(levelId)
    const sides = new Set(level.edgeGuides.map(guide => guide.anchor.side))
    const hasMugs = level.objectives.some(objective => objective.type === SpecialTileType.Mug)

    for (const side of sides) {
      const boundary = [...level.topology.playableCells].filter(key => (
        isOnSide(parseCellKey(key), level.topology.bounds, side)
      ))
      const guideTerminals = level.edgeGuides.filter(guide => guide.anchor.side === side)
        .flatMap(guide => guide.kind === 'collector' ? [guide.terminal] : guide.terminals)
        .map(getCellKey)

      for (const key of boundary) {
        expect(guideTerminals, `${side} cell ${key}`).toContain(key)
        expect(level.gravity.nodes.get(key)?.next, `${side} cell ${key}`).toBeNull()
        if (hasMugs) {
          expect(level.collectors.some(collector => (
            getCellKey(collector.cell) === key && collector.accepts.includes(SpecialTileType.Mug)
          )), `mug exit ${key}`).toBe(true)
        }
      }
    }
  })
}
