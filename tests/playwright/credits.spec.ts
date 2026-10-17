import { expect, test } from '@playwright/test'

for (const viewport of [
  { width: 1366, height: 768 }, { width: 320, height: 568 }, { width: 844, height: 390 },
]) {
  test(`author credits stay on home and leave the game field free at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible()
    const credits = page.locator('.b-app-credits')
    const code = credits.getByRole('link', { name: 'cmath10', exact: true })
    const artwork = credits.getByRole('link', { name: 'Jackhook', exact: true })

    await expect(code).toHaveAttribute('href', 'https://github.com/cmath10')
    await expect(artwork).toHaveAttribute('href', 'https://www.artstation.com/jackhook')
    await expect(credits).toContainText('Code:')
    await page.getByRole('button', { name: 'Русский' }).click()
    await expect(credits).toContainText('Код:')
    await expect(credits).toContainText('Графика:')
    const menu = (await page.locator('.b-welcome__menu').boundingBox())!
    const footer = (await credits.boundingBox())!

    expect(footer.y).toBeGreaterThan(menu.y + menu.height)
    expect(footer.x).toBeGreaterThanOrEqual(0)
    expect(footer.x + footer.width).toBeLessThanOrEqual(viewport.width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)
    await testInfo.attach(`home-credits-${viewport.width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await page.getByRole('button', { name: 'Начать', exact: true }).click()
    await expect(page.locator('.b-game-ground')).toBeVisible()
    await expect(page.getByRole('link', { name: 'cmath10' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Jackhook' })).toHaveCount(0)
    const dimensions = await page.locator('.b-game-layout__field').evaluate(element => {
      const field = element.getBoundingClientRect()
      const board = element.querySelector('.b-game-layout__board')!.getBoundingClientRect()
      const style = getComputedStyle(element)

      return { height: field.height, boardHeight: board.height, padding: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) }
    })

    expect(dimensions.boardHeight).toBeCloseTo(dimensions.height - dimensions.padding, 0)
    await testInfo.attach(`game-without-credits-${viewport.width}`, { body: await page.screenshot(), contentType: 'image/png' })
  })
}
