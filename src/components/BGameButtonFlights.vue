<template>
    <div
        v-for="flight in flights"
        :key="flight.id"
        :class="{
            'b-game-button': true,
            [`b-game-button--${flight.type}`]: true,
        }"
        :style="getButtonFlightStyle(flight)"
    />
</template>

<script lang="ts" setup>
import type { ButtonFlight } from '@/composables/useButtonCollection'

import { getButtonFlightStyle } from '@/composables/useButtonCollection'

defineProps<{
  flights: ButtonFlight[]
}>()

defineOptions({
  name: 'BGameButtonFlights',
})
</script>
