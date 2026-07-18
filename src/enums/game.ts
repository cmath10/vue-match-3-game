export enum TILE_TYPE {
  SWEETS_BARBARIS = 'sweets-barbaris',
  SWEETS_FISH = 'sweets-fish',
  SWEETS_ROOSTER = 'sweets-rooster',
  SWEETS_PILLOW = 'sweets-pillow',
  SWEETS_BIRD = 'sweets-bird',
}

export enum SPECIAL_TILE_TYPE {
  MUG = 'special-mug',
  PACKAGE = 'special-package',
  COOKIE = 'special-cookie',
}

export enum BOOSTER_TYPE {
  ROW_FIRECRACKER = 'booster-row-firecracker',
  COLUMN_FIRECRACKER = 'booster-column-firecracker',
  AREA_KETTLE = 'booster-area-kettle',
  BUTTON_BOX = 'booster-button-box',
}

export type BoardTileType = TILE_TYPE | SPECIAL_TILE_TYPE.MUG | SPECIAL_TILE_TYPE.COOKIE | BOOSTER_TYPE
export type ObjectiveType = TILE_TYPE | SPECIAL_TILE_TYPE
export type TileVisualType = ObjectiveType | BOOSTER_TYPE
