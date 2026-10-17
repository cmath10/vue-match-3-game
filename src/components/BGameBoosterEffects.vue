<template>
    <div
        v-for="effect in effects"
        :key="effect.id"
        :class="{
            'b-game-booster-effect': true,
            [`b-game-booster-effect--${effect.type}`]: true,
        }"
        :style="getBoosterVisualEffectStyle(effect)"
    >
        <template v-if="isFirecracker(effect)">
            <span
                aria-hidden="true"
                class="
                    b-game-booster-effect__firecracker
                    b-game-booster-effect__firecracker--negative
                "
            >
                <BGameFirecrackerFlame />
            </span>
            <span
                aria-hidden="true"
                class="
                    b-game-booster-effect__firecracker
                    b-game-booster-effect__firecracker--positive
                "
            >
                <BGameFirecrackerFlame />
            </span>
        </template>
        <BGameKettleSteam v-else-if="effect.type === BoosterType.AreaKettle" />
    </div>
</template>

<script lang="ts" setup>
import type { BoosterVisualEffect } from '@/composables/useBoosterAnimation'

import BGameFirecrackerFlame from '@/components/BGameFirecrackerFlame.vue'
import BGameKettleSteam from '@/components/BGameKettleSteam.vue'

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
