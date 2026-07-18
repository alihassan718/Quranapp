/**
 * Tanzil importer — Layers 1 (Uthmani text) and 4 (reference translations).
 *
 * Converts raw Tanzil source files into the app's exact bundled-data schema
 * (see src/data/schema.ts and assets/data/quran/001.json). It NEVER invents
 * content: every value is copied verbatim from a source file; anything a
 * source doesn't provide is written as explicit null / [] and reported.
 *
 * Layers 2 (morphology, Quranic Arabic Corpus) and 3 (lexicon, Lane) are NOT
 * imported here — every word's morphology fields are emitted as null so a
 * later importer can fill them without reshaping the files.
 *
 * Run:            node scripts/import-tanzil.ts
 * Expected input (place downloads here; nothing is fetched from the network):
 *   data-sources/tanzil/quran-uthmani.xml   Tanzil "Uthmani" text, XML format
 *   data-sources/tanzil/en.yusufali.txt     Tanzil translation, text format
 *   data-sources/tanzil/en.pickthall.txt    Tanzil translation, text format
 *   data-sources/tanzil/en.shakir.txt       Tanzil translation, text format
 *
 * Download recipe (documented in DATA_NOTES.md):
 *   Text  : https://tanzil.net/download/ → Quran text "Uthmani", format "XML".
 *           Leave pause marks / sajdah signs UNCHECKED so that word tokens
 *           align 1:1 with Quranic Arabic Corpus positions for the later
 *           Layer-2 import.
 *   Trans.: https://tanzil.net/trans/ → en.yusufali / en.pickthall / en.shakir,
 *           "Text" format.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

/* ------------------------------------------------------------------ *
 * Paths
 * ------------------------------------------------------------------ */

// argv[1] is this script's absolute path — works in both CJS and ESM modes.
const ROOT = path.resolve(path.dirname(process.argv[1]), '..');
const SRC_DIR = path.join(ROOT, 'data-sources', 'tanzil');
const OUT_QURAN_DIR = path.join(ROOT, 'assets', 'data', 'quran');
const OUT_TRANS_DIR = path.join(ROOT, 'assets', 'data', 'translations');
const SURAHS_META_PATH = path.join(ROOT, 'assets', 'data', 'surahs.json');
const MANIFEST_PATH = path.join(ROOT, 'assets', 'data', 'manifest.json');
const REGISTRY_PATH = path.join(ROOT, 'src', 'data', 'registry.ts');

const INPUT_QURAN_XML = path.join(SRC_DIR, 'quran-uthmani.xml');
const TRANSLATIONS: { id: string; file: string }[] = [
  { id: 'yusufali', file: path.join(SRC_DIR, 'en.yusufali.txt') },
  { id: 'pickthall', file: path.join(SRC_DIR, 'en.pickthall.txt') },
  { id: 'shakir', file: path.join(SRC_DIR, 'en.shakir.txt') },
];

/* ------------------------------------------------------------------ *
 * Canonical constants (structure only — never content)
 * ------------------------------------------------------------------ */

/** Kufan verse counts per surah, 1..114. Total = 6236. */
const CANONICAL_AYAH_COUNTS: number[] = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];
const TOTAL_AYAT = 6236;

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

let failures = 0;
const warnings: string[] = [];

function fail(msg: string): never {
  console.error(`\n✖ FATAL: ${msg}`);
  process.exit(1);
}

function warn(msg: string): void {
  warnings.push(msg);
  console.warn(`  ⚠ ${msg}`);
}

