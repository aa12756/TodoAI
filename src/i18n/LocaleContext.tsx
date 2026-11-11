import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from '@shared/locale'
import {
  filterLabel,
  localizeError,
  priorityLabel,
  priorityShort,
  statusLabel,
  t,
  type MessageKey
} from './messages'

function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (raw === 'en' || raw === 'zh') return raw
  } catch {
    /* private mode */
  }
  return DEFAULT_LOCALE
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
  priorityShort: (priority: import('@shared/types').TaskPriority) => string
  filterLabel: (filter: import('@shared/types').TaskFilter) => string
  priorityLabel: (priority: import('@shared/types').TaskPriority) => string
  statusLabel: (status: import('@shared/types').TaskStatus) => string
  localizeError: (message: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale())

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    void window.todoApi?.app?.setLocale(locale).catch(() => undefined)
  }, [locale])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => t(locale, key, vars),
      priorityShort: (priority) => priorityShort(locale, priority),
      filterLabel: (filter) => filterLabel(locale, filter),
      priorityLabel: (priority) => priorityLabel(locale, priority),
      statusLabel: (status) => statusLabel(locale, status),
      localizeError: (message) => localizeError(locale, message)
    }),
    [locale, setLocale]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
