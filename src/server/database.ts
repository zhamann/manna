import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { DatabaseSync } from "node:sqlite"

// Each file is applied once, in filename order; the count applied is stored in
// SQLite's `user_version`. Never edit a migration after it has shipped.
const migrations = Object.entries(
  import.meta.glob<string>("./migrations/*.sql", {
    query: "?raw",
    import: "default",
    eager: true,
  })
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, sql]) => sql)

export function openDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true })

  const db = new DatabaseSync(path)
  db.exec("PRAGMA journal_mode = WAL")
  db.exec("PRAGMA foreign_keys = ON")
  migrate(db)
  return db
}

function migrate(db: DatabaseSync) {
  const { user_version: applied } = db.prepare("PRAGMA user_version").get() as {
    user_version: number
  }

  for (const [index, sql] of migrations.entries()) {
    if (index < applied) continue
    transaction(db, () => {
      db.exec(sql)
      db.exec(`PRAGMA user_version = ${index + 1}`)
    })
  }
}

export function transaction<T>(db: DatabaseSync, run: () => T): T {
  db.exec("BEGIN")
  try {
    const result = run()
    db.exec("COMMIT")
    return result
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

let shared: DatabaseSync | undefined

/** The app's database, stored in `DATA_DIR` (default `./data`). */
export function getDatabase(): DatabaseSync {
  shared ??= openDatabase(join(process.env.DATA_DIR ?? "data", "manna.db"))
  return shared
}
