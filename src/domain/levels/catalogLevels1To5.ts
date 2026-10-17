import type { LevelDefinition } from '@/domain/levels/types'

import { defineDirectionalLevel } from '@/domain/levels/catalogLevelFactory'
import { FOUR_TILE_TYPES } from '@/domain/levels/catalogTileSets'
import { rectangle } from '@/domain/levels/catalogLevelFactory'
import { SpecialTileType } from '@/domain/enums'
import { THREE_TILE_TYPES } from '@/domain/levels/catalogTileSets'
import { TileType } from '@/domain/enums'

export const CATALOG_LEVELS_1_TO_5: readonly LevelDefinition[] = [
  defineDirectionalLevel({
    id: 1,
    layout: rectangle(7, 5),
    mainTypes: THREE_TILE_TYPES,
    direction: 'down',
    objectives: [
      { type: TileType.SweetsFish, count: 15 },
      { type: TileType.SweetsPillow, count: 15 },
    ],
  }),
  defineDirectionalLevel({
    id: 2,
    layout: [
      'AAAAAAA',
      'AAAAAAA',
      'AAPAPAA',
      'AAAAAAA',
      'AAAAAAA',
      'AAAAAAA',
      'AAAAAAA',
    ],
    mainTypes: THREE_TILE_TYPES,
    direction: 'down',
    objectives: [
      { type: TileType.SweetsBird, count: 18 },
      { type: TileType.SweetsFish, count: 18 },
    ],
  }),
  defineDirectionalLevel({
    id: 3,
    layout: [
      'AAAAAAAA',
      'AAAAAAAA',
      'AAPAAAPA',
      'AAAAAAAA',
      'AAPAAAPA',
      'AAAAAAAA',
      'AAAAAAAA',
    ],
    mainTypes: FOUR_TILE_TYPES,
    direction: 'down',
    objectives: [
      { type: TileType.SweetsBarbaris, count: 20 },
      { type: SpecialTileType.Package, count: 4 },
    ],
  }),
  defineDirectionalLevel({
    id: 4,
    layout: [
      '.AAAAAA.',
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
      '.AAAAAA.',
    ],
    mainTypes: FOUR_TILE_TYPES,
    direction: 'down',
    objectives: [
      { type: TileType.SweetsPillow, count: 20 },
      { type: TileType.SweetsBird, count: 20 },
    ],
  }),
  defineDirectionalLevel({
    id: 5,
    layout: [
      'AABBBBAA',
      'AABBBBAA',
      'AAPBBPAA',
      'AAA..AAA',
      'AAA..AAA',
      'AAPBBPAA',
      'AABBBBAA',
      'AABBBBAA',
    ],
    mainTypes: FOUR_TILE_TYPES,
    zoneTypes: THREE_TILE_TYPES,
    direction: 'down',
    objectives: [
      { type: TileType.SweetsFish, count: 18 },
      { type: TileType.SweetsPillow, count: 18 },
      { type: SpecialTileType.Package, count: 4 },
    ],
  }),
]
