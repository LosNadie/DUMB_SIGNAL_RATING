#!/usr/bin/env node
/**
 * Export the legacy MySQL database to a JSON snapshot.
 *
 * Read-only: this script never writes to MySQL. The snapshot is consumed by
 * scripts/import-legacy.ts. Output goes to ./legacy-export/ (gitignored)
 * because it contains user e-mail addresses and password hashes.
 *
 * Usage:
 *   node scripts/export-legacy.mjs
 *   MYSQL_HOST=... MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=dumb \
 *     node scripts/export-legacy.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { createConnection } from 'mysql2/promise'

const config = {
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? '123456',
  database: process.env.MYSQL_DATABASE ?? 'dumb',
  charset: 'utf8mb4',
  dateStrings: true,
}

const TABLES = ['user', 'album', 'review', 'anime', 'movie', 'comment']

/** Tables that exist in some deployments but are not part of the new model. */
const LEGACY_ONLY_TABLES = ['news', 'interview']

async function tableExists(connection, table) {
  const [rows] = await connection.execute(
    'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
    [config.database, table],
  )
  return Number(rows[0].n) > 0
}

async function main() {
  const connection = await createConnection(config)
  console.log(`Connected to ${config.host}:${config.port}/${config.database}`)

  const snapshot = {
    exportedAt: new Date().toISOString(),
    source: { host: config.host, database: config.database },
    counts: {},
    tables: {},
    skippedTables: [],
  }

  for (const table of TABLES) {
    if (!(await tableExists(connection, table))) {
      console.warn(`  ! table "${table}" is missing, skipping`)
      snapshot.tables[table] = []
      snapshot.counts[table] = 0
      continue
    }
    // ORDER BY id keeps the snapshot diff-friendly and import deterministic.
    const [rows] = await connection.query(`SELECT * FROM \`${table}\` ORDER BY id`)
    snapshot.tables[table] = rows
    snapshot.counts[table] = rows.length
    console.log(`  ${table.padEnd(8)} ${String(rows.length).padStart(6)} rows`)
  }

  for (const table of LEGACY_ONLY_TABLES) {
    if (await tableExists(connection, table)) {
      const [rows] = await connection.query(`SELECT COUNT(*) AS n FROM \`${table}\``)
      snapshot.skippedTables.push({ table, rows: Number(rows[0].n) })
      if (Number(rows[0].n) > 0) {
        console.warn(`  ! legacy table "${table}" has ${rows[0].n} rows and is NOT migrated`)
      }
    }
  }

  await connection.end()

  await mkdir('legacy-export', { recursive: true })
  const outFile = `legacy-export/snapshot-${new Date().toISOString().slice(0, 10)}.json`
  await writeFile(outFile, JSON.stringify(snapshot, null, 2), 'utf8')
  console.log(`\nWrote ${outFile}`)
  console.log('This file contains personal data — it is gitignored, do not commit it.')
}

main().catch((error) => {
  console.error('Export failed:', error.message)
  process.exitCode = 1
})
