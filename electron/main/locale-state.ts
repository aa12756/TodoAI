import { DEFAULT_LOCALE, type Locale } from '../../shared/locale'

let currentLocale: Locale = DEFAULT_LOCALE

export function getMainLocale(): Locale {
  return currentLocale
}

export function setMainLocale(locale: Locale): void {
  currentLocale = locale
}
