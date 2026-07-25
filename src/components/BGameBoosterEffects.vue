<template>
    <div
        v-for="effect in effects"
        :key="effect.id"
        :class="`b-game-booster-effect--${effect.type}`"
        :style="getBoosterVisualEffectStyle(effect)"
        class="b-game-booster-effect"
    />
</template>

<script lang="ts" setup>
import type { BoosterVisualEffect } from '@/composables/useBoosterAnimation'

import { getBoosterVisualEffectStyle } from '@/composables/useBoosterAnimation'

defineProps<{
  effects: BoosterVisualEffect[]
}>()

defineOptions({
  name: 'BGameBoosterEffects',
})
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-game-booster-effect";
</style>
