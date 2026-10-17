import { expect, test } from '@playwright/test'

for (const viewport of [{ width: 1366, height: 900 }, { width: 320, height: 740 }]) {
  test(`statistics aligns tile icons and labels at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.goto('/statistics')
    await page.getByRole('button', { name: 'Русский' }).click()

    const metrics = page.locator('.b-statistics__metric')

    await expect(metrics).toHaveCount(7)
    for (const metric of await metrics.all()) {
      const art = metric.locator('.b-statistics__metric-art')

      await expect(art).toHaveAttribute('aria-hidden', 'true')
      await expect(art).toHaveCSS('position', 'absolute')
      await expect(art).toHaveCSS('width', '76px')
      await expect(art).not.toHaveCSS('transform', 'none')
      const cardBox = (await metric.boundingBox())!
      const artBox = (await art.boundingBox())!

      expect(artBox.x + artBox.width / 2).toBeGreaterThan(cardBox.x + cardBox.width / 2)
      expect(artBox.y + artBox.height / 2).toBeGreaterThan(cardBox.y + cardBox.height / 2)
      for (const text of await metric.locator('span, strong').all()) {
        const box = (await text.boundingBox())!

        expect(box.x).toBeGreaterThanOrEqual(cardBox.x)
        expect(box.x + box.width).toBeLessThanOrEqual(cardBox.x + cardBox.width)
        expect(box.y + box.height).toBeLessThanOrEqual(cardBox.y + cardBox.height)
      }
    }

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
