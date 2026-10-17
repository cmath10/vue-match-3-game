import type { PlayerState } from '@/domain/progress'

import { expect, test } from '@playwright/test'

import { createPlayerState } from '@/domain/progress'

import {
  findValidMove,
  getTiles,
  makeMove,
  seedMathRandom,
} from './helpers/game-board'
import { seedPlayerState } from './helpers/player-state'

for (const viewport of [
  { width: 1366, height: 900 }, { width: 1366, height: 768 },
  { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 },
]) {
  test(`mascot fits the level header at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const state = createPlayerState()

    state.highestUnlockedLevel = 15
    await seedPlayerState(page, state)
    await page.goto('/game/15')
    await page.getByRole('button', { name: 'Русский' }).click()
    const mascot = page.locator('.b-game-mascot')
    const menu = (await page.locator('.b-game-layout__menu').boundingBox())!
    const portrait = (await mascot.boundingBox())!
    const heading = (await page.locator('.b-game-menu__title').boundingBox())!
    const objectives = (await page.locator('.b-game-menu__objectives').boundingBox())!

    expect(portrait.x).toBeGreaterThanOrEqual(menu.x)
    expect(portrait.y).toBeGreaterThanOrEqual(menu.y)
    expect(portrait.x + portrait.width).toBeLessThanOrEqual(menu.x + menu.width)
    expect(portrait.y + portrait.height).toBeLessThanOrEqual(menu.y + menu.height)
    expect(objectives.y).toBeGreaterThanOrEqual(heading.y + heading.height)
    const ground = (await page.locator('.b-game-ground').boundingBox())!
    const field = (await page.locator('.b-game-layout__field').boundingBox())!

    expect(ground.y).toBeGreaterThanOrEqual(field.y)
    expect(ground.y + ground.height).toBeLessThanOrEqual(field.y + field.height)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)
    await expect(mascot.locator('.b-game-mascot__portrait--sad')).toHaveCSS('opacity', '0')
    await testInfo.attach(`mascot-${viewport.width}-${viewport.height}`, {
      body: await page.screenshot(), contentType: 'image/png',
    })
  })
}

test('mascot blinks briefly and respects reduced motion', async ({ page }) => {
  await page.goto('/game/1')
  const blink = page.locator('.b-game-mascot__portrait--blink')
  const sample = (time: number) => blink.evaluate((element, time) => {
    const animation = element.getAnimations()[0]

    animation.pause()
    animation.currentTime = time
    return getComputedStyle(element).opacity
  }, time)

  await expect(blink).toBeAttached()
  expect(await sample(2000)).toBe('0')
  expect(await sample(2700)).toBe('1')
  expect(await sample(2900)).toBe('0')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(blink).toHaveCSS('animation-name', 'none')
  await expect(blink).toHaveCSS('opacity', '0')
})

test('losing changes the mascot and replay restores its normal blinking portrait', async ({ page }, testInfo) => {
  await seedMathRandom(page)
  await page.goto('/game/1')
  await expect(page.locator('.b-game-ground__tile')).toHaveCount(35)
  await expect.poll(() => page.evaluate(async modulePath => {
    const { loadPlayerState } = await import(modulePath)
    return Boolean(((await loadPlayerState()) as PlayerState)?.levels[1]?.attempt)
  }, '/src/storage/playerStateRepository.ts')).toBe(true)
  await page.evaluate(async modulePath => {
    const { loadPlayerState, savePlayerState } = await import(modulePath)
    const state = (await loadPlayerState()) as PlayerState

    state.levels[1].attempt!.turns = 1
    await savePlayerState(state)
  }, '/src/storage/playerStateRepository.ts')
  await page.goto('/game/1?resume=1')
  await expect(page.locator('.b-game-menu__turns-value')).toHaveText('1')
  await makeMove(page, findValidMove(await getTiles(page)))
  await expect(page.getByText('Game over', { exact: true })).toBeVisible({ timeout: 15_000 })
  const mascot = page.locator('.b-game-mascot')

  await expect(mascot.locator('.b-game-mascot__portrait--sad')).toHaveCSS('opacity', '1')
  await expect(mascot.locator('.b-game-mascot__portrait--open')).toHaveCSS('opacity', '0')
  await expect(mascot.locator('.b-game-mascot__portrait--blink')).toHaveCSS('animation-name', 'none')
  await testInfo.attach('mascot-defeat', { body: await page.screenshot(), contentType: 'image/png' })
  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(mascot.locator('.b-game-mascot__portrait--sad')).toHaveCSS('opacity', '0')
  await expect(mascot.locator('.b-game-mascot__portrait--open')).toHaveCSS('opacity', '1')
  await expect(mascot.locator('.b-game-mascot__portrait--blink')).toHaveCSS('animation-name', 'b-game-mascot-blink')
})
