import * as SQLite from 'expo-sqlite';

import {
  Ayah,
  AyahWithWords,
  LexiconEntry,
  LexiconSource,
  MorphologyFeature,
  RootOccurrence,
  Surah,
  Translation,
  Translator,
  Word,
} from '../domain/models';
import {
  DATA_VERSION,
  LEXICON_FILES,
  SURAH_DATA_FILES,
  SURAH_META,
  TRANSLATION_FILES,
} from './registry';

const READ_DB_NAME = 'bayan-reference.db';

/* ------------------------------------------------------------------ *
 * Row shapes (as stored) + mappers to domain models
 * ------------------------------------------------------------------ */

interface WordRow {
  id: number;
  surah: number;
  ayah: number;
  position: number;
  textUthmani: string;
  transliteration: string | null;
  root: string | null;
  rootTranslit: string | null;
  lemma: string | null;
  pos: string | null;
  posLabel: string | null;
  pattern: string | null;
  featuresJson: string | null;
  featuresRaw: string | null;
}

function mapWord(r: WordRow): Word {
  let features: MorphologyFeature[] = [];
  if (r.featuresJson) {
    try {
      features = JSON.parse(r.featuresJson) as MorphologyFeature[];
    } catch {
      features = [];
    }
  }
  return {
    id: r.id,
    surah: r.surah,
    ayah: r.ayah,
    position: r.position,
    textUthmani: r.textUthmani,
    transliteration: r.transliteration,
    root: r.root,
    rootTranslit: r.rootTranslit,
    lemma: r.lemma,
    pos: r.pos,
    posLabel: r.posLabel,
    pattern: r.pattern,
    features,
    featuresRaw: r.featuresRaw,
  };
}

interface SurahRow {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTransliteration: string;
  revelationPlace: string;
  ayahCount: number;
}

function mapSurah(r: SurahRow): Surah {
  return {
    number: r.number,
    nameArabic: r.nameArabic,
    nameEnglish: r.nameEnglish,
    nameTransliteration: r.nameTransliteration,
    revelationPlace: r.revelationPlace === 'Medinan' ? 'Medinan' : 'Meccan',
    ayahCount: r.ayahCount,
  };
}

/* ------------------------------------------------------------------ *
 * Schema
 * ------------------------------------------------------------------ */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS surahs (
  number INTEGER PRIMARY KEY,
  nameArabic TEXT, nameEnglish TEXT, nameTransliteration TEXT,
  revelationPlace TEXT, ayahCount INTEGER
);

CREATE TABLE IF NOT EXISTS ayahs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surah INTEGER NOT NULL, ayah INTEGER NOT NULL, textUthmani TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surah INTEGER NOT NULL, ayah INTEGER NOT NULL, position INTEGER NOT NULL,
  textUthmani TEXT NOT NULL, transliteration TEXT,
  root TEXT, rootTranslit TEXT, lemma TEXT,
  pos TEXT, posLabel TEXT, pattern TEXT,
  featuresJson TEXT, featuresRaw TEXT
);

CREATE TABLE IF NOT EXISTS lexicon_sources (
  id TEXT PRIMARY KEY, name TEXT, author TEXT, year TEXT,
  license TEXT, licenseStatus TEXT, attribution TEXT, isSample INTEGER
);

CREATE TABLE IF NOT EXISTS lexicon_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sourceId TEXT NOT NULL, root TEXT NOT NULL, rootTranslit TEXT
);

CREATE TABLE IF NOT EXISTS lexicon_senses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entryId INTEGER NOT NULL, ord INTEGER NOT NULL,
  definitionEn TEXT, definitionAr TEXT, notes TEXT
);

CREATE TABLE IF NOT EXISTS translators (
  id TEXT PRIMARY KEY, name TEXT, translator TEXT, year TEXT,
  language TEXT, direction TEXT, license TEXT, licenseStatus TEXT,
  attribution TEXT, enabled INTEGER, note TEXT, sortOrder INTEGER
);

