import type { BoardEdgeAnchor } from '@/domain/levels/types'
import type { CatalogPointZoneDefinition } from '@/domain/levels/catalogLevelFactory'
import type { CellKey, Direction } from '@/domain/levels/types'
import type { Position } from '@/domain/types'

import { getCellKey } from '@/domain/levels/coordinates'

export type CatalogPointZoneAuthoring = {
  id: string
  token: string
  target: BoardEdgeAnchor
  tieBreak: readonly Direction[]
}

const getTokenCells = (layout: readonly string[], token: string): Position[] => layout.flatMap(
  (line, row) => Array.from(line).flatMap((value, column) => (
    value === token ? [{ row, column }] : []
  ))
)

export const createPointZones = (
  layout: readonly string[],
  zones: readonly CatalogPointZoneAuthoring[]
): CatalogPointZoneDefinition[] => zones.map(zone => ({
  id: zone.id,
  cells: getTokenCells(layout, zone.token),
  target: zone.target,
  tieBreak: zone.tieBreak,
}))

export const createPointTileLayout = (
  zoneLayout: readonly string[],
  replacements: Readonly<Partial<Record<CellKey, string>>>,
  tileTokenByZone: Readonly<Record<string, string>> = {}
): string[] => zoneLayout.map((line, row) => Array.from(line).map((zoneToken, column) => {
  if (zoneToken === '.') {
    return '.'
  }
  return replacements[getCellKey({ row, column })] ?? tileTokenByZone[zoneToken] ?? 'A'
}).join(''))
