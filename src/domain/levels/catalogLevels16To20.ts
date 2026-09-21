import type { LevelDefinition } from '@/domain/levels/types'

import { COOL_ZONE_TYPES } from '@/domain/levels/catalogTileSets'
import {
  createDirectionalFlow,
  createOutwardColumnFlow,
  createOutwardRowFlow,
} from '@/domain/levels/catalogFlowDefinitions'
import { defineFlowLevel } from '@/domain/levels/catalogLevelFactory'
import { FIVE_TILE_TYPES } from '@/domain/levels/catalogTileSets'
import { rectangle } from '@/domain/levels/catalogLevelFactory'
import { SpecialTileType, TileType } from '@/domain/enums'
import { WARM_ZONE_TYPES } from '@/domain/levels/catalogTileSets'

const LEVEL_17_LAYOUT = [
  '...AAA...',
  '..AAAAA..',
  '.AACACAA.',
  'AAAAAAAAA',
  'AAAAAAAAA',
  'AAAAAAAAA',
  '.AACACAA.',
  '..AAAAA..',
  '...AAA...',
]

export const CATALOG_LEVELS_16_TO_20: readonly LevelDefinition[] = [
  defineFlowLevel({
    id: 16,
    layout: [
      'AAAAAAAAA',
      'AAAAAAAAA',
      'AAPAAAPAA',
      'AAAAAAAAA',
      'AAAAAAAAA',
      'AAPAAAPAA',
      'AAAAAAAAA',
      'AAAAAAAAA',
    ],
    mainTypes: FIVE_TILE_TYPES,
    zoneTypes: COOL_ZONE_TYPES,
    gravity: createDirectionalFlow(rectangle(9, 8), 'down'),
    objectives: [
      { type: TileType.SweetsBarbaris, count: 22 },
      { type: TileType.SweetsFish, count: 22 },
      { type: TileType.SweetsBird, count: 22 },
      { type: SpecialTileType.Package, count: 4 },
    ],
  }),
  defineFlowLevel({
    id: 17,
    layout: LEVEL_17_LAYOUT,
    mainTypes: FIVE_TILE_TYPES,
    gravity: createDirectionalFlow(LEVEL_17_LAYOUT, 'down'),
    objectives: [
      { type: TileType.SweetsBarbaris, count: 22 },
      { type: TileType.SweetsRooster, count: 22 },
      { type: TileType.SweetsPillow, count: 22 },
      { type: SpecialTileType.Cookie, count: 4 },
    ],
  }),
  defineFlowLevel({
    id: 18,
    layout: [
      'AAAAAAAA',
      'AAPAAAPA',
      'AAAAAAAA',
      'AAPAAAPA',
      'AAAAAAAA',
      'AAPAAAPA',
      'AAAAAAAA',
      'AAAAAAAA',
    ],
    mainTypes: FIVE_TILE_TYPES,
    gravity: createOutwardRowFlow(8, 8, 4),
    objectives: [
      { type: TileType.SweetsFish, count: 24 },
      { type: TileType.SweetsRooster, count: 24 },
      { type: TileType.SweetsBird, count: 24 },
      { type: SpecialTileType.Package, count: 6 },
    ],
  }),
  defineFlowLevel({
    id: 19,
    layout: [
      'AAAAMAAAA',
      'AACAAACAA',
      'AAAAAAAAA',
      'MAAAAAAAM',
      'AAAAAAAAA',
      'AACAAACAA',
      'AAAAMAAAA',
      'AAAAAAAAA',
      'AAAAAAAAA',
    ],
    mainTypes: FIVE_TILE_TYPES,
    zoneTypes: WARM_ZONE_TYPES,
    gravity: createDirectionalFlow(rectangle(9, 9), 'down'),
    objectives: [
      { type: TileType.SweetsBarbaris, count: 24 },
      { type: TileType.SweetsPillow, count: 24 },
      { type: SpecialTileType.Mug, count: 4 },
      { type: SpecialTileType.Cookie, count: 4 },
    ],
  }),
  defineFlowLevel({
    id: 20,
    layout: [
      'AAAAMAAAA',
      'AAPAAAPAA',
      'AACAAACAA',
      'AAAAAAAAA',
      'MAAPAPAMM',
      'AAAAAAAAA',
      'AACAAACAA',
      'AAPAAAPAA',
      'AAAAAAAAA',
    ],
    mainTypes: FIVE_TILE_TYPES,
    zoneTypes: COOL_ZONE_TYPES,
    gravity: createOutwardColumnFlow(9, 9, 4),
    objectives: [
      { type: TileType.SweetsRooster, count: 25 },
      { type: SpecialTileType.Mug, count: 4 },
      { type: SpecialTileType.Cookie, count: 4 },
      { type: SpecialTileType.Package, count: 6 },
    ],
  }),
]
