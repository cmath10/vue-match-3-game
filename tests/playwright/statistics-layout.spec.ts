import { expect, test } from '@playwright/test'

for (const viewport of [{ width: 1366, height: 900 }, { width: 320, height: 740 }]) {
  test(`statistics aligns tile icons and labels at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.goto('/statistics')
    await page.getByRole('button', { name: 'Русский' }).click()

    const groups = page.locator('.b-statistics__group')

    await expect(groups).toHaveCount(2)
    await expect(groups.locator('dt .b-game-tile')).toHaveCount(12)
    for (const group of await groups.all()) {
      const rows = await group.locator('dl > div').evaluateAll(elements => elements.map(element => {
        const icon = element.querySelector('dt .b-game-tile')!
        const label = element.querySelector('dt span')!
        const value = element.querySelector('dd')!

        return {
          icon: icon.getBoundingClientRect().toJSON(),
          label: label.getBoundingClientRect().toJSON(),
          value: value.getBoundingClientRect().toJSON(),
          background: getComputedStyle(icon).backgroundImage,
        }
      }))

      for (const row of rows) {
        expect(row.icon.width).toBe(32)
        expect(row.icon.height).toBe(32)
        expect(row.icon.x).toBe(rows[0].icon.x)
        expect(row.label.x).toBe(rows[0].label.x)
        expect(row.label.x).toBeGreaterThan(row.icon.right)
        expect(row.label.right).toBeLessThanOrEqual(row.value.x)
        expect(row.value.right).toBe(rows[0].value.right)
        expect(row.background).not.toBe('none')
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width)
    await testInfo.attach(`statistics-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
  })
}
