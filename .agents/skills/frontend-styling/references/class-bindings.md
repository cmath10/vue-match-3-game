# Vue Class Bindings

## Main Rule

Сохранять назначение classes максимально однородным на каждом authored template node:

- если весь набор постоянный, использовать только `class`;
- если хотя бы один class условный или вычисляемый, перенести базовые BEM и Bootstrap classes в тот же object `:class`;
- не оставлять одновременно `class` и `:class` на одном authored node;
- не использовать array binding только для искусственного разделения постоянных classes и modifiers.

Это правило относится к синтаксису и читаемости назначения classes. Bootstrap classes могут соседствовать с BEM: они предоставляют generic control/utility styling, а BEM владеет game-specific role, layout или state.

## Base Class And Conditional Modifier

Неоднородно:

```vue
<RouterLink
    :class="{ 'b-levels__tile--current': isCurrent }"
    class="b-levels__tile"
/>
```

Однородно:

```vue
<RouterLink
    :class="{
        'b-levels__tile': true,
        'b-levels__tile--current': isCurrent,
    }"
/>
```

## Bootstrap With Dynamic State

Не отделять Bootstrap classes от динамического BEM modifier только потому, что они generic:

```vue
<button
    :class="{
        'btn': true,
        'btn-outline-light': true,
        'b-game-menu__button': true,
        'b-game-menu__button--active': active,
    }"
/>
```

Все classes принадлежат одному authored node и читаются как один набор. Запрета на сочетание Bootstrap и BEM здесь нет.

## Computed Modifier Names

Включать вычисляемый modifier в тот же object binding, что и базовый block:

```vue
<div
    :class="{
        'b-game-button': true,
        [`b-game-button--${flight.type}`]: true,
    }"
/>
```

Если условие, ключ или объединение становятся сложными и повторяются, вынести готовую class map в именованную computed value. Не прятать простой локальный state в script только ради сокращения template.

## Array Binding

Использовать array binding, только когда действительно объединяются class values разных непрозрачных форм или источников, например class value из public prop и локальная computed map:

```vue
<div :class="[props.presentationClass, stateClasses]" />
```

Не использовать array для постоянного base class плюс object с modifier:

```vue
<div :class="['b-game-tile', { 'b-game-tile--small': small }]" />
```

Такой набор выразить одним object binding.

## Component Boundary And Fallthrough

Оценивать однородность в исходном template, а не после Vue class fallthrough. Consumer может передать BEM placement class компоненту, чей root уже имеет собственный class:

```vue
<BLocaleSwitcher class="b-game-menu__language" />
```

После render оба class могут оказаться на одном DOM node, но они имеют разных владельцев и назначены в разных templates. Не переносить внутренние classes дочернего компонента в consumer ради формального объединения.
