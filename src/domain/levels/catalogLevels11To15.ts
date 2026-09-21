import type { LevelDefinition } from '@/domain/levels/types'

import { COOL_ZONE_TYPES } from '@/domain/levels/catalogTileSets'
import {
  createPointTileLayout,
  createPointZones,
} from '@/domain/levels/catalogPointLevelAuthoring'
import { definePointLevel } from '@/domain/levels/catalogLevelFactory'
import { FIVE_TILE_TYPES } from '@/domain/levels/catalogTileSets'
import { SpecialTileType, TileType } from '@/domain/enums'
import { WARM_ZONE_TYPES } from '@/domain/levels/catalogTileSets'

const LEVEL_11_ZONES = [
  'LLLLMRRRR',
  'LLLLMRRRR',
  'LLLLMRRRR',
  'LLLLMRRRR',
  'LLLLMRRRR',
  '.LLLMRRR.',
  '..LLMRR..',
  '...LMR...',
]
const LEVEL_12_ZONES = [
  '..LLLLRRR..',
  '.LLLLLRRRR.',
  'LLLLLLRRRRR',
  'MMMMMMSSSSS',
  'NNNNNNTTTTT',
  '.NNNNNTTTT.',
  '..NNNNTTT..',
]
const LEVEL_13_ZONES = [
  'LLLLXRRRR',
  'LLLLXRRRR',
  'LLLLXRRRR',
  'LL.LXR.RR',
  'LLLLXRRRR',
  '.LLLXRRR.',
  '..LLXRR..',
  '...LXR...',
]
const LEVEL_14_ZONES = [
  '...LMR...',
  '..LLMRR..',
  '.LLLMRRR.',
  'LLLLMRRRR',
  'UUUUBVVVV',
  'UUUUBVVVV',
  '.UUUBVVV.',
  '..UUBVV..',
  '...UBV...',
]
const LEVEL_15_ZONES = [
  'UUU.....VVV',
  'AAAA...DDDD',
  'BBBBB.EEEEE',
  'CCCCC.FFFFF',
  '.CCCCCFFFF.',
  'WWWWW.XXXXX',
  'GGGGG.HHHHH',
  'IIII...JJJJ',
  'KKK.....LLL',
]

const downZones = (layout: readonly string[]) => createPointZones(layout, [
  { id: 'left', token: 'L', target: { side: 'bottom', column: 3 }, tieBreak: ['down', 'right', 'left', 'up'] },
  { id: 'middle', token: 'M', target: { side: 'bottom', column: 4 }, tieBreak: ['down', 'left', 'right', 'up'] },
  { id: 'right', token: 'R', target: { side: 'bottom', column: 5 }, tieBreak: ['down', 'left', 'right', 'up'] },
])

