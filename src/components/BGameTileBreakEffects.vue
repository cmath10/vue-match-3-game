<template>
    <div
        v-for="effect in effects"
        :key="effect.id"
        :class="{
            'b-game-tile-break': true,
            'b-game-tile-break--active': effect.active,
            [`b-game-tile-break--${effect.type}`]: true,
        }"
        :data-tile-break-active="effect.active"
        :data-tile-break-type="effect.type"
        :style="getTileBreakEffectStyle(effect)"
    >
        <BGameTile
            :type="effect.type"
            class="b-game-tile-break__tile"
        />

        <span
            v-for="fragment in fragments"
            :key="fragment"
            :class="{
                'b-game-tile-break__fragment': true,
                [`b-game-tile-break__fragment--${fragment}`]: true,
            }"
        />
    </div>
</template>

<script lang="ts" setup>
import type { TileBreakEffect } from '@/composables/useTileBreakAnimation'

import BGameTile from '@/components/BGameTile.vue'

import { getTileBreakEffectStyle } from '@/composables/useTileBreakAnimation'

const TILE_FRAGMENT_COUNT = 5
const fragments = Array.from({ length: TILE_FRAGMENT_COUNT }, (_, index) => index + 1)

defineProps<{
  effects: TileBreakEffect[]
}>()

defineOptions({
  name: 'BGameTileBreakEffects',
})
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-game-tile-break";
</style>