CREATE TABLE IF NOT EXISTS translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  translatorId TEXT NOT NULL, surah INTEGER NOT NULL,
  ayah INTEGER NOT NULL, text TEXT NOT NULL
);
`;

const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_words_root ON words(root);
CREATE INDEX IF NOT EXISTS idx_words_surah_ayah ON words(surah, ayah, position);
CREATE INDEX IF NOT EXISTS idx_ayahs_surah_ayah ON ayahs(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_lex_entries_root ON lexicon_entries(root, sourceId);
CREATE INDEX IF NOT EXISTS idx_translations_sa ON translations(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_translations_translator ON translations(translatorId, surah, ayah);
`;

/* ------------------------------------------------------------------ *
 * Build (idempotent — rebuilds only when DATA_VERSION changes)
 * ------------------------------------------------------------------ */

async function rebuild(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DROP TABLE IF EXISTS surahs; DROP TABLE IF EXISTS ayahs; DROP TABLE IF EXISTS words;
    DROP TABLE IF EXISTS lexicon_sources; DROP TABLE IF EXISTS lexicon_entries; DROP TABLE IF EXISTS lexicon_senses;
    DROP TABLE IF EXISTS translators; DROP TABLE IF EXISTS translations;
  `);
  await db.execAsync(SCHEMA);

  await db.withTransactionAsync(async () => {
    // Surah metadata (all 114).
    const surahStmt = await db.prepareAsync(
      `INSERT OR REPLACE INTO surahs (number, nameArabic, nameEnglish, nameTransliteration, revelationPlace, ayahCount)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    try {
      for (const s of SURAH_META) {
        await surahStmt.executeAsync([
          s.number,
          s.nameArabic,
          s.nameEnglish,
          s.nameTransliteration,
          s.revelationPlace,
          s.ayahCount,
        ]);
      }
    } finally {
      await surahStmt.finalizeAsync();
    }

    // Layer 1 + 2: ayahs and words.
    const ayahStmt = await db.prepareAsync(
      `INSERT INTO ayahs (surah, ayah, textUthmani) VALUES (?, ?, ?)`,
    );
    const wordStmt = await db.prepareAsync(
      `INSERT INTO words (surah, ayah, position, textUthmani, transliteration, root, rootTranslit, lemma, pos, posLabel, pattern, featuresJson, featuresRaw)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    try {
      for (const file of SURAH_DATA_FILES) {
        const sNum = file.surah.number;
        for (const a of file.ayahs) {
          await ayahStmt.executeAsync([sNum, a.number, a.textUthmani]);
          for (const w of a.words) {
            await wordStmt.executeAsync([
              sNum,
              a.number,
              w.position,
              w.textUthmani,
              w.transliteration ?? null,
              w.root ?? null,
              w.rootTranslit ?? null,
              w.lemma ?? null,
              w.pos ?? null,
              w.posLabel ?? null,
              w.pattern ?? null,
              w.features ? JSON.stringify(w.features) : null,
              w.featuresRaw ?? null,
            ]);
          }
        }
      }
    } finally {
      await ayahStmt.finalizeAsync();
      await wordStmt.finalizeAsync();
    }

    // Layer 3: lexicon.
    const srcStmt = await db.prepareAsync(
      `INSERT OR REPLACE INTO lexicon_sources (id, name, author, year, license, licenseStatus, attribution, isSample)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const entryStmt = await db.prepareAsync(
      `INSERT INTO lexicon_entries (sourceId, root, rootTranslit) VALUES (?, ?, ?)`,
    );
    const senseStmt = await db.prepareAsync(
      `INSERT INTO lexicon_senses (entryId, ord, definitionEn, definitionAr, notes) VALUES (?, ?, ?, ?, ?)`,
    );
    try {
      for (const lex of LEXICON_FILES) {
        const src = lex.source;
        await srcStmt.executeAsync([
          src.id,
          src.name,
          src.author ?? null,
          src.year ?? null,
          src.license ?? null,
          src.licenseStatus,
          src.attribution ?? null,
          src.isSample ? 1 : 0,
        ]);
        for (const key of Object.keys(lex.entries)) {
          const entry = lex.entries[key];
          const res = await entryStmt.executeAsync([src.id, entry.root, entry.rootTranslit ?? null]);
          const entryId = res.lastInsertRowId;
          let ord = 0;
          for (const sense of entry.senses) {
            await senseStmt.executeAsync([
              entryId,
              ord++,
              sense.definitionEn ?? null,
              sense.definitionAr ?? null,
              sense.notes ?? null,
            ]);
          }
        }
      }
    } finally {
      await srcStmt.finalizeAsync();
      await entryStmt.finalizeAsync();
      await senseStmt.finalizeAsync();
    }

    // Layer 4: translators + translations.
    const trStmt = await db.prepareAsync(
      `INSERT OR REPLACE INTO translators (id, name, translator, year, language, direction, license, licenseStatus, attribution, enabled, note, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const txStmt = await db.prepareAsync(
      `INSERT INTO translations (translatorId, surah, ayah, text) VALUES (?, ?, ?, ?)`,
    );
    try {
      let order = 0;
      for (const file of TRANSLATION_FILES) {
        const t = file.translator;
        await trStmt.executeAsync([
          t.id,
          t.name,
          t.translator,
          t.year ?? null,
          t.language,
          t.direction,
          t.license,
          t.licenseStatus,
          t.attribution ?? null,
          t.enabled ? 1 : 0,
          t.note ?? null,
          order++,
        ]);
        for (const ref of Object.keys(file.verses)) {
          const [sStr, aStr] = ref.split(':');
          const surah = Number(sStr);
          const ayah = Number(aStr);
          if (!surah || !ayah) continue;
          await txStmt.executeAsync([t.id, surah, ayah, file.verses[ref]]);
        }
      }
    } finally {
      await trStmt.finalizeAsync();
      await txStmt.finalizeAsync();
    }
  });

  await db.execAsync(INDEXES);
  await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES ('dataVersion', ?)`, [
    String(DATA_VERSION),
  ]);
}

/** Open the read DB, building/rebuilding it if the bundled data version changed. */
export async function openReadDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(READ_DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);`);
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = 'dataVersion'`,
  );
  if (!row || row.value !== String(DATA_VERSION)) {
    await rebuild(db);
  }
  return db;
}