function assertOrFail(cond: boolean, msg: string): void {
  if (!cond) fail(msg);
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

/** Serialize with stable key order (insertion order) + 2-space indent + LF. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

/** True if the token contains at least one Arabic letter (not only marks). */
function hasArabicLetter(token: string): boolean {
  return /[ء-يٱ-ۓۺ-ۿ]/u.test(token);
}

/* ------------------------------------------------------------------ *
 * Input parsing
 * ------------------------------------------------------------------ */

interface TanzilQuran {
  /** surah -> ayah -> verbatim text */
  verses: Map<number, Map<number, string>>;
  /** surah -> bismillah attribute if present on its first aya */
  bismillah: Map<number, string>;
}

function parseTanzilXml(filePath: string): TanzilQuran {
  const xml = fs.readFileSync(filePath, 'utf-8');
  const verses = new Map<number, Map<number, string>>();
  const bismillah = new Map<number, string>();

  const suraRe = /<sura\b([^>]*?)>([\s\S]*?)<\/sura>/g;
  const attr = (attrs: string, name: string): string | null => {
    const m = attrs.match(new RegExp(`${name}="([^"]*)"`));
    return m ? decodeXmlEntities(m[1]) : null;
  };

  let suraMatch: RegExpExecArray | null;
  while ((suraMatch = suraRe.exec(xml)) !== null) {
    const suraIndex = Number(attr(suraMatch[1], 'index'));
    assertOrFail(
      Number.isInteger(suraIndex) && suraIndex >= 1 && suraIndex <= 114,
      `Bad sura index in XML: ${suraMatch[1]}`,
    );
    assertOrFail(!verses.has(suraIndex), `Duplicate sura ${suraIndex} in XML`);
    const ayaMap = new Map<number, string>();

    // Fresh regex per sura: a shared /g regex would carry lastIndex across
    // iterations and silently skip ayat.
    const ayaRe = /<aya\b([^>]*?)\/>/g;
    let ayaMatch: RegExpExecArray | null;
    while ((ayaMatch = ayaRe.exec(suraMatch[2])) !== null) {
      const attrs = ayaMatch[1];
      const ayaIndex = Number(attr(attrs, 'index'));
      const text = attr(attrs, 'text');
      assertOrFail(
        Number.isInteger(ayaIndex) && ayaIndex >= 1,
        `Bad aya index in sura ${suraIndex}: ${attrs}`,
      );
      assertOrFail(text !== null && text.length > 0, `Missing text at ${suraIndex}:${ayaIndex}`);
      assertOrFail(!ayaMap.has(ayaIndex), `Duplicate aya ${suraIndex}:${ayaIndex}`);
      const bism = attr(attrs, 'bismillah');
      if (bism) bismillah.set(suraIndex, bism);
      ayaMap.set(ayaIndex, text as string);
    }
    verses.set(suraIndex, ayaMap);
  }

  assertOrFail(verses.size === 114, `Expected 114 surahs in XML, found ${verses.size}`);
  return { verses, bismillah };
}

/** Tanzil text format: `sura|aya|text` lines; `#` comments and blanks ignored. */
function parseTanzilTranslationTxt(filePath: string, id: string): Map<string, string> {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, '');
  const out = new Map<string, string>();
  for (const [lineNo, line] of raw.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^(\d+)\|(\d+)\|(.*)$/s);
    if (!m) {
      fail(`${id}: unparseable line ${lineNo + 1}: ${trimmed.slice(0, 80)}`);
    }
    const key = `${Number(m[1])}:${Number(m[2])}`;
    assertOrFail(!out.has(key), `${id}: duplicate verse ${key}`);
    assertOrFail(m[3].length > 0, `${id}: empty text for ${key}`);
    out.set(key, m[3]);
  }
  assertOrFail(out.size > 0, `${id}: no verses parsed — is this Tanzil "Text" format?`);
  return out;
}

/* ------------------------------------------------------------------ *
 * Output shapes (mirrors src/data/schema.ts, in exact key order of
 * assets/data/quran/001.json — the authoritative worked example)
 * ------------------------------------------------------------------ */

interface OutWord {
  position: number;
  textUthmani: string;
  transliteration: null;
  root: null;
  rootTranslit: null;
  lemma: null;
  pos: null;
  posLabel: null;
  pattern: null;
  features: never[];
  featuresRaw: null;
}

function makeWord(position: number, textUthmani: string): OutWord {
  return {
    position,
    textUthmani,
    transliteration: null,
    root: null,
    rootTranslit: null,
    lemma: null,
    pos: null,
    posLabel: null,
    pattern: null,
    features: [],
    featuresRaw: null,
  };
}

