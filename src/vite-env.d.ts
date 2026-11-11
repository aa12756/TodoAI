/// <reference types="vite/client" />

import type { TodoApi } from '@shared/api'

declare global {
  interface Window {
    todoApi: TodoApi
  }
}

export {}
