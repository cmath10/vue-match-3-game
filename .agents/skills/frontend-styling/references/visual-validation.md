# Visual Validation

## Evidence By Change Type

| Изменение | Минимальное доказательство |
| --- | --- |
| Color, border, typography без geometry | Browser screenshot нужного state + `yarn build` |
| Spacing, size, grid/flex, overflow | Playwright geometry assertion и screenshot в затронутом viewport |
| Breakpoint или orientation | Viewports по обе стороны breakpoint, включая соседний layout branch |
| Hover, focus, selected, locked | Реальное действие `hover()`, keyboard/pointer input и assertion после state change |
| Swiper/drag/touch | Реальный drag/swipe и проверка wrapper/card geometry, не только callback count |
| Tile movement или booster effect | Публичный game scenario, screenshots/frames во время эффекта и финальное settled state |
| Stacking/overlay | Проверка видимости и hit target в реальном Chromium; один screenshot недостаточен |

## Workflow

1. Воспроизвести исходный state тем же route, saved progress и input method, что у пользователя.
2. Зафиксировать viewport, orientation и relevant bounding boxes/computed styles до изменения.
3. После изменения повторить тот же сценарий и проверить не только целевой element, но и соседние owners: header/menu, carousel viewport, board bounds, footer и overlays.
4. Добавить Playwright assertion на наблюдаемое поведение, если regression воспроизводим детерминированно.
5. Использовать semantic roles, accessible names и visible text для навигации. CSS selector применять для geometry/effect layer, который не имеет semantic role.
6. Запустить узкий spec, затем полный `make tests`, если менялись shared layout, board geometry, common tile styles либо timing.

## Geometry Checks

- Для clipping сравнивать `boundingBox()` child и clipping owner уже после `hover`, transform или animation start.
- Для responsive layout проверять, что элементы помещаются в viewport, сохраняют ожидаемое число rows/columns и не создают unintended page scroll.
- Для flex/grid overflow проверять `min-width`, `min-height`, `scrollWidth/clientWidth` и реального scroll owner-а.
- Для transform не считать наличие CSS declaration доказательством: измерять результирующую позицию после browser layout.

## Motion Checks

- Проверять начальную фазу, движение и settled state. Callback count или наличие transition class не доказывают визуальную траекторию.
- Учитывать, что игровые эффекты очищаются из Vue state по таймеру или animation boundary; browser assertion должен успевать наблюдать нужную фазу без искусственного ослабления production timing.
- При изменении duration сверять TypeScript constants, CSS custom properties и transition declarations как единый lifecycle.
- Проверять отмену старого эффекта при старте новой игры, если затронут reusable effect layer.

## Commands

```text
make tests.playwright cli="tests/playwright/navigation.spec.ts"
make tests.playwright cli="tests/playwright/game.spec.ts"
make tests
yarn lint
yarn build
git diff --check
```

Выбирать spec по реальному contract. `navigation.spec.ts` подходит для routes, responsive screens и Swiper; `game.spec.ts` и специализированные `*-gameplay.spec.ts` — для board geometry, pointer input и effects.
