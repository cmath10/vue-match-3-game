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
        'b-game-tile--blue': this.tile.type === TILE_TYPE.BLUE,
        'b-game-tile--green': this.tile.type === TILE_TYPE.GREEN,
        'b-game-tile--purple': this.tile.type === TILE_TYPE.PURPLE,
        'b-game-tile--red': this.tile.type === TILE_TYPE.RED,
        'b-game-tile--yellow': this.tile.type === TILE_TYPE.YELLOW,
      }
    }
  }
</script>

<style lang="scss">
    @import "../../assets/scss/blocks/b-game-tile";
</style>