/* ------------------------------------------------------------------ *
 * Queries
 * ------------------------------------------------------------------ */

export async function getAllSurahs(db: SQLite.SQLiteDatabase): Promise<Surah[]> {
  const rows = await db.getAllAsync<SurahRow>(`SELECT * FROM surahs ORDER BY number ASC`);
  return rows.map(mapSurah);
}

export async function getSurah(db: SQLite.SQLiteDatabase, number: number): Promise<Surah | null> {
  const r = await db.getFirstAsync<SurahRow>(`SELECT * FROM surahs WHERE number = ?`, [number]);
  return r ? mapSurah(r) : null;
}

/** Surah numbers that actually have ayah/word data bundled. */
export async function getSurahsWithData(db: SQLite.SQLiteDatabase): Promise<Set<number>> {
  const rows = await db.getAllAsync<{ surah: number }>(`SELECT DISTINCT surah FROM ayahs`);
  return new Set(rows.map((r) => r.surah));
}

export async function getAyahsWithWords(
  db: SQLite.SQLiteDatabase,
  surah: number,
): Promise<AyahWithWords[]> {
  const ayahRows = await db.getAllAsync<Ayah & { id: number }>(
    `SELECT id, surah, ayah, textUthmani FROM ayahs WHERE surah = ? ORDER BY ayah ASC`,
    [surah],
  );
  const wordRows = await db.getAllAsync<WordRow>(
    `SELECT * FROM words WHERE surah = ? ORDER BY ayah ASC, position ASC`,
    [surah],
  );
  const byAyah = new Map<number, Word[]>();
  for (const wr of wordRows) {
    const list = byAyah.get(wr.ayah) ?? [];
    list.push(mapWord(wr));
    byAyah.set(wr.ayah, list);
  }
  return ayahRows.map((a) => ({ ...a, words: byAyah.get(a.ayah) ?? [] }));
}

