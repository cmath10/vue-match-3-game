<template>
    <div class="b-game-kettle-steam" aria-hidden="true">
        <span
            v-for="index in 8"
            :key="index"
            class="b-game-kettle-steam__puff"
        />
        <svg class="b-game-kettle-steam__jet" viewBox="0 0 100 100">
            <path d="M88 89C76 85 54 81 51 65C48 50 74 50 67 34C62 24 44 27 39 16C34 8 42 3 48 5C35-1 24 8 29 20C34 34 54 32 55 41C57 51 35 51 39 68C43 86 67 91 88 89Z" />
            <path d="M87 89C64 96 27 88 24 69C22 56 35 52 29 40C25 33 14 34 12 26C3 37 22 42 17 52C4 78 40 103 87 89Z" />
        </svg>
    </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'BGameKettleSteam' })
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-game-kettle-steam";
</style>
