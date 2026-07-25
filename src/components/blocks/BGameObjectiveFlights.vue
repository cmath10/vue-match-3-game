<template>
    <teleport to="body">
        <b-game-tile
            v-for="flight in flights"
            :key="flight.id"
            :class="`b-game-objective-flight--${flight.phase}`"
            :data-objective-flight-phase="flight.phase"
            :data-objective-type="flight.type"
            :style="getObjectiveFlightStyle(flight)"
            :type="flight.type"
            class="b-game-objective-flight"
        />
    </teleport>
</template>

<script lang="ts" setup>
import type { ObjectiveFlight } from '@/entities/Match3ObjectiveFlightPresentation'

import BGameTile from '@/components/blocks/BGameTile.vue'

import { getObjectiveFlightStyle } from '@/entities/Match3ObjectiveFlightPresentation'

defineProps<{
  flights: ObjectiveFlight[]
}>()

defineOptions({
  name: 'BGameObjectiveFlights',
})
</script>

<style lang="scss">
@import "../../assets/scss/blocks/b-game-objective-flight";
</style>
