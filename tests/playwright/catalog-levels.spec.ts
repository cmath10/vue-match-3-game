import type { BoardEdgeGuide, FixedTileDefinition } from '@/domain/levels/types'
import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { AttemptRandom } from '@/domain/random'
import {
  CATALOG_LEVEL_COUNT,
  createCatalogLevelDefinition,
} from '@/domain/levels/catalog'
import { createPlayerState } from '@/domain/progress'
import { getBoardSurface } from '@/presentation/boardSurface'
import { getCatalogLevel } from '@/domain/levels/catalog'
import { getLevelIds } from '@/domain/progress'
import { materializeInitialBoard } from '@/domain/levels/materializeInitialBoard'
import { SpecialTileType } from '@/domain/enums'

import {
  findValidMove,
  getTiles,
  makeMove,
  seedMathRandom,
} from './helpers/game-board'
import { seedPlayerState } from './helpers/player-state'

const openUnlockedLevel = async (page: Page, levelId: number): Promise<void> => {
  await seedMathRandom(page, levelId)
  const state = createPlayerState()

  state.highestUnlockedLevel = levelId
  await seedPlayerState(page, state)
  await page.goto(`/game/${levelId}`)
}

const getSpecialCounts = (
  board: Array<Array<FixedTileDefinition | null>>
): Map<SpecialTileType, number> => {
  const counts = new Map<SpecialTileType, number>()

  board.flat().forEach((tile) => {
    const type = tile?.kind === 'special'
      ? tile.type
      : tile?.kind === 'ordinary' ? tile.blocker?.type : undefined

    if (type !== undefined) {
      counts.set(type, (counts.get(type) ?? 0) + 1)
    }
  })
  return counts
}

const serializeBoard = (board: Array<Array<FixedTileDefinition | null>>): string => (
  board.map(row => row.map(tile => tile?.type ?? '.').join(',')).join('|')
)

type LayoutBox = { x: number; y: number; width: number; height: number }

const expectGuideNextToTerminal = (
  side: BoardEdgeGuide['anchor']['side'],
  guide: LayoutBox,
  terminal: LayoutBox
): void => {
  const horizontal = side === 'bottom' || side === 'top'
  const crossAxisDistance = horizontal
    ? Math.abs(guide.x + guide.width / 2 - terminal.x - terminal.width / 2)
    : Math.abs(guide.y + guide.height / 2 - terminal.y - terminal.height / 2)
  const gap = {
    bottom: guide.y - terminal.y - terminal.height,
    left: terminal.x - guide.x - guide.width,
    right: guide.x - terminal.x - terminal.width,
    top: terminal.y - guide.y - guide.height,
  }[side]

  expect(crossAxisDistance).toBeLessThan(1.5)
  expect(gap).toBeGreaterThan(0)
  expect(gap).toBeLessThan((horizontal ? terminal.height : terminal.width) / 2)
}

test('catalog contains twenty deterministic level definitions', () => {
  expect(CATALOG_LEVEL_COUNT).toBe(20)
  expect(getLevelIds()).toEqual(Array.from({ length: 20 }, (_, index) => index + 1))

  getLevelIds().forEach((levelId) => {
    const first = createCatalogLevelDefinition(levelId)
    const second = createCatalogLevelDefinition(levelId)

    expect(first).toEqual(second)
    expect(first.id).toBe(levelId)
  })
})

test('catalog difficulty progresses through objective and gravity tiers', () => {
  const definitions = getLevelIds().map(createCatalogLevelDefinition)

  expect(definitions.map(level => level.gravity.kind)).toEqual([
    ...Array.from({ length: 10 }, () => 'direction'),
    ...Array.from({ length: 5 }, () => 'point'),
    ...Array.from({ length: 5 }, () => 'flow'),
  ])
  expect(definitions.map(level => level.objectives.length)).toEqual([
    2, 2, 2, 2, 3,
    3, 3, 3, 3, 3,
    3, 3, 3, 3, 4,
    4, 4, 4, 4, 4,
  ])
})

test('point levels use continuous zones and place targets on different board sides', () => {
  const pointLevels = getLevelIds().slice(10, 15).map(createCatalogLevelDefinition)
  const targets = pointLevels.flatMap(level => level.gravity.kind === 'point'
    ? level.gravity.zones.map(zone => zone.target.side)
    : [])

  pointLevels.forEach((level) => {
    expect(level.gravity.kind).toBe('point')
    if (level.gravity.kind === 'point') {
      expect(level.gravity.zones.length).toBeGreaterThan(1)
      expect(new Set(level.gravity.zones.flatMap(zone => zone.cells)).size)
        .toBe(level.gravity.zones.flatMap(zone => zone.cells).length)
    }
  })
  expect(new Set(targets)).toEqual(new Set(['bottom', 'left', 'right', 'top']))
})

