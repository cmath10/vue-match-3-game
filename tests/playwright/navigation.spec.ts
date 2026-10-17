import type { Page } from '@playwright/test'

import { expect, test } from '@playwright/test'

import { createPlayerState } from '@/domain/progress'

import { findValidMove } from './helpers/game-board'
import { getStoredTurns } from './helpers/player-state'
import { getTiles, makeMove, seedMathRandom } from './helpers/game-board'
import { seedPlayerState } from './helpers/player-state'

const openStartedHome = async (page: Page): Promise<void> => {
  await seedMathRandom(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.locator('.b-game-ground')).toBeVisible()
  await page.getByRole('button', { name: 'Main menu' }).click()
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
}

test('prepares assets before showing the first game action', async ({ page }) => {
  await page.route('**/*.png', async (route) => {
    await new Promise(resolve => setTimeout(resolve, 100))
    await route.continue()
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('progressbar', { name: 'Preparing...' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Choose level' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Statistics' })).toHaveCount(0)
})

test('uses open-ended welcome copy and switches its language', async ({ page }) => {
  await page.goto('/')

  const welcome = page.locator('.b-welcome')

  await expect(welcome).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(page.getByText('Collect treats, complete objectives and discover new challenges.'))
    .toBeVisible()
  await expect(page.getByText(/twenty levels/i)).toHaveCount(0)

  await page.getByRole('button', { name: 'Русский' }).click()

  await expect(page.getByRole('heading', { name: 'Три в ряд' })).toBeVisible()
  await expect(page.getByText('Собирайте сладости, выполняйте цели и открывайте новые испытания.'))
    .toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
})

test('offers continue, levels and statistics after a game starts', async ({ page }) => {
  await openStartedHome(page)

  await expect(page.getByRole('link', { name: 'Choose level' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Statistics' })).toBeVisible()
})

test('keeps previous levels playable while later levels stay locked', async ({ page }) => {
  const state = createPlayerState()

  state.highestUnlockedLevel = 3
  state.statistics.gamesStarted = 2
  state.statistics.gamesCompleted = 2
  state.statistics.gamesWon = 2
  state.levels[1] = {
    levelId: 1,
    completed: true,
    lastResult: 'win',
    updatedAt: 1,
  }
  state.levels[2] = {
    levelId: 2,
    completed: true,
    lastResult: 'win',
    updatedAt: 2,
  }
  await seedPlayerState(page, state)
  await page.goto('/levels')

  await expect(page.getByRole('link', { name: /Open level/ })).toHaveCount(3)
  await expect(page.getByRole('link', { name: 'Open level 1' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open level 3' })).toBeVisible()
  await expect(page.getByLabel('Level 4 is locked')).toBeVisible()

  await page.goto('/game/4')
  await expect(page).toHaveURL(/\/levels$/)
})

test('completed levels show stable board previews while unfinished levels do not', async ({ page }, testInfo) => {
  const state = createPlayerState()

  state.highestUnlockedLevel = 12
  state.levels[1] = { levelId: 1, completed: true, lastResult: 'win', updatedAt: 1 }
  state.levels[2] = { levelId: 2, completed: true, lastResult: 'win', updatedAt: 2 }
  state.levels[11] = { levelId: 11, completed: true, lastResult: 'win', updatedAt: 11 }
  await seedPlayerState(page, state)
  await page.goto('/levels')

  const previews = page.locator('.b-level-preview')

  await expect(previews).toHaveCount(3)
  await expect(page.getByRole('link', { name: 'Open level 12' }).locator('.b-level-preview')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Open level 11' }).locator('.b-level-preview')).toHaveCount(1)
  const firstPreview = await previews.first().locator('.b-level-preview__tile').evaluateAll(elements => (
    elements.map(element => element.className)
  ))

  await page.reload()

  await expect(page.locator('.b-level-preview')).toHaveCount(3)
  expect(await page.locator('.b-level-preview').first().locator('.b-level-preview__tile')
    .evaluateAll(elements => elements.map(element => element.className))).toEqual(firstPreview)
  await page.goto('/game/1')
  await expect(page.locator('.b-game-ground')).toBeVisible()
  await expect.poll(() => getStoredTurns(page, 1)).toBe(25)
  await page.goto('/levels')
  await expect(page.getByRole('link', { name: 'Open level 1' }).first().locator('.b-level-preview'))
    .toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Open level 11' }).first().locator('.b-level-preview'))
    .toHaveCount(1)
  await testInfo.attach('completed-level-previews', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('keeps welcome actions in one row until the mobile layout', async ({ page }) => {
  await openStartedHome(page)

  const actions = page.locator('.b-welcome__action')
  const desktopBoxes = await actions.evaluateAll(elements => (
    elements.map(element => element.getBoundingClientRect().toJSON())
  ))

  expect(desktopBoxes).toHaveLength(3)
  expect(new Set(desktopBoxes.map(box => Math.round(box.y))).size).toBe(1)

  await page.setViewportSize({ width: 375, height: 667 })

  const mobileBoxes = await actions.evaluateAll(elements => (
    elements.map(element => element.getBoundingClientRect().toJSON())
  ))

  expect(mobileBoxes[1].y).toBeGreaterThan(mobileBoxes[0].y)
  expect(mobileBoxes[2].y).toBeGreaterThan(mobileBoxes[1].y)
})

test('restores an unfinished level and records its first move', async ({ page }) => {
  await seedMathRandom(page)
  await page.goto('/game/1')
  await expect(page.locator('.b-game-ground')).toBeVisible()

  const tiles = await getTiles(page)

  expect(tiles).toHaveLength(35)
  expect(new Set(tiles.map(tile => tile.id)).size).toBe(35)
  expect(new Set(tiles.map(tile => `${tile.row}-${tile.column}`)).size).toBe(35)
  await makeMove(page, findValidMove(tiles))
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 10_000 })
  await expect.poll(() => getStoredTurns(page, 1)).toBe(24)

  await page.getByRole('button', { name: 'Main menu' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24')

  await page.getByRole('button', { name: 'Main menu' }).click()
  await page.getByRole('link', { name: 'Statistics' }).click()
  const moves = page.locator('.b-statistics__metric').filter({ hasText: 'Moves made' })
  const collected = page.locator('.b-statistics__metric').filter({ hasText: 'Tiles collected' })

  await expect(moves.locator('strong')).toHaveText('1')
  await expect.poll(async () => Number(await collected.locator('strong').textContent())).toBeGreaterThan(0)
})

test('offers to resume or replace an attempt opened through level selection', async ({ page }) => {
  await seedMathRandom(page)
  await page.goto('/game/1')
  await expect(page.locator('.b-game-ground')).toBeVisible()

  await makeMove(page, findValidMove(await getTiles(page)))
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24', { timeout: 10_000 })
  await expect.poll(() => getStoredTurns(page, 1)).toBe(24)

  await page.getByRole('button', { name: 'Main menu' }).click()
  await page.getByRole('link', { name: 'Choose level' }).click()
  await page.getByRole('link', { name: 'Open level 1' }).click()

  await expect(page.getByRole('heading', { name: 'Unfinished attempt' })).toBeVisible()
  await expect(page.locator('.b-attempt-prompt__summary')).toContainText('Turns left24')
  await expect(page.locator('.b-attempt-prompt__summary')).toContainText('Moves made1')

  await page.getByRole('button', { name: 'Continue attempt' }).click()
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('24')

  await page.getByRole('button', { name: 'Main menu' }).click()
  await page.getByRole('link', { name: 'Choose level' }).click()
  await page.getByRole('link', { name: 'Open level 1' }).click()
  await page.getByRole('button', { name: 'Start again' }).click()

  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('25')
  await expect.poll(() => getStoredTurns(page, 1)).toBe(25)
})

test('hides start and continue when every played level is finished', async ({ page }) => {
  const state = createPlayerState()

  state.statistics.gamesStarted = 1
  state.statistics.gamesCompleted = 1
  state.statistics.gamesWon = 1
  state.highestUnlockedLevel = 2
  state.levels[1] = {
    levelId: 1,
    completed: true,
    lastResult: 'win',
    updatedAt: Date.now(),
  }
  await seedPlayerState(page, state)

  await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Choose level' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Statistics' })).toBeVisible()
})

test('shows twenty progressively unlocked levels in Swiper', async ({ page }) => {
  await openStartedHome(page)
  await page.getByRole('link', { name: 'Choose level' }).click()

  const track = page.getByRole('list', { name: 'Levels' })

  await expect(track).toHaveClass(/swiper/)
  await expect(track.getByRole('listitem')).toHaveCount(20)
  await expect(page.getByRole('link', { name: 'Open level 1' })).toBeVisible()
  await expect(page.getByLabel('Level 2 is locked')).toBeVisible()
  await expect(page.getByRole('link', { name: /Open level/ })).toHaveCount(1)
  const firstLevel = page.getByRole('link', { name: 'Open level 1' })

  await firstLevel.hover()
  const [trackBox, firstLevelBox] = await Promise.all([
    track.boundingBox(),
    firstLevel.boundingBox(),
  ])

  expect(trackBox).not.toBeNull()
  expect(firstLevelBox).not.toBeNull()
  expect(firstLevelBox!.y - trackBox!.y).toBeGreaterThan(6)
  const firstPageBoxes = await track.getByRole('listitem').evaluateAll(elements => (
    elements.slice(0, 8).map(element => element.getBoundingClientRect().toJSON())
  ))

  expect(new Set(firstPageBoxes.map(box => Math.round(box.y))).size).toBe(2)
  const box = await track.boundingBox()

  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width - 20, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + 20, box!.y + box!.height / 2, { steps: 5 })
  await page.mouse.up()
  await expect.poll(() => track.locator('.swiper-wrapper').evaluate(element => (
    getComputedStyle(element).transform
  ))).not.toBe('matrix(1, 0, 0, 1, 0, 0)')
})
