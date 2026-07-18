<template>
    <div
        v-for="flight in flights"
        :key="flight.id"
        :class="`b-game-button--${flight.type}`"
        :style="getButtonFlightStyle(flight)"
        class="b-game-button"
    />
</template>

<script lang="ts" setup>
import {
  getButtonFlightStyle,
  type ButtonFlight,
} from '@/composables/useMatch3ButtonCollection'

defineProps<{
  flights: ButtonFlight[]
}>()

defineOptions({
  name: 'BGameButtonFlights',
})
</script>