export async function getAyahWithWords(
  db: SQLite.SQLiteDatabase,
  surah: number,
  ayah: number,
): Promise<AyahWithWords | null> {
  const a = await db.getFirstAsync<Ayah & { id: number }>(
    `SELECT id, surah, ayah, textUthmani FROM ayahs WHERE surah = ? AND ayah = ?`,
    [surah, ayah],
  );
  if (!a) return null;
  const wordRows = await db.getAllAsync<WordRow>(
    `SELECT * FROM words WHERE surah = ? AND ayah = ? ORDER BY position ASC`,
    [surah, ayah],
  );
  return { ...a, words: wordRows.map(mapWord) };
}

export async function getLexiconSources(db: SQLite.SQLiteDatabase): Promise<LexiconSource[]> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    author: string | null;
    year: string | null;
    license: string | null;
    licenseStatus: string;
    attribution: string | null;
    isSample: number;
  }>(`SELECT * FROM lexicon_sources`);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    author: r.author,
    year: r.year,
    license: r.license,
    licenseStatus: (r.licenseStatus as LexiconSource['licenseStatus']) ?? 'public-domain',
    attribution: r.attribution,
    isSample: r.isSample === 1,
  }));
}

export async function getLexiconEntry(
  db: SQLite.SQLiteDatabase,
  sourceId: string,
  root: string,
): Promise<LexiconEntry | null> {
  const entry = await db.getFirstAsync<{ id: number; sourceId: string; root: string; rootTranslit: string | null }>(
    `SELECT * FROM lexicon_entries WHERE sourceId = ? AND root = ?`,
    [sourceId, root],
  );
  if (!entry) return null;
  const senses = await db.getAllAsync<{
    ord: number;
    definitionEn: string | null;
    definitionAr: string | null;
    notes: string | null;
  }>(`SELECT ord, definitionEn, definitionAr, notes FROM lexicon_senses WHERE entryId = ? ORDER BY ord ASC`, [
    entry.id,
  ]);
  return {
    sourceId: entry.sourceId,
    root: entry.root,
    rootTranslit: entry.rootTranslit,
    senses: senses.map((s) => ({
      ord: s.ord,
      definitionEn: s.definitionEn,
      definitionAr: s.definitionAr,
      notes: s.notes,
    })),
  };
}

/** All lexicon entries for a root across every bundled source. */
export async function getLexiconEntriesForRoot(
  db: SQLite.SQLiteDatabase,
  root: string,
): Promise<LexiconEntry[]> {
  const sources = await getLexiconSources(db);
  const results: LexiconEntry[] = [];
  for (const src of sources) {
    const entry = await getLexiconEntry(db, src.id, root);
    if (entry) results.push(entry);
  }
  return results;
}

/** Root Explorer: every word sharing a root, with its surah names. */
export async function getRootOccurrences(
  db: SQLite.SQLiteDatabase,
  root: string,
): Promise<RootOccurrence[]> {
  const rows = await db.getAllAsync<WordRow & { nameEnglish: string; nameArabic: string }>(
    `SELECT w.*, s.nameEnglish, s.nameArabic
     FROM words w JOIN surahs s ON s.number = w.surah
     WHERE w.root = ?
     ORDER BY w.surah ASC, w.ayah ASC, w.position ASC`,
    [root],
  );
  return rows.map((r) => ({
    word: mapWord(r),
    surahNameEnglish: r.nameEnglish,
    surahNameArabic: r.nameArabic,
  }));
}

