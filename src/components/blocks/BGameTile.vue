<template>
    <div :class="classes" />
</template>

<script lang="ts">
  import { Vue, Component, Prop } from 'vue-property-decorator'
  import { TILE_TYPE } from '@/enums/game'

  @Component({
    name: 'BGameTile'
  })
  export default class BGameTile extends Vue {
    @Prop({
      required: true
    }) type: TILE_TYPE

    @Prop({
      default: false
    }) small: boolean

    get classes () {
      return {
        'b-game-tile': true,
        'b-game-tile--small': this.small,
        'b-game-tile--air': this.type === TILE_TYPE.AIR,
        'b-game-tile--earth': this.type === TILE_TYPE.EARTH,
        'b-game-tile--fire': this.type === TILE_TYPE.FIRE,
        'b-game-tile--lightning': this.type === TILE_TYPE.LIGHTNING,
        'b-game-tile--water': this.type === TILE_TYPE.WATER,
      }
    }
  }
</script>

<style lang="scss">
    @import "../../assets/scss/blocks/b-game-tile";
</style>
