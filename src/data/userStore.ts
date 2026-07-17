import * as SQLite from 'expo-sqlite';

import { Bookmark, Highlight, LastRead, Note } from '../domain/models';
import { HighlightColorKey } from '../theme/tokens';

/**
 * User-generated data (highlights, notes, bookmarks, last-read) lives in its
 * OWN database file, completely separate from the read-only reference data.
 * It is stored in the app's document directory, so it survives app updates.
 */
const USER_DB_NAME = 'bayan-user.db';

const USER_SCHEMA = `
CREATE TABLE IF NOT EXISTS highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surah INTEGER NOT NULL, ayah INTEGER NOT NULL,
  wordPosition INTEGER,
  color TEXT NOT NULL, createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_highlights_sa ON highlights(surah, ayah);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surah INTEGER NOT NULL, ayah INTEGER NOT NULL,
  text TEXT NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL,
  UNIQUE(surah, ayah)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surah INTEGER NOT NULL, ayah INTEGER NOT NULL,
  label TEXT, createdAt INTEGER NOT NULL,
  UNIQUE(surah, ayah)
);

CREATE TABLE IF NOT EXISTS last_read (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  surah INTEGER NOT NULL, ayah INTEGER NOT NULL, updatedAt INTEGER NOT NULL
);
`;

export async function openUserDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(USER_DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync(USER_SCHEMA);
  return db;
}

/* ----------------------------- Highlights ----------------------------- */

interface HighlightRow {
  id: number;
  surah: number;
  ayah: number;
  wordPosition: number | null;
  color: string;
  createdAt: number;
}

function mapHighlight(r: HighlightRow): Highlight {
  return {
    id: r.id,
    surah: r.surah,
    ayah: r.ayah,
    wordPosition: r.wordPosition,
    color: r.color as HighlightColorKey,
    createdAt: r.createdAt,
  };
}

export async function getAllHighlights(db: SQLite.SQLiteDatabase): Promise<Highlight[]> {
  const rows = await db.getAllAsync<HighlightRow>(
    `SELECT * FROM highlights ORDER BY createdAt DESC`,
  );
  return rows.map(mapHighlight);
}

/**
 * Toggle a highlight for a target (ayah or specific word).
 * - If a highlight of the same color exists on that target → remove it.
 * - If a different-color highlight exists → recolor it.
 * - Otherwise → create it.
 * Returns the resulting list of highlights for that ayah.
 */
export async function toggleHighlight(
  db: SQLite.SQLiteDatabase,
  surah: number,
  ayah: number,
  wordPosition: number | null,
  color: HighlightColorKey,
): Promise<void> {
  const existing = await db.getFirstAsync<HighlightRow>(
    `SELECT * FROM highlights WHERE surah = ? AND ayah = ? AND ((wordPosition IS NULL AND ? IS NULL) OR wordPosition = ?)`,
    [surah, ayah, wordPosition, wordPosition],
  );
  if (existing) {
    if (existing.color === color) {
      await db.runAsync(`DELETE FROM highlights WHERE id = ?`, [existing.id]);
    } else {
      await db.runAsync(`UPDATE highlights SET color = ? WHERE id = ?`, [color, existing.id]);
    }
  } else {
    await db.runAsync(
      `INSERT INTO highlights (surah, ayah, wordPosition, color, createdAt) VALUES (?, ?, ?, ?, ?)`,
      [surah, ayah, wordPosition, color, Date.now()],
    );
  }
}

export async function removeHighlight(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM highlights WHERE id = ?`, [id]);
}

/* ------------------------------- Notes -------------------------------- */

interface NoteRow {
  id: number;
  surah: number;
  ayah: number;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export async function getAllNotes(db: SQLite.SQLiteDatabase): Promise<Note[]> {
  return db.getAllAsync<NoteRow>(`SELECT * FROM notes ORDER BY updatedAt DESC`);
}

export async function getNoteForAyah(
  db: SQLite.SQLiteDatabase,
  surah: number,
  ayah: number,
): Promise<Note | null> {
  const r = await db.getFirstAsync<NoteRow>(`SELECT * FROM notes WHERE surah = ? AND ayah = ?`, [
    surah,
    ayah,
  ]);
  return r ?? null;
}

/** Create or update the note for an ayah. Empty text deletes it. */
export async function upsertNote(
  db: SQLite.SQLiteDatabase,
  surah: number,
  ayah: number,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    await db.runAsync(`DELETE FROM notes WHERE surah = ? AND ayah = ?`, [surah, ayah]);
    return;
  }
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO notes (surah, ayah, text, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(surah, ayah) DO UPDATE SET text = excluded.text, updatedAt = excluded.updatedAt`,
    [surah, ayah, trimmed, now, now],
  );
}

export async function deleteNote(db: SQLite.SQLiteDatabase, surah: number, ayah: number): Promise<void> {
  await db.runAsync(`DELETE FROM notes WHERE surah = ? AND ayah = ?`, [surah, ayah]);
}

/* ----------------------------- Bookmarks ------------------------------ */

interface BookmarkRow {
  id: number;
  surah: number;
  ayah: number;
  label: string | null;
  createdAt: number;
}

export async function getAllBookmarks(db: SQLite.SQLiteDatabase): Promise<Bookmark[]> {
  return db.getAllAsync<BookmarkRow>(`SELECT * FROM bookmarks ORDER BY createdAt DESC`);
}

export async function toggleBookmark(
  db: SQLite.SQLiteDatabase,
  surah: number,
  ayah: number,
  label: string | null = null,
): Promise<boolean> {
  const existing = await db.getFirstAsync<BookmarkRow>(
    `SELECT * FROM bookmarks WHERE surah = ? AND ayah = ?`,
    [surah, ayah],
  );
  if (existing) {
    await db.runAsync(`DELETE FROM bookmarks WHERE id = ?`, [existing.id]);
    return false;
  }
  await db.runAsync(
    `INSERT INTO bookmarks (surah, ayah, label, createdAt) VALUES (?, ?, ?, ?)`,
    [surah, ayah, label, Date.now()],
  );
  return true;
}

export async function removeBookmark(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM bookmarks WHERE id = ?`, [id]);
}

/* ----------------------------- Last read ------------------------------ */

export async function getLastRead(db: SQLite.SQLiteDatabase): Promise<LastRead | null> {
  const r = await db.getFirstAsync<{ surah: number; ayah: number; updatedAt: number }>(
    `SELECT surah, ayah, updatedAt FROM last_read WHERE id = 1`,
  );
  return r ?? null;
}

export async function setLastRead(
  db: SQLite.SQLiteDatabase,
  surah: number,
  ayah: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO last_read (id, surah, ayah, updatedAt) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET surah = excluded.surah, ayah = excluded.ayah, updatedAt = excluded.updatedAt`,
    [surah, ayah, Date.now()],
  );
}
