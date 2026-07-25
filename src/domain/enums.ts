export enum TileType {
  SweetsBarbaris = 'sweets-barbaris',
  SweetsFish = 'sweets-fish',
  SweetsRooster = 'sweets-rooster',
  SweetsPillow = 'sweets-pillow',
  SweetsBird = 'sweets-bird',
}

export enum SpecialTileType {
  Mug = 'special-mug',
  Package = 'special-package',
  Cookie = 'special-cookie',
}

export enum BoosterType {
  RowFirecracker = 'booster-row-firecracker',
  ColumnFirecracker = 'booster-column-firecracker',
  AreaKettle = 'booster-area-kettle',
  ButtonBox = 'booster-button-box',
}

export type BoardTileType =
  | TileType
  | SpecialTileType.Mug
  | SpecialTileType.Cookie
  | BoosterType

export type ObjectiveType = TileType | SpecialTileType
export type TileVisualType = ObjectiveType | BoosterType
