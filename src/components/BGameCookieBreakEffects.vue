<template>
    <div
        v-for="effect in effects"
        :key="effect.id"
        :class="{
            'b-game-cookie-break': true,
            'b-game-cookie-break--active': effect.active,
        }"
        :data-cookie-break-active="effect.active"
        :style="getCookieBreakEffectStyle(effect)"
    >
        <span
            v-for="fragment in fragments"
            :key="fragment"
            :class="{
                'b-game-cookie-break__fragment': true,
                [`b-game-cookie-break__fragment--${fragment}`]: true,
            }"
        />
    </div>
</template>

<script lang="ts" setup>
import type { CookieBreakEffect } from '@/composables/useCookieBreakAnimation'

import { getCookieBreakEffectStyle } from '@/composables/useCookieBreakAnimation'

const COOKIE_FRAGMENT_COUNT = 5
const fragments = Array.from({ length: COOKIE_FRAGMENT_COUNT }, (_, index) => index + 1)

defineProps<{
  effects: CookieBreakEffect[]
}>()

defineOptions({
  name: 'BGameCookieBreakEffects',
})
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-game-cookie-break";
</style>
