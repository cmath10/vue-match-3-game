import type { Locator, Page } from '@playwright/test'

import type { TileSnapshot } from './helpers/game-board'

import { expect, test } from '@playwright/test'

import { BoosterType, TileType } from '@/domain/enums'

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  clickTile,
  dragTileToward,
  findBoosterMove,
  getTiles,
  makeMove,
  seedMathRandom,
  swipeTile,
} from './helpers/game-board'

type BoosterScenario = {
  type: BoosterType
  seed: number
}

const boosterScenarios: BoosterScenario[] = [
  { type: BoosterType.ButtonBox, seed: 9 },
  { type: BoosterType.ColumnFirecracker, seed: 1 },
  { type: BoosterType.RowFirecracker, seed: 1 },
  { type: BoosterType.AreaKettle, seed: 6 },
]
const buttonBoxScenario = boosterScenarios[0]
const geometricBoosterScenarios = boosterScenarios.filter(scenario => scenario.type !== BoosterType.ButtonBox)

const startBoosterScenario = async (
  page: Page,
  scenario: BoosterScenario
): Promise<Locator> => {
  await seedMathRandom(page, scenario.seed)
  await page.goto('/game/1')
  await expect(page.locator('.b-game-ground')).toBeVisible()

  const move = findBoosterMove(await getTiles(page), scenario.type)

  if (move === null) {
    throw new Error(`Seed ${scenario.seed} should create ${scenario.type}`)
  }

  await makeMove(page, move)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 10_000 })

  const booster = page.locator(`.b-game-ground__tile[data-tile-id="${move.boosterTileId}"]`)

  await expect(booster).toHaveClass(new RegExp(`b-game-tile--${scenario.type}`))
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)

  return booster
}

for (const scenario of boosterScenarios) {
  test(`${scenario.type} is created by a real board move and activates on double click`, async ({ page }) => {
    const booster = await startBoosterScenario(page, scenario)
    const boosterId = await booster.getAttribute('data-tile-id')

    await booster.dblclick()

    if (scenario.type === BoosterType.ButtonBox) {
      await expect(page.locator('.b-game-button').first()).toBeVisible()
    } else {
      await expect(page.locator(`.b-game-booster-effect--${scenario.type}`)).toBeVisible()
    }

    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
    await expect(page.locator(`.b-game-ground__tile[data-tile-id="${boosterId}"]`)).toHaveCount(0)
    await expect(page.locator('.b-game-button')).toHaveCount(0)
    await expect(page.locator('.b-game-booster-effect')).toHaveCount(0)
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
  })
}