test('wide gravity exits use multiple neighboring boundary anchors', () => {
  const anchorKeys = (levelId: number) => getCatalogLevel(levelId).edgeGuides.map((guide) => {
    const offset = 'column' in guide.anchor ? guide.anchor.column : guide.anchor.row

    return `${guide.anchor.side}:${offset}`
  })

  expect(anchorKeys(11)).toEqual(['bottom:3', 'bottom:4', 'bottom:5'])
  expect(anchorKeys(12)).toEqual([
    'left:2', 'left:3', 'left:4',
    'right:2', 'right:3', 'right:4',
  ])
  expect(anchorKeys(13)).toEqual(['bottom:3', 'bottom:4', 'bottom:5'])
  expect(anchorKeys(14)).toEqual([
    'top:3', 'top:4', 'top:5',
    'bottom:3', 'bottom:4', 'bottom:5',
  ])
  expect(anchorKeys(15)).toEqual([
    'left:0', 'left:1', 'left:2', 'left:3',
    'right:0', 'right:1', 'right:2', 'right:3',
    'left:5', 'left:6', 'left:7', 'left:8',
    'right:5', 'right:6', 'right:7', 'right:8',
  ])
  expect(anchorKeys(16)).toEqual(Array.from({ length: 9 }, (_, column) => `bottom:${column}`))
  expect(anchorKeys(17)).toEqual([
    'bottom:0', 'bottom:8', 'bottom:1',
    'bottom:7', 'bottom:2', 'bottom:6',
    'bottom:3', 'bottom:4', 'bottom:5',
  ])
  expect(anchorKeys(18)).toEqual(Array.from({ length: 8 }, (_, row) => (
    [`left:${row}`, `right:${row}`]
  )).flat())
  expect(anchorKeys(19)).toEqual(Array.from({ length: 9 }, (_, column) => `bottom:${column}`))
  expect(anchorKeys(20)).toEqual(Array.from({ length: 9 }, (_, column) => (
    [`top:${column}`, `bottom:${column}`]
  )).flat())
})

test('mug levels collect through every gravity exit', () => {
  getLevelIds().forEach((levelId) => {
    const level = getCatalogLevel(levelId)
    const hasMugs = level.objectives.some(objective => objective.type === SpecialTileType.Mug)

    if (hasMugs) {
      expect(level.edgeGuides).toHaveLength(level.collectors.length)
      expect(level.edgeGuides.every(guide => guide.kind === 'collector')).toBe(true)
    }
  })
})

test('level 15 uses every outer side cell as a real mug exit', () => {
  const level = getCatalogLevel(15)
  const sideCells = [...level.topology.playableCells].filter(key => (
    key.endsWith(':0') || key.endsWith(`:${level.topology.bounds.width - 1}`)
  ))

  expect(sideCells).toHaveLength(16)
  for (const key of sideCells) {
    expect(level.gravity.nodes.get(key)?.next, key).toBeNull()
    expect(level.collectors.some(collector => (
      `${collector.cell.row}:${collector.cell.column}` === key
    )), key).toBe(true)
    expect(level.edgeGuides.some(guide => guide.kind === 'collector' && (
      `${guide.terminal.row}:${guide.terminal.column}` === key
    )), key).toBe(true)
  }
})

test('every catalog level compiles and materializes for stable attempt seeds', () => {
  getLevelIds().forEach((levelId) => {
    const level = getCatalogLevel(levelId)

    expect(() => getBoardSurface(level.topology)).not.toThrow()
    for (const seed of [levelId, levelId + 100, levelId + 200]) {
      expect(() => materializeInitialBoard(level, new AttemptRandom(seed))).not.toThrow()
    }
  })
})

test('special tiles follow objectives while packages may be standalone obstacles', () => {
  getLevelIds().forEach((levelId) => {
    const definition = createCatalogLevelDefinition(levelId)
    const board = materializeInitialBoard(getCatalogLevel(levelId), new AttemptRandom(levelId))
    const counts = getSpecialCounts(board)
    const objectives = new Map(definition.objectives.map(item => [item.type, item.count]))

    for (const type of [SpecialTileType.Mug, SpecialTileType.Cookie]) {
      expect(counts.get(type) ?? 0).toBe(objectives.has(type) ? objectives.get(type) : 0)
    }
    definition.objectives.forEach((objective) => {
      if (Object.values(SpecialTileType).includes(objective.type as SpecialTileType)) {
        expect(counts.get(objective.type as SpecialTileType) ?? 0).toBeGreaterThanOrEqual(objective.count)
      }
    })
  })
})

test('ordinary zones keep positions stable while their tile types vary by attempt', () => {
  const level = getCatalogLevel(13)
  const first = materializeInitialBoard(level, new AttemptRandom(13))
  const replay = materializeInitialBoard(level, new AttemptRandom(13))
  const next = materializeInitialBoard(level, new AttemptRandom(14))
  const specialMask = (board: typeof first) => board.map(row => row.map(tile => (
    tile?.kind === 'ordinary' ? 'ordinary' : tile?.type ?? 'void'
  )))

  expect(first).toEqual(replay)
  expect(specialMask(first)).toEqual(specialMask(next))
  expect(serializeBoard(first)).not.toBe(serializeBoard(next))
})

