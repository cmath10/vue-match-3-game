<template>
    <div
        :class="{
            'b-game-tile': true,
            'b-game-tile--small': small,
            'b-game-tile--air': type === TILE_TYPE.ELEMENT_AIR,
            'b-game-tile--earth': type === TILE_TYPE.ELEMENT_EARTH,
            'b-game-tile--fire': type === TILE_TYPE.ELEMENT_FIRE,
            'b-game-tile--lightning': type === TILE_TYPE.ELEMENT_LIGHTNING,
            'b-game-tile--water': type === TILE_TYPE.ELEMENT_WATER,
            'b-game-tile--sweets-barbaris': type === TILE_TYPE.SWEETS_BARBARIS,
            'b-game-tile--sweets-cookie': type === TILE_TYPE.SWEETS_COOKIE,
            'b-game-tile--sweets-lollipop': type === TILE_TYPE.SWEETS_LOLLIPOP,
            'b-game-tile--sweets-pillow': type === TILE_TYPE.SWEETS_PILLOW,
            'b-game-tile--sweets-souffle': type === TILE_TYPE.SWEETS_SOUFFLE,
        }"
    />
</template>

<script lang="ts" setup>
import { TILE_TYPE } from '@/enums/game'

withDefaults(defineProps<{
  type: TILE_TYPE
  small?: boolean
}>(), {
  small: false,
})

defineOptions({
  name: 'BGameTile',
})
</script>

<style lang="scss">
@import "../../assets/scss/blocks/b-game-tile";
</style>