for (const scenario of boosterScenarios.filter(({ type }) => (
  type === BoosterType.RowFirecracker || type === BoosterType.ColumnFirecracker
))) {
  test(`${scenario.type} animation starts at the activated tile`, async ({ page }) => {
    const booster = await startBoosterScenario(page, scenario)
    const boosterBox = await booster.boundingBox()

    expect(boosterBox).not.toBeNull()

    await booster.dblclick()

    const effect = page.locator(`.b-game-booster-effect--${scenario.type}`)

    await expect(effect).toBeVisible()

    const origin = await effect.evaluate((element) => {
      const rocket = element.querySelector<HTMLElement>('.b-game-booster-effect__firecracker')!
      const animation = rocket.getAnimations()[0]

      animation.pause()
      animation.currentTime = 0
      const rect = rocket.getBoundingClientRect()

      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    })

    const expected = {
      x: boosterBox!.x + boosterBox!.width / 2,
      y: boosterBox!.y + boosterBox!.height / 2,
    }

    if (scenario.type === BoosterType.RowFirecracker) {
      expect(origin.x).toBeCloseTo(expected.x, 0)
    } else {
      expect(origin.y).toBeCloseTo(expected.y, 0)
    }
  })

  test(`${scenario.type} animation sends two lit firecrackers in opposite directions`, async ({ page }, testInfo) => {
    const booster = await startBoosterScenario(page, scenario)

    await booster.dblclick()

    const effect = page.locator(`.b-game-booster-effect--${scenario.type}`)

    await expect(effect).toBeVisible()

    const motion = await effect.evaluate(async (element) => {
      const fragments = [
        element.querySelector<HTMLElement>('.b-game-booster-effect__firecracker--negative'),
        element.querySelector<HTMLElement>('.b-game-booster-effect__firecracker--positive'),
      ]

      if (fragments.some(fragment => fragment === null)) {
        throw new Error('Firecracker animation should render both fragments')
      }

      const firecrackers = fragments as HTMLElement[]
      const animations = firecrackers.map((fragment) => {
        const animation = fragment.getAnimations().find((candidate) => {
          return candidate.effect instanceof KeyframeEffect
            && candidate.effect.pseudoElement === null
        })

        if (animation === undefined) {
          throw new Error('Firecracker fragment should have a movement animation')
        }

        animation.pause()
        animation.currentTime = 0

        return animation
      })
      const measure = () => firecrackers.map((fragment) => {
        const style = getComputedStyle(fragment)
        const matrix = new DOMMatrixReadOnly(style.transform)
        const rect = fragment.getBoundingClientRect()

        return {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          scale: Math.sqrt(Math.abs(matrix.a * matrix.d - matrix.b * matrix.c)),
        }
      })
      const effectRect = element.getBoundingClientRect()
      const bounds = {
        top: effectRect.top,
        right: effectRect.right,
        bottom: effectRect.bottom,
        left: effectRect.left,
      }

      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

      const start = measure()

      animations.forEach((animation) => {
        animation.currentTime = Number(animation.effect!.getTiming().duration)
      })

      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

      const end = measure()
      const styles = firecrackers.map((fragment) => ({
        backgroundImage: getComputedStyle(fragment).backgroundImage,
        flameAnimation: getComputedStyle(fragment.querySelector('.b-game-booster-effect__exhaust')!).animationName,
        flameLayers: fragment.querySelectorAll('.b-game-firecracker-flame path').length,
      }))

      animations.forEach((animation) => {
        animation.currentTime = Number(animation.effect!.getTiming().duration) * 0.65
      })
      firecrackers.forEach(fragment => fragment.querySelector('.b-game-booster-effect__exhaust')!.getAnimations().forEach(animation => {
        animation.pause()
        animation.currentTime = Number(animation.effect!.getTiming().duration) * 0.65
      }))

      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

      return { bounds, start, end, styles }
    })

    expect(motion.styles[0].backgroundImage).toContain(scenario.type === BoosterType.RowFirecracker
      ? 'tile-booster-firecracker-left' : 'tile-booster-firecracker-up')
    expect(motion.styles[1].backgroundImage).toContain(scenario.type === BoosterType.RowFirecracker
      ? 'tile-booster-firecracker-right' : 'tile-booster-firecracker-down')

    for (const style of motion.styles) {
      expect(style.flameAnimation).toBe('b-game-firecracker-ignition')
      expect(style.flameLayers).toBe(3)
    }

    expect(motion.end[0].scale).toBeCloseTo(motion.start[0].scale, 2)
    expect(motion.end[1].scale).toBeCloseTo(motion.start[1].scale, 2)

    if (scenario.type === BoosterType.RowFirecracker) {
      expect(motion.end[0].x).toBeCloseTo(motion.bounds.left, 0)
      expect(motion.end[1].x).toBeCloseTo(motion.bounds.right, 0)
    } else {
      expect(motion.end[0].y).toBeCloseTo(motion.bounds.top, 0)
      expect(motion.end[1].y).toBeCloseTo(motion.bounds.bottom, 0)
    }

    await testInfo.attach(`${scenario.type}-split-animation`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    })
  })
}

