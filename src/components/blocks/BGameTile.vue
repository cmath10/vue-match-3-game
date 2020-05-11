<template>
    <div :class="classes" />
</template>

<script lang="ts">
  import { Vue, Component, Prop } from 'vue-property-decorator'
  import { Tile } from '@/types/game'

  import { TILE_TYPE } from '@/enums/game'

  @Component({
    name: 'BGameTile'
  })
  export default class BGameTile extends Vue {
    @Prop({
      required: true
    }) tile: Tile

    get classes () {
      return {
        'b-game-tile': true,
        'b-game-tile--air': this.tile.type === TILE_TYPE.AIR,
        'b-game-tile--earth': this.tile.type === TILE_TYPE.EARTH,
        'b-game-tile--fire': this.tile.type === TILE_TYPE.FIRE,
        'b-game-tile--lightning': this.tile.type === TILE_TYPE.LIGHTNING,
        'b-game-tile--water': this.tile.type === TILE_TYPE.WATER,
      }
    }
  }
</script>

<style lang="scss">
    @import "../../assets/scss/blocks/b-game-tile";
</style>