/** Validate an output surah file against the schema inferred from 001.json. */
function validateSurahFile(f: Record<string, unknown>, expectAyahs: number): string[] {
  const errs: string[] = [];
  const s = f.surah as Record<string, unknown>;
  if (typeof s.number !== 'number') errs.push('surah.number not number');
  for (const k of ['nameArabic', 'nameEnglish', 'nameTransliteration'] as const) {
    if (typeof s[k] !== 'string' || !(s[k] as string).length) errs.push(`surah.${k} invalid`);
  }
  if (s.revelationPlace !== 'Meccan' && s.revelationPlace !== 'Medinan')
    errs.push('surah.revelationPlace invalid');
  if (s.ayahCount !== expectAyahs) errs.push('surah.ayahCount mismatch');
  const ayahs = f.ayahs as Record<string, unknown>[];
  if (!Array.isArray(ayahs) || ayahs.length !== expectAyahs)
    errs.push(`ayahs length ${Array.isArray(ayahs) ? ayahs.length : '??'} != ${expectAyahs}`);
  for (const a of ayahs ?? []) {
    if (typeof a.number !== 'number' || typeof a.textUthmani !== 'string' || !(a.textUthmani as string).length) {
      errs.push(`ayah ${a.number}: bad number/text`);
      continue;
    }
    const words = a.words as Record<string, unknown>[];
    if (!Array.isArray(words) || words.length === 0) {
      errs.push(`ayah ${a.number}: no words`);
      continue;
    }
    for (const [i, w] of words.entries()) {
      if (w.position !== i + 1) errs.push(`ayah ${a.number} word ${i + 1}: bad position`);
      if (typeof w.textUthmani !== 'string' || !(w.textUthmani as string).length)
        errs.push(`ayah ${a.number} word ${i + 1}: bad textUthmani`);
      if (!Array.isArray(w.features) || (w.features as unknown[]).length !== 0)
        errs.push(`ayah ${a.number} word ${i + 1}: features must be []`);
      for (const k of ['transliteration', 'root', 'rootTranslit', 'lemma', 'pos', 'posLabel', 'pattern', 'featuresRaw'] as const) {
        if (w[k] !== null) errs.push(`ayah ${a.number} word ${i + 1}: ${k} must be null (Layer 2 not imported)`);
      }
    }
  }
  return errs;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

function main(): void {
  console.log('Tanzil importer — Layers 1 + 4 (morphology/lexicon deliberately untouched)\n');

  /* ---- Step 0: inputs present? ---- */
  const missing: string[] = [];
  if (!fs.existsSync(INPUT_QURAN_XML)) missing.push(INPUT_QURAN_XML);
  for (const t of TRANSLATIONS) if (!fs.existsSync(t.file)) missing.push(t.file);
  if (missing.length) {
    console.error('Missing input files:\n' + missing.map((m) => `  - ${m}`).join('\n'));
    console.error(
      '\nDownload from Tanzil (see DATA_NOTES.md → "Importing the full Qur\'an"):' +
        '\n  https://tanzil.net/download/  → Uthmani, XML  → quran-uthmani.xml' +
        '\n  https://tanzil.net/trans/     → en.yusufali / en.pickthall / en.shakir (Text format)',
    );
    process.exit(2);
  }

  /* ---- Load reference meta (canonical names for all 114 surahs) ---- */
  const surahsMeta: {
    number: number;
    nameArabic: string;
    nameEnglish: string;
    nameTransliteration: string;
    revelationPlace: 'Meccan' | 'Medinan';
    ayahCount: number;
  }[] = JSON.parse(fs.readFileSync(SURAHS_META_PATH, 'utf-8'));
  assertOrFail(surahsMeta.length === 114, 'surahs.json must contain 114 entries');
  for (const [i, count] of CANONICAL_AYAH_COUNTS.entries()) {
    assertOrFail(
      surahsMeta[i].ayahCount === count,
      `surahs.json ayahCount for surah ${i + 1} (${surahsMeta[i].ayahCount}) != canonical ${count}`,
    );
  }

  /* ---- Parse inputs ---- */
  console.log('Parsing quran-uthmani.xml …');
  const quran = parseTanzilXml(INPUT_QURAN_XML);

  const transMaps = new Map<string, Map<string, string>>();
  for (const t of TRANSLATIONS) {
    console.log(`Parsing ${path.basename(t.file)} …`);
    transMaps.set(t.id, parseTanzilTranslationTxt(t.file, t.id));
  }

  /* ---- Alignment assertions: same numbering across text + all translations ---- */
  console.log('\nValidating verse alignment against canonical Kufan counts …');
  let totalAyat = 0;
  let totalWords = 0;
  let markOnlyTokens = 0;
  const perSurah: string[] = [];

  for (let s = 1; s <= 114; s++) {
    const expect = CANONICAL_AYAH_COUNTS[s - 1];
    const ayaMap = quran.verses.get(s);
    assertOrFail(!!ayaMap, `Surah ${s} missing from XML`);
    assertOrFail(
      ayaMap!.size === expect,
      `Surah ${s}: XML has ${ayaMap!.size} ayat, canonical is ${expect}`,
    );
    for (let a = 1; a <= expect; a++) {
      assertOrFail(ayaMap!.has(a), `Surah ${s}: aya ${a} missing from XML`);
      for (const t of TRANSLATIONS) {
        assertOrFail(
          transMaps.get(t.id)!.has(`${s}:${a}`),
          `${t.id}: verse ${s}:${a} missing — numbering misaligned or file truncated`,
        );
      }
    }
    totalAyat += expect;
    perSurah.push(`${s}:${expect}`);
  }
  for (const t of TRANSLATIONS) {
    const size = transMaps.get(t.id)!.size;
    assertOrFail(
      size === TOTAL_AYAT,
      `${t.id}: ${size} verses, expected exactly ${TOTAL_AYAT} (extra/missing lines)`,
    );
  }
  assertOrFail(totalAyat === TOTAL_AYAT, `Total ayat ${totalAyat} != ${TOTAL_AYAT}`);
  console.log(`  ✓ 114 surahs, ${TOTAL_AYAT} ayat, aligned across Arabic + ${TRANSLATIONS.length} translations`);

  /* ---- Sanity: bismillah handling ---- */
  // Tanzil XML keeps the bismillah OUT of verse text (attribute on aya 1),
  // except surah 1 where it IS verse 1, and surah 9 which has none.
  assertOrFail(!quran.bismillah.has(1) && !quran.bismillah.has(9), 'Unexpected bismillah attribute on surah 1 or 9');

  /* ---- Build + validate + write surah files ---- */
  console.log('\nWriting assets/data/quran/001.json … 114.json');
  const emittedHashes: string[] = [];
  for (let s = 1; s <= 114; s++) {
    const meta = surahsMeta[s - 1];
    const ayaMap = quran.verses.get(s)!;
    const ayahs = [];
    for (let a = 1; a <= meta.ayahCount; a++) {
      const text = ayaMap.get(a)!;
      const tokens = text.split(' ').filter((tok) => tok.length > 0);
      assertOrFail(tokens.length > 0, `Surah ${s}:${a} has no word tokens`);
      for (const tok of tokens) {
        if (!hasArabicLetter(tok)) markOnlyTokens++;
      }
      totalWords += tokens.length;
      ayahs.push({
        number: a,
        textUthmani: text,
        words: tokens.map((tok, i) => makeWord(i + 1, tok)),
      });
    }

    const file: Record<string, unknown> = {
      surah: {
        number: meta.number,
        nameArabic: meta.nameArabic,
        nameEnglish: meta.nameEnglish,
        nameTransliteration: meta.nameTransliteration,
        revelationPlace: meta.revelationPlace,
        ayahCount: meta.ayahCount,
        ...(s === 1 ? { bismillahIsFirstAyah: true } : {}),
      },
      _note:
        'Layer 1 (Arabic, verbatim): Tanzil Project Uthmani text, tanzil.net, CC BY 3.0 — attribution required. ' +
        'Layer 2 (morphology): NOT YET IMPORTED — all word fields are null pending the Quranic Arabic Corpus import; do not hand-fill.',
      ayahs,
    };

    const errs = validateSurahFile(file, meta.ayahCount);
    if (errs.length) fail(`Schema validation failed for surah ${s}:\n  ${errs.join('\n  ')}`);

    const json = stableJson(file);
    const outPath = path.join(OUT_QURAN_DIR, `${String(s).padStart(3, '0')}.json`);
    fs.writeFileSync(outPath, json, 'utf-8');
    emittedHashes.push(crypto.createHash('sha256').update(json).digest('hex'));
  }
  console.log(`  ✓ 114 files, ${totalWords} word tokens`);
  if (markOnlyTokens > 0) {
    warn(
      `${markOnlyTokens} tokens contain no Arabic letters (pause/sajdah marks downloaded as separate tokens). ` +
        'Text preserved verbatim, but these will NOT align with Quranic Arabic Corpus word positions. ' +
        'Recommended: re-download from tanzil.net WITHOUT pause marks before the Layer-2 import.',
    );
  }

  /* ---- Regenerate translation files (preserve existing translator metadata) ---- */
  console.log('\nWriting assets/data/translations/{yusufali,pickthall,shakir}.json');
  for (const t of TRANSLATIONS) {
    const outPath = path.join(OUT_TRANS_DIR, `${t.id}.json`);
    assertOrFail(fs.existsSync(outPath), `Existing translator file missing: ${outPath} — the importer preserves its metadata and cannot invent it`);
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    const translator = { ...existing.translator };
    translator.note =
      'Verse text imported verbatim from the Tanzil Project distribution (tanzil.net); include Tanzil\'s translation notice. ' +
      (t.id === 'shakir'
        ? 'Public-domain status CONTESTED — left disabled by default; enable deliberately if you accept the risk.'
        : 'Widely treated as public domain.');

    const verses: Record<string, string> = {};
    for (let s = 1; s <= 114; s++) {
      for (let a = 1; a <= CANONICAL_AYAH_COUNTS[s - 1]; a++) {
        const key = `${s}:${a}`;
        verses[key] = transMaps.get(t.id)!.get(key)!;
      }
    }
    const json = stableJson({ translator, verses });
    fs.writeFileSync(outPath, json, 'utf-8');
    emittedHashes.push(crypto.createHash('sha256').update(json).digest('hex'));
    console.log(`  ✓ ${t.id}: ${Object.keys(verses).length} verses (enabled: ${translator.enabled})`);
  }

  /* ---- Update registry.ts exactly like a hand-added surah would ---- */
  console.log('\nUpdating src/data/registry.ts');
  let registry = fs.readFileSync(REGISTRY_PATH, 'utf-8');

  const importLines = Array.from({ length: 114 }, (_, i) => {
    const n = String(i + 1).padStart(3, '0');
    return `import surah${n} from '../../assets/data/quran/${n}.json';`;
  }).join('\n');
  const importBlockRe = /(?:^import surah\d{3} from '\.\.\/\.\.\/assets\/data\/quran\/\d{3}\.json';\n)+/m;
  assertOrFail(importBlockRe.test(registry), 'registry.ts: surah import block not found — file changed shape');
  registry = registry.replace(importBlockRe, importLines + '\n');

  const arrayLines =
    'export const SURAH_DATA_FILES: SurahDataFile[] = [\n' +
    Array.from({ length: 114 }, (_, i) => `  surah${String(i + 1).padStart(3, '0')} as unknown as SurahDataFile,`).join('\n') +
    '\n];';
  const arrayRe = /export const SURAH_DATA_FILES: SurahDataFile\[\] = \[[\s\S]*?\];/m;
  assertOrFail(arrayRe.test(registry), 'registry.ts: SURAH_DATA_FILES array not found — file changed shape');
  registry = registry.replace(arrayRe, arrayLines);
  fs.writeFileSync(REGISTRY_PATH, registry, 'utf-8');
  console.log('  ✓ 114 surah files registered');

  /* ---- Manifest: content-derived version (idempotent re-runs) ---- */
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const contentHash = crypto.createHash('sha256').update(emittedHashes.join('')).digest('hex');
  manifest.version = parseInt(contentHash.slice(0, 8), 16);
  manifest.availableSurahs = Array.from({ length: 114 }, (_, i) => i + 1);
  fs.writeFileSync(MANIFEST_PATH, stableJson(manifest), 'utf-8');
  console.log(`  ✓ manifest version → ${manifest.version} (sha256-derived; app rebuilds its SQLite DB on next launch)`);

  /* ---- Summary ---- */
  console.log('\n──────────── IMPORT SUMMARY ────────────');
  console.log(`Surah files written : 114 (assets/data/quran/001.json … 114.json)`);
  console.log(`Total ayat          : ${totalAyat} (canonical ✓)`);
  console.log(`Total word tokens   : ${totalWords}`);
  console.log(`Translations        : ${TRANSLATIONS.map((t) => t.id).join(', ')} — ${TOTAL_AYAT} verses each, fully aligned`);
  console.log(`Per-surah counts    : ${perSurah.join(' ')}`);
  console.log('\nStill EMPTY by design (must be supplied later — do not hand-fill):');
  console.log('  • Layer 2 morphology (root/lemma/POS/features): all null — import from the');
  console.log('    Quranic Arabic Corpus (attribution required) with a dedicated importer.');
  console.log('  • Layer 3 lexicon: assets/data/lexicon/lane.json is still the flagged sample.');
  console.log('\nAttribution obligations now active (already on the Credits screen):');
  console.log('  • Tanzil Qur\'an text — CC BY 3.0, tanzil.net');
  console.log('  • Tanzil translation distribution notice for Yusuf Ali / Pickthall / Shakir');
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s) — see above.`);
  }
  console.log('\nDone. Re-running with the same inputs reproduces byte-identical output.');
}

main();