test('area kettle has a continuous circular animation across its 5 by 5 zone', async ({ page }, testInfo) => {
  const kettleScenario = boosterScenarios[3]
  const booster = await startBoosterScenario(page, kettleScenario)

  await booster.dblclick()

  const effect = page.locator(`.b-game-booster-effect--${BoosterType.AreaKettle}`)

  await expect(effect).toBeVisible()

  const geometry = await effect.evaluate((element) => {
    const cells = document.querySelectorAll<HTMLElement>('.b-game-ground__cell')
    const effectRect = element.getBoundingClientRect()
    const firstCell = cells[0].getBoundingClientRect()
    const secondCell = cells[1].getBoundingClientRect()

    return {
      width: effectRect.width,
      height: effectRect.height,
      cellSize: firstCell.width,
      cellStep: secondCell.x - firstCell.x,
      backgroundImage: getComputedStyle(element, '::before').backgroundImage,
      borderRadius: getComputedStyle(element, '::before').borderRadius,
      clipPath: getComputedStyle(element, '::before').clipPath,
    }
  })

  await page.waitForTimeout(180)
  await testInfo.attach('area-kettle-animation', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  const expectedSize = geometry.cellSize + geometry.cellStep * 4

  expect(geometry.width).toBeCloseTo(expectedSize, 0)
  expect(geometry.height).toBeCloseTo(expectedSize, 0)
  expect(geometry.backgroundImage).toContain('radial-gradient(')
  expect(geometry.borderRadius).toBe('50%')
  expect(geometry.clipPath).toBe('none')
})

for (const scenario of geometricBoosterScenarios) {
  test(`${scenario.type} activates when an ordinary tile is swiped into it`, async ({ page }) => {
    const booster = await startBoosterScenario(page, scenario)
    const tiles = await getTiles(page)
    const boosterId = await booster.getAttribute('data-tile-id')
    const boosterSnapshot = tiles.find(tile => tile.id === boosterId)

    expect(boosterSnapshot).toBeDefined()

    const target = findOrdinaryNeighbor(tiles, boosterSnapshot!)

    expect(target).not.toBeNull()

    await swipeTile(page, target!, boosterSnapshot!)

    await expect(page.locator(`.b-game-booster-effect--${scenario.type}`)).toBeVisible()
    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
    await expect(booster).toHaveCount(0)
    await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
  })
}

test('adjacent click fallback activates a firecracker instead of reverting its swap', async ({ page }) => {
  const scenario = geometricBoosterScenarios.find(item => item.type === BoosterType.RowFirecracker)!
  const booster = await startBoosterScenario(page, scenario)
  const tiles = await getTiles(page)
  const boosterId = await booster.getAttribute('data-tile-id')
  const boosterSnapshot = tiles.find(tile => tile.id === boosterId)

  expect(boosterSnapshot).toBeDefined()

  const target = findOrdinaryNeighbor(tiles, boosterSnapshot!)

  expect(target).not.toBeNull()

  await clickTile(page, target!)
  await booster.click()

  await expect(page.locator(`.b-game-booster-effect--${scenario.type}`)).toBeVisible()
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
  await expect(booster).toHaveCount(0)
})

test('directional mouse drag activates a firecracker before reaching the target tile', async ({ page }) => {
  const scenario = geometricBoosterScenarios.find(item => item.type === BoosterType.RowFirecracker)!
  const booster = await startBoosterScenario(page, scenario)
  const tiles = await getTiles(page)
  const boosterId = await booster.getAttribute('data-tile-id')
  const boosterSnapshot = tiles.find(tile => tile.id === boosterId)

  expect(boosterSnapshot).toBeDefined()

  const target = findOrdinaryNeighbor(tiles, boosterSnapshot!)

  expect(target).not.toBeNull()

  await dragTileToward(page, boosterSnapshot!, target!)

  await expect(page.locator(`.b-game-booster-effect--${scenario.type}`)).toBeVisible()
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
  await expect(booster).toHaveCount(0)
})

for (const direction of ['booster-to-tile', 'tile-to-booster'] as const) {
  test(`button box collects the selected ordinary type on ${direction} swipe`, async ({ page }) => {
    const booster = await startBoosterScenario(page, buttonBoxScenario)
    const tiles = await getTiles(page)
    const boosterId = await booster.getAttribute('data-tile-id')
    const boosterSnapshot = tiles.find(tile => tile.id === boosterId)

    expect(boosterSnapshot).toBeDefined()

    const target = findOrdinaryNeighbor(tiles, boosterSnapshot!)

    expect(target).not.toBeNull()

    const [from, to] = direction === 'booster-to-tile'
      ? [boosterSnapshot!, target!]
      : [target!, boosterSnapshot!]

    await swipeTile(page, from, to)

    await expect(page.locator(`.b-game-button--${target!.type}`).first()).toBeVisible()
    await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
    await expect(booster).toHaveCount(0)
  })
}

test('button box swipe tolerates release in the target cell outside the tile image', async ({ page }) => {
  const booster = await startBoosterScenario(page, buttonBoxScenario)
  const tiles = await getTiles(page)
  const boosterId = await booster.getAttribute('data-tile-id')
  const boosterSnapshot = tiles.find(tile => tile.id === boosterId)

  expect(boosterSnapshot).toBeDefined()

  const target = findOrdinaryNeighbor(tiles, boosterSnapshot!)

  expect(target).not.toBeNull()

  await swipePastTargetEdge(page, boosterSnapshot!, target!)

  await expect(page.locator(`.b-game-button--${target!.type}`).first()).toBeVisible()
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('23', { timeout: 10_000 })
})

test('starting a new game cancels button flights and the obsolete booster turn', async ({ page }) => {
  const booster = await startBoosterScenario(page, buttonBoxScenario)

  await booster.dblclick()
  await expect(page.locator('.b-game-button').first()).toBeVisible()
  await page.getByRole('button', { name: 'New game' }).click()

  await expect(page.locator('.b-game-button')).toHaveCount(0)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)

  await page.waitForTimeout(600)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
})

