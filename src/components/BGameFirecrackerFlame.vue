<template>
    <span class="b-game-booster-effect__exhaust" aria-hidden="true">
        <svg
            class="b-game-firecracker-flame"
            viewBox="0 0 100 48"
            preserveAspectRatio="none"
        >
            <path
                class="b-game-firecracker-flame__outer"
                d="M 0 15 C 16 11 23 2 42 7 Q 57 9 65 6 Q 76 17 100 24 Q 77 28 67 38 Q 53 34 43 41 C 23 45 15 36 0 33 Z"
            />
            <path
                class="b-game-firecracker-flame__inner"
                d="M 0 19 C 19 16 22 10 39 15 Q 56 17 77 24 Q 55 29 39 33 C 23 38 16 31 0 29 Z"
            />
            <path
                class="b-game-firecracker-flame__core"
                d="M 0 22 Q 19 18 44 24 Q 20 29 0 26 Z"
            />
        </svg>
    </span>
</template>

<script lang="ts" setup>
defineOptions({ name: 'BGameFirecrackerFlame' })
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-game-firecracker-flame";
</style>