export async function getRootCount(db: SQLite.SQLiteDatabase, root: string): Promise<number> {
  const r = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM words WHERE root = ?`, [
    root,
  ]);
  return r?.n ?? 0;
}

function mapTranslator(r: {
  id: string;
  name: string;
  translator: string;
  year: string | null;
  language: string;
  direction: string;
  license: string;
  licenseStatus: string;
  attribution: string | null;
  enabled: number;
  note: string | null;
}): Translator {
  return {
    id: r.id,
    name: r.name,
    translator: r.translator,
    year: r.year,
    language: r.language,
    direction: r.direction === 'rtl' ? 'rtl' : 'ltr',
    license: r.license,
    licenseStatus: (r.licenseStatus as Translator['licenseStatus']) ?? 'public-domain',
    attribution: r.attribution,
    enabled: r.enabled === 1,
    note: r.note,
  };
}

export async function getTranslators(
  db: SQLite.SQLiteDatabase,
  onlyEnabled = false,
): Promise<Translator[]> {
  const rows = await db.getAllAsync<Parameters<typeof mapTranslator>[0]>(
    `SELECT * FROM translators ${onlyEnabled ? 'WHERE enabled = 1' : ''} ORDER BY sortOrder ASC`,
  );
  return rows.map(mapTranslator);
}

/** All reference translations available for one ayah (enabled + has text). */
export async function getTranslationsForAyah(
  db: SQLite.SQLiteDatabase,
  surah: number,
  ayah: number,
): Promise<{ translator: Translator; translation: Translation }[]> {
  const rows = await db.getAllAsync<
    Parameters<typeof mapTranslator>[0] & { text: string; tSurah: number; tAyah: number }
  >(
    `SELECT t.*, x.text as text, x.surah as tSurah, x.ayah as tAyah
     FROM translations x JOIN translators t ON t.id = x.translatorId
     WHERE x.surah = ? AND x.ayah = ? AND t.enabled = 1
     ORDER BY t.sortOrder ASC`,
    [surah, ayah],
  );
  return rows.map((r) => ({
    translator: mapTranslator(r),
    translation: { translatorId: r.id, surah: r.tSurah, ayah: r.tAyah, text: r.text },
  }));
}

export async function getTranslationText(
  db: SQLite.SQLiteDatabase,
  translatorId: string,
  surah: number,
  ayah: number,
): Promise<string | null> {
  const r = await db.getFirstAsync<{ text: string }>(
    `SELECT text FROM translations WHERE translatorId = ? AND surah = ? AND ayah = ?`,
    [translatorId, surah, ayah],
  );
  return r?.text ?? null;
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

export interface TranslationSearchHit {
  surah: number;
  ayah: number;
  translatorId: string;
  translatorName: string;
  text: string;
}

export async function searchTranslations(
  db: SQLite.SQLiteDatabase,
  query: string,
  limit = 60,
): Promise<TranslationSearchHit[]> {
  const q = `%${query.trim()}%`;
  const rows = await db.getAllAsync<TranslationSearchHit>(
    `SELECT x.surah as surah, x.ayah as ayah, x.translatorId as translatorId,
            t.translator as translatorName, x.text as text
     FROM translations x JOIN translators t ON t.id = x.translatorId
     WHERE t.enabled = 1 AND x.text LIKE ? COLLATE NOCASE
     ORDER BY x.surah ASC, x.ayah ASC
     LIMIT ?`,
    [q, limit],
  );
  return rows;
}

export interface RootSearchHit {
  root: string;
  rootTranslit: string | null;
  count: number;
}

/** Search distinct roots by Arabic letters or Latin transliteration. */
export async function searchRoots(
  db: SQLite.SQLiteDatabase,
  query: string,
  limit = 40,
): Promise<RootSearchHit[]> {
  const q = `%${query.trim()}%`;
  const rows = await db.getAllAsync<RootSearchHit>(
    `SELECT root, MAX(rootTranslit) as rootTranslit, COUNT(*) as count
     FROM words
     WHERE root IS NOT NULL AND (root LIKE ? OR rootTranslit LIKE ? COLLATE NOCASE)
     GROUP BY root
     ORDER BY count DESC
     LIMIT ?`,
    [q, q, limit],
  );
  return rows;
}
