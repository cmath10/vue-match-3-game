export enum TILE_TYPE {
  SWEETS_BARBARIS = 'sweets-barbaris',
  SWEETS_COOKIE = 'sweets-cookie',
  SWEETS_LOLLIPOP = 'sweets-lollipop',
  SWEETS_PILLOW = 'sweets-pillow',
  SWEETS_SOUFFLE = 'sweets-souffle',
}

export enum SPECIAL_TILE_TYPE {
  MUG = 'special-mug',
  PACKAGE = 'special-package',
  COOKIE = 'special-cookie',
}

export type BoardTileType = TILE_TYPE | SPECIAL_TILE_TYPE.MUG | SPECIAL_TILE_TYPE.COOKIE
export type ObjectiveType = TILE_TYPE | SPECIAL_TILE_TYPE
