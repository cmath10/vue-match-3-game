<template>
    <div
        :aria-label="t('menu.language')"
        class="b-locale-switcher"
        role="group"
    >
        <button
            v-for="option in localeOptions"
            :key="option.code"
            :aria-label="option.label"
            :aria-pressed="locale === option.code"
            :class="{
                'b-locale-switcher__button': true,
                'b-locale-switcher__button--active': locale === option.code,
            }"
            type="button"
            @click="setLocale(option.code)"
        >
            {{ option.flag }}
        </button>
    </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import { localeOptions, setLocale } from '@/i18n'

defineOptions({ name: 'BLocaleSwitcher' })

const { locale, t } = useI18n()
</script>

<style lang="scss">
@import "../assets/scss/blocks/b-locale-switcher";
</style>
