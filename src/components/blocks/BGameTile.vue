<template>
    <div
        :class="{
            'b-game-tile': true,
            'b-game-tile--small': small,
            'b-game-tile--air': type === TILE_TYPE.AIR,
            'b-game-tile--earth': type === TILE_TYPE.EARTH,
            'b-game-tile--fire': type === TILE_TYPE.FIRE,
            'b-game-tile--lightning': type === TILE_TYPE.LIGHTNING,
            'b-game-tile--water': type === TILE_TYPE.WATER,
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
