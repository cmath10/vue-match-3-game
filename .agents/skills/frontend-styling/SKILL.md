---
name: frontend-styling
description: "Создание, изменение, рефакторинг и ревью frontend-стилей vue-match-3-game: Vue-шаблоны, глобальные SCSS BEM-блоки и mixins, Bootstrap, responsive layout, Swiper, игровые ассеты, состояния и анимации. Используй при правках `.scss`, Vue style blocks и class bindings в `.vue`, а также при исправлении geometry, overflow, hover/focus, mobile/landscape layout или визуальных эффектов игры."
---

# Vue Match-3 Frontend Styling

## Sources Of Truth

- Сначала читать `README.md`, `package.json`, `Makefile`, `eslint.config.mjs` и ближайшие Vue/SCSS-файлы затронутой области.
- Для выбора stylesheet, variables, mixins, Bootstrap или asset source читать `references/style-sources.md`.
- При добавлении или изменении `class`/`:class` в Vue template читать `references/class-bindings.md` и сохранять однородный способ назначения classes на каждом authored node.
- Для geometry, overflow, responsive, motion и interactive states читать `references/visual-validation.md` и проверять результат в реальном браузере.
- Считать текущий checkout окончательным доказательством существования class, variable, mixin, asset path, import и test command. Не придумывать их по аналогии.

## Workflow

1. Зафиксировать видимый контракт: экран, viewport и orientation, состояние игры, input method, ожидаемые размеры, scroll/overflow и animation phase.
2. Найти владельца стиля по фактическому DOM и consumers. Не исправлять geometry leaf-компонента, если размером или clipping владеет layout, Swiper viewport либо игровой board shell.
3. Выбрать существующий styling source и import boundary. Не создавать новый shared token, mixin или block до проверки текущих sources.
4. Реализовать минимальный selector scope, сохранив BEM-владение, responsive branches и Vue class fallthrough.
5. Проверить все затронутые states: default, hover, focus-visible, active/selected, disabled/locked, loading/result и animation/cancellation, если они существуют в сценарии.
6. Выполнить browser gate из `references/visual-validation.md`, затем `yarn lint`, `yarn build` и релевантные Playwright-тесты.
7. Завершить `git diff --check` и проверить, что в diff не попали `dist/`, `artifacts/`, `test-results/` или другие generated files.

## Ownership And Imports

- Использовать текущую глобальную SCSS-архитектуру. Это не CSS Modules и не scoped styles: имена selectors являются общими для приложения.
- Держать app/screen/layout blocks в imports корневого `src/App.vue`, когда они нужны нескольким routes или компонентам.
- Держать самостоятельный component block рядом с владельцем через существующий `<style lang="scss">` import, если этот block используется только компонентом.
- Не импортировать один и тот же block одновременно через `App.vue` и component style без доказанной причины: Vite включит дублированный CSS.
- Следовать существующему `@import`-подходу. Не смешивать миграцию на Sass modules с продуктовой styling-задачей без отдельного scope.
- Использовать CSS custom properties для runtime geometry и согласованных animation values, когда значения поступают из Vue или разделяются между несколькими selectors.

## BEM And Template Classes

- Использовать полный глобальный BEM: `b-block`, `b-block__element`, `b-block--modifier`, `b-block__element--modifier`.
- Сохранять префиксы проекта: `b-` для blocks, `m-` для Sass mixins, `t-` для transition classes.
- Называть class по сущности или роли, а не по DOM-механике. Не вводить `wrapper`, `inner` или `container`, если можно назвать реальную роль области.
- Не применять правило «один Vue-файл — один block» механически. Несколько blocks допустимы, если это самостоятельные экранные или игровые сущности.
- Держать Sass nesting неглубоким и проверять итоговое раскрытие `&`, особенно для modifiers и selectors вида `block--state#{&}__element`.
- Не стилизовать локальную feature через component tag или общий HTML selector. Element selectors допустимы только внутри узкого block scope.
- Не добавлять DOM node только ради spacing, positioning или нового class. Сначала использовать существующий semantic node, flex/grid owner, pseudo-element или component boundary.
- Сохранять class bindings однородными: только `class` для полностью статического набора либо один object `:class` для базовых classes и условных modifiers. Подробности и Vue-примеры читать в `references/class-bindings.md`.
- В новых и изменяемых Vue-шаблонах писать component tags в PascalCase; имена локальных компонентов должны состоять минимум из двух слов, кроме стандартного `App`.

## Bootstrap And Third-Party Styles

- Использовать существующие Bootstrap classes для готового generic UI (`btn`, `btn-light`, `btn-outline-light`, text utilities), когда они уже описывают внешний вид.
- Допускать Bootstrap class вместе с BEM-class на одном node: Bootstrap владеет generic control appearance, BEM — размещением и game-specific variation.
- Не придумывать Bootstrap utility и не подключать дополнительный Bootstrap слой без проверки установленной версии и скомпилированных imports.
- Перед override Swiper или другой библиотеки проверить public options и базовый CSS. Ограничивать override локальным owner selector с достаточной specificity.
- Не отключать `overflow` slider/board viewport ради выступающего hover или shadow: сначала добавить внутренний visual headroom и проверить, что соседние slides/effects остаются скрыты.

## Layout, Assets And Motion

- Определять одного владельца размеров и overflow по каждой оси. Учитывать `min-width: 0` и `min-height: 0` у flex/grid children.
- Сохранять согласованность существующих breakpoints и orientation branches; проверять стороны непосредственно до и после изменённого breakpoint.
- Для fullscreen layout учитывать `dvh`, доступную высоту menu/footer и вычисляемые размеры board cells.
- Проверять mouse и touch/pointer interaction отдельно, когда стиль влияет на drag, swipe, selection или hover-only affordance.
- Перед добавлением изображения проверять `src/assets/images`, карту tile styles и preload manifest `src/assets.ts`. Не дублировать один asset под новым именем без необходимости.
- Согласовывать CSS transition duration с игровым lifecycle. Не менять только визуальный timing, если TypeScript ожидает завершение эффекта или очищает его по timer/frame boundary.
- Не добавлять случайный `z-index`; сначала определить stacking context, clipping owner и требуемый порядок board/effect/overlay.

## Validation

- В проекте нет отдельного Stylelint: `yarn build` является обязательной проверкой Sass imports и компиляции CSS, но не заменяет browser validation.
- Для layout, responsive, overflow, transforms, stacking и animation использовать Playwright в реальном Chromium.
- Проверять поведение и геометрию, а не внутреннее имя class. Class assertion допустим, только когда class сам является modifier/DOM contract сценария.
- Сначала запускать узкий тест через `make tests.playwright cli="tests/playwright/<spec>.spec.ts"`, затем расширять до `make tests` по ширине изменения.
- После browser tests запускать `yarn lint`, `yarn build` и `git diff --check` либо явно сообщать, какая проверка недоступна и какой риск остаётся.

## References

- `references/class-bindings.md` — однородное назначение BEM, Bootstrap и динамических classes в Vue templates.
- `references/style-sources.md` — текущая карта SCSS, Bootstrap, third-party и asset sources.
- `references/visual-validation.md` — выбор browser evidence для geometry, responsive и motion.
