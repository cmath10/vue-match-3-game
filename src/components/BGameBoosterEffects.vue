<template>
    <div
        v-for="effect in effects"
        :key="effect.id"
        :class="`b-game-booster-effect--${effect.type}`"
        :style="getBoosterVisualEffectStyle(effect)"
        class="b-game-booster-effect"
    >
        <template v-if="isFirecracker(effect)">
            <span
                aria-hidden="true"
                class="
                    b-game-booster-effect__firecracker
                    b-game-booster-effect__firecracker--negative
                "
            />
            <span
                aria-hidden="true"
                class="
                    b-game-booster-effect__firecracker
                    b-game-booster-effect__firecracker--positive
                "
            />
        </template>
    </div>
</template>

<script lang="ts" setup>
import type { BoosterVisualEffect } from '@/composables/useBoosterAnimation'

import { BoosterType } from '@/domain/enums'

import { getBoosterVisualEffectStyle } from '@/composables/useBoosterAnimation'

defineProps<{
  effects: BoosterVisualEffect[]
}>()

defineOptions({
  name: 'BGameBoosterEffects',
})

const isFirecracker = (effect: BoosterVisualEffect): boolean => {
  return effect.type === BoosterType.RowFirecracker
    || effect.type === BoosterType.ColumnFirecracker
}
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-game-booster-effect";
</style>
