import { useEffect, useRef, useState } from 'react'
import type { Locale } from '@shared/locale'
import { useChat } from './context/ChatContext'
import { useLocale } from './i18n/LocaleContext'
import { DailyBriefPage } from './pages/DailyBriefPage'
import { SettingsPage } from './pages/SettingsPage'
import { ChatPage } from './pages/ChatPage'
import { TasksPage } from './pages/TasksPage'

type AppTab = 'tasks' | 'chat' | 'brief' | 'settings'

export default function App() {
  const { locale, setLocale, t } = useLocale()
  const { enterChatTab } = useChat()
  const [tab, setTab] = useState<AppTab>('tasks')
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const [briefDateKey, setBriefDateKey] = useState<string | null>(null)
  const prevTabRef = useRef<AppTab>(tab)

  const openBriefTab = (dateKey?: string) => {
    setTab('brief')
    if (dateKey) setBriefDateKey(dateKey)
  }

  useEffect(() => {
    const enteredChat = tab === 'chat' && prevTabRef.current !== 'chat'
    prevTabRef.current = tab
    if (enteredChat) void enterChatTab()
  }, [tab, enterChatTab])

  useEffect(() => {
    const offTask = window.todoApi.events.onNotificationClicked((taskId) => {
      setTab('tasks')
      setFocusTaskId(taskId)
    })
    const offBrief = window.todoApi.events.onOpenDailyBrief((dateKey) => {
      openBriefTab(dateKey || undefined)
    })
    return () => {
      offTask()
      offBrief()
    }
  }, [])

  async function onTestNotification() {
    const result = await window.todoApi.notification.test()
    if (!result.ok) {
      window.alert(t('notificationUnsupported'))
    }
  }

  return (
    <div className={`app${tab === 'chat' ? ' app--chat' : ''}`}>
      <header className="app-header">
        <div>
          <h1>{t('appName')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-ghost" onClick={() => void onTestNotification()}>
            {t('testNotification')}
          </button>
          <label className="lang-switch">
            <span className="lang-label">{t('language')}</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              aria-label={t('language')}
            >
              <option value="zh">{t('langZh')}</option>
              <option value="en">{t('langEn')}</option>
            </select>
          </label>
        </div>
      </header>

      <nav className="app-nav" aria-label={t('mainNav')}>
        <button
          type="button"
          className={tab === 'tasks' ? 'active' : ''}
          onClick={() => setTab('tasks')}
        >
          {t('navTasks')}
        </button>
        <button
          type="button"
          className={tab === 'chat' ? 'active' : ''}
          onClick={() => setTab('chat')}
        >
          {t('navChat')}
        </button>
        <button
          type="button"
          className={tab === 'brief' ? 'active' : ''}
          onClick={() => setTab('brief')}
        >
          {t('navBrief')}
        </button>
        <button
          type="button"
          className={tab === 'settings' ? 'active' : ''}
          onClick={() => setTab('settings')}
        >
          {t('navSettings')}
        </button>
      </nav>

      <div hidden={tab !== 'tasks'}>
        <TasksPage focusTaskId={focusTaskId} onFocusDone={() => setFocusTaskId(null)} />
      </div>
      <div className="app-chat-shell" hidden={tab !== 'chat'}>
        <ChatPage isActive={tab === 'chat'} />
      </div>
      <div hidden={tab !== 'brief'}>
        <DailyBriefPage
          isActive={tab === 'brief'}
          selectedDateKey={briefDateKey}
          onSelectDateKey={setBriefDateKey}
        />
      </div>
      {tab === 'settings' && (
        <SettingsPage
          onOpenBriefTab={(dateKey) => {
            openBriefTab(dateKey)
          }}
        />
      )}
    </div>
  )
}
