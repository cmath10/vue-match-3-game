<template>
    <div
        :class="{
            'b-game-tile': true,
            'b-game-tile--small': small,
            [`b-game-tile--${type}`]: true,
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