for (const levelId of Array.from({ length: 10 }, (_, index) => index + 11)) {
  test(`level ${levelId} resolves a real browser move`, async ({ page }) => {
    await openUnlockedLevel(page, levelId)
    const level = getCatalogLevel(levelId)

    await expect(page.locator('.b-game-ground__cell')).toHaveCount(level.topology.playableCells.size)
    await makeMove(page, findValidMove(await getTiles(page)))
    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 10_000 })
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(level.topology.playableCells.size)
  })
}

test('wide side exits render neighboring gravity guides', async ({ page }, testInfo) => {
  await openUnlockedLevel(page, 12)

  await expect(page.locator('.b-game-board-shell__guide--left')).toHaveCount(3)
  await expect(page.locator('.b-game-board-shell__guide--right')).toHaveCount(3)
  await testInfo.attach('level-12-wide-gravity-exits', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('edge guides stay next to their terminal boundary cells', async ({ page }, testInfo) => {
  for (const levelId of [12, 14, 15, 16, 17, 18, 19, 20]) {
    await openUnlockedLevel(page, levelId)

    const level = getCatalogLevel(levelId)
    const guides = page.locator('.b-game-board-shell__guide')

    await expect(guides).toHaveCount(level.edgeGuides.length)
    for (const [index, guide] of level.edgeGuides.entries()) {
      const terminal = guide.kind === 'collector' ? guide.terminal : guide.terminals[0]
      const terminalKey = `${terminal.row}:${terminal.column}`
      const guideBox = await guides.nth(index).boundingBox()
      const terminalBox = await page.locator(`[data-cell-key="${terminalKey}"]`).boundingBox()

      if (guideBox === null || terminalBox === null) {
        throw new Error(`Expected guide and terminal ${terminalKey} to have layout boxes`)
      }
      expectGuideNextToTerminal(guide.anchor.side, guideBox, terminalBox)
    }

    if (levelId === 15 || levelId === 17 || levelId === 18) {
      await testInfo.attach(`level-${levelId}-gravity-exits`, {
        body: await page.screenshot(),
        contentType: 'image/png',
      })
    }
  }
})

test('rectangular boards preserve the established glass field styling', async ({ page }, testInfo) => {
  await openUnlockedLevel(page, 1)

  await expect(page.locator('.b-game-ground')).toHaveCSS('border-radius', '8px')
  await expect(page.locator('.b-game-ground__cell').first()).toHaveCSS('border-radius', '5.6px')
  await expect(page.locator('.b-game-ground__cell').first())
    .toHaveCSS('border-color', 'rgba(255, 255, 255, 0.08)')
  await expect(page.locator('.b-board-surface__fill'))
    .toHaveCSS('fill', 'rgba(11, 0, 0, 0.706)')
  await expect(page.locator('.b-board-surface__border'))
    .toHaveCSS('stroke', 'rgba(255, 255, 255, 0.24)')
  await expect(page.locator('.b-board-surface__border')).toHaveCSS('stroke-width', '1.5px')
  await expect(page.locator('.b-game-ground')).toHaveCSS('box-shadow', 'none')
  await testInfo.attach('rectangular-board-surface', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('irregular boards leave void transparent and outline its neighboring cells', async ({ page }, testInfo) => {
  await openUnlockedLevel(page, 13)

  await expect(page.locator('.b-game-ground')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(page.locator('.b-game-ground__surface .b-board-surface__fill')).toHaveAttribute('d', /.+/)
  await expect(page.locator('.b-game-ground__surface .b-board-surface__border')).toHaveAttribute('d', /.+/)
  const pointFill = await page.locator('.b-board-surface__fill').evaluate((path) => ({
    padding: (path as SVGGeometryElement).isPointInFill(new DOMPoint(2.04, 3.5)),
    playable: (path as SVGGeometryElement).isPointInFill(new DOMPoint(0.5, 0.5)),
    void: (path as SVGGeometryElement).isPointInFill(new DOMPoint(2.5, 3.5)),
  }))

  expect(pointFill).toEqual({ padding: true, playable: true, void: false })
  await testInfo.attach('irregular-point-board', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('field surface outlines an enclosed void on every side', async ({ page }) => {
  await openUnlockedLevel(page, 5)

  const borderPath = await page.locator('.b-game-ground__surface .b-board-surface__border')
    .getAttribute('d')
  const pointFill = await page.locator('.b-board-surface__fill').evaluate((path) => ({
    playable: (path as SVGGeometryElement).isPointInFill(new DOMPoint(0.5, 0.5)),
    void: (path as SVGGeometryElement).isPointInFill(new DOMPoint(3.5, 3.5)),
  }))

  expect(borderPath?.match(/M/g)).toHaveLength(2)
  expect(pointFill).toEqual({ playable: true, void: false })
})
