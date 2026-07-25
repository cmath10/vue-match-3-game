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
import type { ObjectiveFlight } from '@/entities/ObjectiveFlightPresentation'

import BGameTile from '@/components/BGameTile.vue'

import { getObjectiveFlightStyle } from '@/entities/ObjectiveFlightPresentation'

defineProps<{
  flights: ObjectiveFlight[]
}>()

defineOptions({
  name: 'BGameObjectiveFlights',
})
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-game-objective-flight";
</style>
