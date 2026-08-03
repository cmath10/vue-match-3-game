# Styling Sources

## Selection Order

1. Проверить public contract используемого Vue/third-party компонента: props, slots, emitted state, CSS variables и документированные classes.
2. Проверить существующий block в `src/assets/scss/blocks/` и ближайший Vue template.
3. Проверить project variables и mixins.
4. Проверить Bootstrap source, если задача относится к generic control или utility.
5. Вводить local literal либо CSS custom property, когда значение специфично для layout, runtime geometry или animation contract и общего source нет.

Выбирать source по владению, а не по внешнему сходству. Не переносить feature-specific geometry в project palette и не использовать spacing value как произвольный component size только ради повторного использования.

## Project Map

- `src/assets/scss/_variables.scss` — palette проекта и Bootstrap `$theme-colors`; импортируется до Bootstrap в `src/App.vue`.
- `src/assets/scss/mixins/_m-game-glass-panel.scss` — общий полупрозрачный game panel.
- `src/assets/scss/mixins/_m-game-panel.scss` — декоративная панель игрового интерфейса.
- `src/assets/scss/blocks/b-app-screen.scss` — welcome, levels, statistics и attempt screens.
- `src/assets/scss/blocks/b-game-layout.scss` — fullscreen shell, menu/field/footer ownership и board available size variables.
- `src/assets/scss/blocks/b-game-ground.scss` — board grid, tile geometry, selection, result overlay и clipping.
- Остальные `blocks/b-*.scss` — самостоятельные tile, menu и effect blocks; проверять их `<style>` imports в owning components.
- `src/assets/scss/transitions/t-game-fade.scss` — Vue transition contract.
- `src/assets/scss/normalize.scss` — только app-level baseline; не складывать туда feature styles.

## Imports And Dependencies

- `src/App.vue` задаёт порядок project variables → Bootstrap → normalize → app/layout/ground → transitions.
- Component-owned global blocks импортируются из `<style lang="scss">` соответствующего `.vue` файла.
- `swiper/css` и `swiper/css/grid` импортируются в `LevelsView.vue`; локальные overrides ограничивать `.b-levels__carousel`.
- Проверять compiled result через `yarn build`: существование файла рядом не доказывает корректный Sass/Vite import.

## Assets

- Исходные изображения находятся в `src/assets/images/` и разрешаются Vite из SCSS либо TypeScript imports.
- Tile/booster/special mappings живут в `b-game-tile.scss`; selected/overlay variants являются частью визуального state contract.
- Ассеты welcome preload перечислены в `src/assets.ts`. Новый критичный initial-screen asset должен учитываться в preload progress.
- Перед заменой или удалением файла искать TypeScript, Vue и SCSS consumers. Не полагаться только на видимый `<img>`.

## Third-Party Boundaries

- Bootstrap использовать через подключённые classes и variables; feature-specific layout оставлять BEM-owner-у.
- Swiper сохраняет собственный viewport и wrapper transforms. Override base class делать только под локальным selector, например `.b-levels__carousel.swiper`, если базовый `.swiper` побеждает по source order.
- `overflow: hidden` Swiper и game board часто является функциональным clipping contract. Для hover elevation, shadow или particles сначала создавать внутренний запас либо отдельный корректный effect layer.