test('starting a new game cancels a geometric booster effect', async ({ page }) => {
  const kettleScenario = boosterScenarios[3]
  const booster = await startBoosterScenario(page, kettleScenario)

  await booster.dblclick()
  await expect(page.locator(`.b-game-booster-effect--${BoosterType.AreaKettle}`)).toBeVisible()
  await page.getByRole('button', { name: 'New game' }).click()

  await expect(page.locator('.b-game-booster-effect')).toHaveCount(0)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')

  await page.waitForTimeout(600)
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(BOARD_WIDTH * BOARD_HEIGHT)
})

test('tiles refilled after a booster use the landing animation', async ({ page }) => {
  const booster = await startBoosterScenario(page, boosterScenarios[2])
  const existingIds = new Set((await getTiles(page)).map(tile => tile.id))

  await booster.dblclick()

  await page.waitForFunction((ids) => [...document.querySelectorAll<HTMLElement>('.b-game-ground__tile')]
    .some((tile) => {
      const tileId = tile.dataset.tileId
      const hasLandingAnimation = getComputedStyle(tile, '::before').animationName
        === 'b-game-tile-landing'

      return tileId !== undefined
        && !ids.includes(tileId)
        && hasLandingAnimation
    }), [...existingIds])
})

const findOrdinaryNeighbor = (
  tiles: TileSnapshot[],
  source: TileSnapshot
): TileSnapshot | null => {
  const ordinaryTypes = new Set<string>(Object.values(TileType))

  return tiles.find(tile => (
    !tile.blocked &&
    ordinaryTypes.has(tile.type) &&
    (
      (tile.row === source.row && Math.abs(tile.column - source.column) === 1) ||
      (tile.column === source.column && Math.abs(tile.row - source.row) === 1)
    )
  )) ?? null
}

const swipePastTargetEdge = async (
  page: Page,
  source: TileSnapshot,
  target: TileSnapshot
): Promise<void> => {
  const sourceX = source.x + source.width / 2
  const sourceY = source.y + source.height / 2
  const targetX = target.x + target.width / 2
  const targetY = target.y + target.height / 2
  const horizontalDirection = Math.sign(targetX - sourceX)
  const verticalDirection = Math.sign(targetY - sourceY)

  await page.mouse.move(sourceX, sourceY)
  await page.mouse.down()
  await page.mouse.move(
    targetX + horizontalDirection * (target.width / 2 + 2),
    targetY + verticalDirection * (target.height / 2 + 2)
  )
  await page.mouse.up()
}
