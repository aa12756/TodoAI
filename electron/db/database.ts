import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

const SCHEMA_VERSION = 4

const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  due_at TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  last_notified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks (due_at);
`

const MIGRATION_V2 = `
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  messages_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions (updated_at DESC);
`

const MIGRATION_V3 = `
ALTER TABLE chat_sessions ADD COLUMN title_custom INTEGER NOT NULL DEFAULT 0;
`

const MIGRATION_V4_ADD = `ALTER TABLE chat_sessions ADD COLUMN accessed_at TEXT;`
const MIGRATION_V4_BACKFILL = `UPDATE chat_sessions SET accessed_at = updated_at WHERE accessed_at IS NULL;`

let db: SqlJsDatabase | null = null
let dbFilePath = ''

function persist(): void {
  if (!db || !dbFilePath) return
  const data = db.export()
  fs.writeFileSync(dbFilePath, Buffer.from(data))
}

class Stmt {
  constructor(
    private database: SqlJsDatabase,
    private sql: string
  ) {}

  all(...params: unknown[]): Record<string, unknown>[] {
    const stmt = this.database.prepare(this.sql)
    try {
      stmt.bind(params as initSqlJs.SqlValue[])
      const rows: Record<string, unknown>[] = []
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as Record<string, unknown>)
      }
      return rows
    } finally {
      stmt.free()
    }
  }

  get(...params: unknown[]): Record<string, unknown> | undefined {
    return this.all(...params)[0]
  }

  run(...params: unknown[]): { changes: number } {
    const stmt = this.database.prepare(this.sql)
    try {
      stmt.bind(params as initSqlJs.SqlValue[])
      stmt.step()
      const changes = this.database.getRowsModified()
      persist()
      return { changes }
    } finally {
      stmt.free()
    }
  }
}

export interface AppDatabase {
  prepare: (sql: string) => Stmt
  exec: (sql: string) => void
  pragma: (pragma: string, options?: { simple?: boolean }) => unknown
}

function wrap(database: SqlJsDatabase): AppDatabase {
  return {
    prepare: (sql: string) => new Stmt(database, sql),
    exec: (sql: string) => {
      database.run(sql)
      persist()
    },
    pragma: (pragma: string, options?: { simple?: boolean }) => {
      const stmt = database.prepare(`PRAGMA ${pragma}`)
      try {
        if (!stmt.step()) return options?.simple ? 0 : []
        const row = stmt.getAsObject() as { user_version?: number }
        if (options?.simple && 'user_version' in row) return row.user_version ?? 0
        return row
      } finally {
        stmt.free()
      }
    }
  }
}

let wrapped: AppDatabase | null = null

function migrate(database: SqlJsDatabase): void {
  const stmt = database.prepare('PRAGMA user_version')
  let version = 0
  try {
    if (stmt.step()) {
      const row = stmt.getAsObject() as { user_version?: number }
      version = row.user_version ?? 0
    }
  } finally {
    stmt.free()
  }

  if (version >= SCHEMA_VERSION) return

  if (version < 1) {
    const schemaFile = path.join(process.cwd(), 'electron', 'db', 'schema.sql')
    const sql = fs.existsSync(schemaFile) ? fs.readFileSync(schemaFile, 'utf-8') : MIGRATION_V1
    database.run(sql)
    version = 1
  }
  if (version < 2) {
    database.run(MIGRATION_V2)
  }
  if (version < 3) {
    try {
      database.run(MIGRATION_V3)
    } catch {
      /* column may already exist */
    }
  }
  if (version < 4) {
    try {
      database.run(MIGRATION_V4_ADD)
    } catch {
      /* column may already exist */
    }
    try {
      database.run(MIGRATION_V4_BACKFILL)
    } catch {
      /* ignore */
    }
  }
  database.run(`PRAGMA user_version = ${SCHEMA_VERSION}`)
  persist()
}

export async function initDatabase(): Promise<void> {
  if (db) return

  const wasmDir = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist')
  const SQL = await initSqlJs({
    locateFile: (file) => {
      const candidates = [
        path.join(wasmDir, file),
        path.join(__dirname, file),
        path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
        path.join(
          process.resourcesPath,
          'app.asar.unpacked',
          'node_modules',
          'sql.js',
          'dist',
          file
        )
      ]
      for (const p of candidates) {
        if (fs.existsSync(p)) return p
      }
      return path.join(wasmDir, file)
    }
  })
  const userData = app.getPath('userData')
  fs.mkdirSync(userData, { recursive: true })
  dbFilePath = path.join(userData, 'todo.db')

  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  migrate(db)
  wrapped = wrap(db)
}

export function getDatabase(): AppDatabase {
  if (!wrapped) {
    throw new Error('Database not initialized; call initDatabase() first')
  }
  return wrapped
}

export function closeDatabase(): void {
  if (db) {
    persist()
    db.close()
    db = null
    wrapped = null
  }
}
