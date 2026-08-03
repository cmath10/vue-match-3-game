<template>
    <footer class="b-game-layout__footer">
        <div class="b-game-layout__footer-panel">
            <span>
                {{ t('footer.code') }} <a href="https://github.com/cmath10" class="b-game-layout__link">https://github.com/cmath10</a>
            </span>

            <span>
                {{ t('footer.artwork') }} <a href="https://www.artstation.com/jackhook" class="b-game-layout__link">https://www.artstation.com/jackhook</a>
            </span>
        </div>
    </footer>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'BGameFooter' })

const { t } = useI18n()
</script>
