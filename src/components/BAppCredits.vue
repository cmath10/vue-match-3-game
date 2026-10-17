<template>
    <footer class="b-app-credits">
        <span>
            {{ t('footer.code') }} <a href="https://github.com/cmath10" class="b-app-credits__link">cmath10</a>
        </span>
        <span>
            {{ t('footer.artwork') }} <a href="https://www.artstation.com/jackhook" class="b-app-credits__link">Jackhook</a>
        </span>
    </footer>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'BAppCredits' })

const { t } = useI18n()
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-app-credits";
</style>
