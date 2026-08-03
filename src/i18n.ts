import { createI18n } from 'vue-i18n'

import { en } from '@/locales/en'
import { ru } from '@/locales/ru'

const DEFAULT_LOCALE = 'en'
const SUPPORTED_LOCALES = ['en', 'ru'] as const

type SupportedLocale = typeof SUPPORTED_LOCALES[number]

const messages = { en, ru }

export const localeOptions: Array<{ code: SupportedLocale; flag: string; label: string }> = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
]

const getBrowserLocale = (): SupportedLocale => {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  const locale = languages
    .map(language => language.split('-')[0])
    .find((language): language is SupportedLocale => isSupportedLocale(language))

  return locale || DEFAULT_LOCALE
}

const isSupportedLocale = (locale: string): locale is SupportedLocale => {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

const browserLocale = getBrowserLocale()

export const i18n = createI18n({
  fallbackLocale: DEFAULT_LOCALE,
  legacy: false,
  locale: browserLocale,
  messages,
})

export const setLocale = (locale: SupportedLocale): void => {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
}

setLocale(browserLocale)