export const CATALOG_LEVELS_11_TO_15: readonly LevelDefinition[] = [
  definePointLevel({
    id: 11,
    layout: createPointTileLayout(LEVEL_11_ZONES, {
      '2:2': 'P', '2:6': 'P', '4:2': 'P', '4:6': 'P',
    }),
    mainTypes: FIVE_TILE_TYPES,
    zones: downZones(LEVEL_11_ZONES),
    objectives: [
      { type: TileType.SweetsFish, count: 20 },
      { type: TileType.SweetsRooster, count: 20 },
      { type: SpecialTileType.Package, count: 4 },
    ],
  }),
  definePointLevel({
    id: 12,
    layout: createPointTileLayout(LEVEL_12_ZONES, {
      '2:2': 'C', '2:8': 'C', '4:2': 'C', '4:8': 'C',
    }),
    mainTypes: FIVE_TILE_TYPES,
    zones: createPointZones(LEVEL_12_ZONES, [
      { id: 'left-upper', token: 'L', target: { side: 'left', row: 2 }, tieBreak: ['left', 'down', 'up', 'right'] },
      { id: 'left-middle', token: 'M', target: { side: 'left', row: 3 }, tieBreak: ['left', 'down', 'up', 'right'] },
      { id: 'left-lower', token: 'N', target: { side: 'left', row: 4 }, tieBreak: ['left', 'up', 'down', 'right'] },
      { id: 'right-upper', token: 'R', target: { side: 'right', row: 2 }, tieBreak: ['right', 'down', 'up', 'left'] },
      { id: 'right-middle', token: 'S', target: { side: 'right', row: 3 }, tieBreak: ['right', 'down', 'up', 'left'] },
      { id: 'right-lower', token: 'T', target: { side: 'right', row: 4 }, tieBreak: ['right', 'up', 'down', 'left'] },
    ]),
    objectives: [
      { type: TileType.SweetsBarbaris, count: 22 },
      { type: TileType.SweetsBird, count: 22 },
      { type: SpecialTileType.Cookie, count: 4 },
    ],
  }),
  definePointLevel({
    id: 13,
    layout: createPointTileLayout(LEVEL_13_ZONES, {
      '1:1': 'M', '1:4': 'M', '1:7': 'M',
    }, { X: 'B' }),
    mainTypes: FIVE_TILE_TYPES,
    zoneTypes: COOL_ZONE_TYPES,
    zones: createPointZones(LEVEL_13_ZONES, [
      { id: 'left', token: 'L', target: { side: 'bottom', column: 3 }, tieBreak: ['down', 'right', 'left', 'up'] },
      { id: 'middle', token: 'X', target: { side: 'bottom', column: 4 }, tieBreak: ['down', 'left', 'right', 'up'] },
      { id: 'right', token: 'R', target: { side: 'bottom', column: 5 }, tieBreak: ['down', 'left', 'right', 'up'] },
    ]),
    objectives: [
      { type: TileType.SweetsFish, count: 24 },
      { type: TileType.SweetsPillow, count: 24 },
      { type: SpecialTileType.Mug, count: 3 },
    ],
  }),
  definePointLevel({
    id: 14,
    layout: createPointTileLayout(LEVEL_14_ZONES, {
      '2:2': 'Q', '2:6': 'Q', '3:1': 'Q', '5:1': 'Q', '5:7': 'Q', '6:6': 'Q',
    }, { B: 'B', U: 'B', V: 'B' }),
    mainTypes: FIVE_TILE_TYPES,
    zoneTypes: WARM_ZONE_TYPES,
    zones: createPointZones(LEVEL_14_ZONES, [
      { id: 'top-left', token: 'L', target: { side: 'top', column: 3 }, tieBreak: ['up', 'left', 'right', 'down'] },
      { id: 'top-middle', token: 'M', target: { side: 'top', column: 4 }, tieBreak: ['up', 'left', 'right', 'down'] },
      { id: 'top-right', token: 'R', target: { side: 'top', column: 5 }, tieBreak: ['up', 'right', 'left', 'down'] },
      { id: 'bottom-left', token: 'U', target: { side: 'bottom', column: 3 }, tieBreak: ['down', 'left', 'right', 'up'] },
      { id: 'bottom-middle', token: 'B', target: { side: 'bottom', column: 4 }, tieBreak: ['down', 'left', 'right', 'up'] },
      { id: 'bottom-right', token: 'V', target: { side: 'bottom', column: 5 }, tieBreak: ['down', 'right', 'left', 'up'] },
    ]),
    objectives: [
      { type: TileType.SweetsBarbaris, count: 24 },
      { type: TileType.SweetsRooster, count: 24 },
      { type: SpecialTileType.Package, count: 6 },
    ],
  }),
  definePointLevel({
    id: 15,
    layout: createPointTileLayout(LEVEL_15_ZONES, {
      '1:1': 'M', '1:9': 'M', '7:1': 'M',
      '2:2': 'C', '2:8': 'C', '6:2': 'C', '6:8': 'C',
      '3:3': 'P', '3:7': 'P', '5:3': 'P', '5:7': 'P',
    }, { D: 'B', E: 'B', F: 'B', H: 'B', J: 'B', L: 'B', V: 'B', X: 'B' }),
    mainTypes: FIVE_TILE_TYPES,
    zoneTypes: COOL_ZONE_TYPES,
    zones: createPointZones(LEVEL_15_ZONES, [
      { id: 'upper-left-1', token: 'U', target: { side: 'left', row: 0 }, tieBreak: ['left', 'down', 'up', 'right'] },
      { id: 'upper-left-2', token: 'A', target: { side: 'left', row: 1 }, tieBreak: ['left', 'down', 'up', 'right'] },
      { id: 'upper-left-3', token: 'B', target: { side: 'left', row: 2 }, tieBreak: ['left', 'down', 'up', 'right'] },
      { id: 'upper-left-4', token: 'C', target: { side: 'left', row: 3 }, tieBreak: ['left', 'up', 'down', 'right'] },
      { id: 'upper-right-1', token: 'V', target: { side: 'right', row: 0 }, tieBreak: ['right', 'down', 'up', 'left'] },
      { id: 'upper-right-2', token: 'D', target: { side: 'right', row: 1 }, tieBreak: ['right', 'down', 'up', 'left'] },
      { id: 'upper-right-3', token: 'E', target: { side: 'right', row: 2 }, tieBreak: ['right', 'down', 'up', 'left'] },
      { id: 'upper-right-4', token: 'F', target: { side: 'right', row: 3 }, tieBreak: ['right', 'up', 'down', 'left'] },
      { id: 'lower-left-1', token: 'W', target: { side: 'left', row: 5 }, tieBreak: ['left', 'up', 'down', 'right'] },
      { id: 'lower-left-2', token: 'G', target: { side: 'left', row: 6 }, tieBreak: ['left', 'up', 'down', 'right'] },
      { id: 'lower-left-3', token: 'I', target: { side: 'left', row: 7 }, tieBreak: ['left', 'up', 'down', 'right'] },
      { id: 'lower-left-4', token: 'K', target: { side: 'left', row: 8 }, tieBreak: ['left', 'up', 'down', 'right'] },
      { id: 'lower-right-1', token: 'X', target: { side: 'right', row: 5 }, tieBreak: ['right', 'up', 'down', 'left'] },
      { id: 'lower-right-2', token: 'H', target: { side: 'right', row: 6 }, tieBreak: ['right', 'up', 'down', 'left'] },
      { id: 'lower-right-3', token: 'J', target: { side: 'right', row: 7 }, tieBreak: ['right', 'up', 'down', 'left'] },
      { id: 'lower-right-4', token: 'L', target: { side: 'right', row: 8 }, tieBreak: ['right', 'up', 'down', 'left'] },
    ]),
    objectives: [
      { type: TileType.SweetsBird, count: 24 },
      { type: SpecialTileType.Mug, count: 3 },
      { type: SpecialTileType.Cookie, count: 4 },
      { type: SpecialTileType.Package, count: 4 },
    ],
  }),
]
