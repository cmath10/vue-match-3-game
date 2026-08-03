<template>
    <Teleport to="body">
        <BGameTile
            v-for="flight in flights"
            :key="flight.id"
            :class="{
                'b-game-objective-flight': true,
                [`b-game-objective-flight--${flight.phase}`]: true,
            }"
            :data-objective-flight-phase="flight.phase"
            :data-objective-type="flight.type"
            :style="getObjectiveFlightStyle(flight)"
            :type="flight.type"
        />
    </Teleport>
</template>

<script lang="ts" setup>
import type { ObjectiveFlight } from '@/presentation/objectiveFlights'

import BGameTile from '@/components/BGameTile.vue'

import { getObjectiveFlightStyle } from '@/presentation/objectiveFlights'

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
