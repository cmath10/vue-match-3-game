<template>
    <template v-for="{ flight, lightning } in projections" :key="flight.id">
        <svg
            v-if="flight.phase !== 'flying'"
            :class="{
                'b-game-button__lightning': true,
                'b-game-button__lightning--fading': flight.phase === 'fading',
            }"
            :style="lightning.style"
            :viewBox="lightning.viewBox"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            <path
                class="b-game-button__lightning-halo"
                :d="lightning.path"
                pathLength="1"
            />
            <path
                class="b-game-button__lightning-glow"
                :d="lightning.path"
                pathLength="1"
            />
            <path
                class="b-game-button__lightning-core"
                :d="lightning.path"
                pathLength="1"
            />
        </svg>
        <div
            :class="{
                'b-game-button': true,
                [`b-game-button--${flight.type}`]: true,
                [`b-game-button--${flight.phase}`]: true,
            }"
            :data-button-phase="flight.phase"
            :data-button-tile-id="flight.tileId"
            :style="getButtonFlightStyle(flight)"
        />
    </template>
</template>

<script lang="ts" setup>
import type { ButtonFlight } from '@/composables/useButtonCollection'

import { computed } from 'vue'

import { getButtonFlightStyle } from '@/composables/useButtonCollection'
import { getButtonLightning } from '@/presentation/buttonLightning'

const props = defineProps<{
  flights: ButtonFlight[]
}>()

const projections = computed(() => props.flights.map(flight => ({
  flight, lightning: getButtonLightning(flight),
})))

defineOptions({
  name: 'BGameButtonFlights',
})
</script>
