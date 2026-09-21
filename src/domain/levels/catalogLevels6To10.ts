import type { LevelDefinition } from '@/domain/levels/types'

import { defineDirectionalLevel } from '@/domain/levels/catalogLevelFactory'
import { FIVE_TILE_TYPES, FOUR_TILE_TYPES } from '@/domain/levels/catalogTileSets'
import { SpecialTileType, TileType } from '@/domain/enums'

export const CATALOG_LEVELS_6_TO_10: readonly LevelDefinition[] = [
  defineDirectionalLevel({
    id: 6,
    layout: [
      'AAMAAAMA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
    ],
    mainTypes: FOUR_TILE_TYPES,
    direction: 'down',
    objectives: [
      { type: TileType.SweetsFish, count: 18 },
      { type: TileType.SweetsBird, count: 18 },
      { type: SpecialTileType.Mug, count: 2 },
    ],
  }),
  defineDirectionalLevel({
    id: 7,
    layout: [
      'AAAAAAAA',
      'AACAAACA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AACAAACA',
      'AAAAAAAA',
      'AAAAAAAA',
    ],
    mainTypes: FOUR_TILE_TYPES,
    direction: 'down',
    objectives: [
      { type: TileType.SweetsBarbaris, count: 20 },
      { type: TileType.SweetsPillow, count: 20 },
      { type: SpecialTileType.Cookie, count: 4 },
    ],
  }),
  defineDirectionalLevel({
    id: 8,
    layout: [
      'AAAAAAAA',
      'AAAAAAAA',
      'AAPAAAQA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AQAAAPAA',
      'AAAAAAAA',
      'AAAAAAAA',
    ],
    mainTypes: FIVE_TILE_TYPES,
    direction: 'left',
    objectives: [
      { type: TileType.SweetsRooster, count: 18 },
      { type: TileType.SweetsFish, count: 18 },
      { type: SpecialTileType.Package, count: 4 },
    ],
  }),
  defineDirectionalLevel({
    id: 9,
    layout: [
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AAAAAAAA',
      'AMAAAAMA',
      'AAAAMAAA',
    ],
    mainTypes: FIVE_TILE_TYPES,
    direction: 'up',
    objectives: [
      { type: TileType.SweetsBird, count: 20 },
      { type: TileType.SweetsPillow, count: 20 },
      { type: SpecialTileType.Mug, count: 3 },
    ],
  }),
  defineDirectionalLevel({
    id: 10,
    layout: [
      '.AAAAAA.',
      'AAAAAAAA',
      'AACAAAAA',
      'AAAAAAAA',
      'AAAAACAA',
      'AAAAAAAA',
      'AAACAAAA',
      '.AAAAAA.',
    ],
    mainTypes: FIVE_TILE_TYPES,
    direction: 'right',
    objectives: [
      { type: TileType.SweetsBarbaris, count: 20 },
      { type: TileType.SweetsRooster, count: 20 },
      { type: SpecialTileType.Cookie, count: 3 },
    ],
  }),
]
