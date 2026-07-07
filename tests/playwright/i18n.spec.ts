import { expect, test } from '@playwright/test'

test('switches language from the menu', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('.b-game-menu__title')).toHaveText('Game')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.getByRole('button', { name: 'Русский' }).click()

  await expect(page.locator('.b-game-menu__title')).toHaveText('Игра')
  await expect(page.getByRole('button', { name: 'Новая игра' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')

  await page.getByRole('button', { name: 'English' }).click()

  await expect(page.locator('.b-game-menu__title')).toHaveText('Game')
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test.describe('browser locale detection', () => {
  test.use({ locale: 'ru-RU' })

  test('uses the supported browser locale on first load', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.b-game-menu__title')).toHaveText('Игра')
    await expect(page.getByRole('button', { name: 'Новая игра' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  })
})
