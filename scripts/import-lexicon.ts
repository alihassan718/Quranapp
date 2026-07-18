/**
 * Importer B — Layer 3 lexicon (root → documented range of meanings).
 *
 * Source: the structured "Quran Arabic Roots — Lane's Lexicon" dataset
 * (1,651 Quranic roots; 1,337 carry verbatim Lane's definitions). We use ONLY
 * the verbatim `definition_en` (Lane's classical text) + `root`. Every
 * AI-generated field (summary_en, summary_tr, definition_tr) is EXCLUDED from
 * both the bundle and the app — nothing in Layer 3 may be fabricated.
 *
 * Underlying text: Edward William Lane, An Arabic-English Lexicon (1863) —
 * public domain — via the Perseus Digital Library digitization (CC BY-SA 3.0).
 * The bundled lexicon file is therefore treated as share-alike, NOT the source
 * repo's (incorrect) GPL label.
 *
 * Output: assets/data/lexicon/lane.json, in the existing LexiconFile schema.
 * The verbatim definition becomes a SINGLE sense (splitting it into senses
 * would be interpretive — forbidden). Roots without a Lane's definition
 * (source = "corpus_only") are left OUT and logged; they surface as null
 * meanings in the app, never invented.
 *
 * Root-key convention (SHARED with import-morphology.ts): Arabic letters,
 * space-separated, e.g. "ر ح م". Both importers must produce identical keys.
 *
 * Run:   node scripts/import-lexicon.ts
 * Input: data-sources/lane/quran-arabic-roots-lane-lexicon.json  (read-only)
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(path.dirname(process.argv[1]), '..');
const INPUT = path.join(ROOT, 'data-sources', 'lane', 'quran-arabic-roots-lane-lexicon.json');
const OUT = path.join(ROOT, 'assets', 'data', 'lexicon', 'lane.json');
const ASSETS = path.join(ROOT, 'assets', 'data');

/* ------------------------------------------------------------------ *
 * Root-key convention — Arabic letter → transliteration.
 * Shared, documented mapping (also used by import-morphology.ts).
 * ------------------------------------------------------------------ */

const AR_TO_TRANSLIT: Record<string, string> = {
  'ء': 'ʾ', 'أ': 'ʾ', 'إ': 'ʾ', 'آ': 'ʾ', 'ؤ': 'ʾ', 'ئ': 'ʾ', 'ٱ': 'ʾ',
  'ا': 'ā', 'ى': 'ā',
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'ḥ', 'خ': 'kh',
  'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
  'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ', 'ع': 'ʿ', 'غ': 'gh',
  'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'ة': 'h', 'و': 'w', 'ي': 'y',
};

/** Arabic diacritics/tatweel we strip when deriving the bare root key. */
const AR_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/**
 * Hamza/alef-seat normalization — the SHARED root-key rule (identical in
 * import-morphology.ts). QAC writes hamza-bearing roots with a bare alef
 * (أله → "Alh"); Lane's Arabic root field keeps the hamza (أله). Collapsing
 * both makes the two importers produce the same key. See scripts/QAC-MAPPING.md.
 */
const HAMZA_NORM: Record<string, string> = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ؤ': 'ء', 'ئ': 'ء',
};

/** Bare, hamza-normalized root letters: "أَله" → ["ا","ل","ه"]. */
function rootLetters(raw: string): string[] {
  return raw
    .replace(AR_MARKS, '')
    .trim()
    .split('')
    .filter((c) => c.trim().length > 0)
    .map((c) => HAMZA_NORM[c] ?? c);
}

/** Canonical space-separated key: "رحم" → "ر ح م". */
function canonicalRootKey(raw: string): string {
  return rootLetters(raw).join(' ');
}

/** Transliteration "r-ḥ-m" from Arabic root letters (null if any letter unmapped). */
function rootTranslit(raw: string): string | null {
  const parts = rootLetters(raw).map((c) => AR_TO_TRANSLIT[c]);
  if (parts.some((p) => p === undefined)) return null;
  return parts.join('-');
}

/* ------------------------------------------------------------------ */

function fail(msg: string): never {
  console.error(`\n✖ FATAL: ${msg}`);
  process.exit(1);
}

function stableJson(v: unknown): string {
  return JSON.stringify(v, null, 2) + '\n';
}

/** Sanity check (B4): reject empty/whitespace or letter-less noise. */
function isUsableDefinition(def: unknown): def is string {
  if (typeof def !== 'string') return false;
  const t = def.trim();
  if (t.length < 3) return false;
  // Must contain at least one Arabic or Latin letter (not pure punctuation/noise).
  return /[A-Za-zء-ي]/.test(t);
}

interface LaneRoot {
  root: string;
  root_buckwalter?: string;
  definition_en: string | null;
  quran_frequency?: number;
  source?: string;
  confidence?: string;
}

function main(): void {
  console.log('Importer B — Layer 3 lexicon (verbatim Lane\'s definitions only)\n');

  if (!fs.existsSync(INPUT)) {
    console.error(`Missing input: ${INPUT}`);
    console.error(
      '\nThis file is NOT email-gated — download it from the structured Lane\'s repo:' +
        '\n  https://github.com/aliozdenisik/quran-arabic-roots-lane-lexicon' +
        '\n  → quran_arabic_roots_lane_lexicon_*.json  (rename to quran-arabic-roots-lane-lexicon.json)',
    );
    process.exit(2);
  }

  const data = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
  const roots: LaneRoot[] = data.roots;
  if (!Array.isArray(roots) || !roots.length) fail('Input has no roots[] array');

  const entries: Record<string, unknown> = {};
  const excludedCorpusOnly: string[] = [];
  const excludedGarbled: string[] = [];
  const keyCollisions: string[] = [];
  let covered = 0;
  let coveredFreq = 0;
  let totalFreq = 0;

  // Frequency-weighted denominator uses every Quranic root's occurrence count.
  for (const r of roots) totalFreq += r.quran_frequency ?? 0;

  // Deterministic order: sort by canonical key so output is stable across runs.
  const sorted = [...roots].sort((a, b) => canonicalRootKey(a.root).localeCompare(canonicalRootKey(b.root)));

  for (const r of sorted) {
    const key = canonicalRootKey(r.root);
    if (!key) continue;

    if (!isUsableDefinition(r.definition_en)) {
      if ((r.source ?? '') === 'corpus_only' || r.definition_en == null) {
        excludedCorpusOnly.push(key);
      } else {
        excludedGarbled.push(key);
      }
      continue;
    }

    if (entries[key]) {
      keyCollisions.push(key);
      continue; // keep the first; never merge/rewrite
    }

    entries[key] = {
      root: key,
      rootTranslit: rootTranslit(r.root),
      senses: [
        {
          // VERBATIM Lane's text, byte-for-byte (incl. the U+0630 node markers).
          definitionEn: r.definition_en,
          definitionAr: null,
          notes: null,
        },
      ],
    };
    covered += 1;
    coveredFreq += r.quran_frequency ?? 0;
  }

  const out = {
    source: {
      id: 'lane',
      name: "Lane's Arabic-English Lexicon",
      author: 'Edward William Lane',
      year: '1863',
      license:
        'Underlying text is public domain (Edward William Lane, An Arabic-English Lexicon, 1863). ' +
        'Digitization by the Perseus Digital Library, Tufts University, under Creative Commons ' +
        'Attribution-ShareAlike 3.0 (CC BY-SA 3.0). This lexicon data file is redistributed under ' +
        'CC BY-SA 3.0; keep this notice and the share-alike terms. Only the verbatim English ' +
        'definitions are included — all AI-generated fields from the intermediate dataset were excluded.',
      licenseStatus: 'public-domain',
      attribution:
        "Edward William Lane, An Arabic-English Lexicon (1863), public domain; digitized by the " +
        'Perseus Digital Library, Tufts University (CC BY-SA 3.0).',
      isSample: false,
    },
    _note:
      'Layer 3. Each entry is the VERBATIM Lane\'s definition for that root, stored as a single ' +
      'sense (splitting into senses would be interpretive). Roots with no Lane\'s match are omitted ' +
      '(surface as null in-app). DATA UNDER TEST — not yet scholar-reviewed.',
    entries,
  };

  fs.writeFileSync(OUT, stableJson(out), 'utf-8');

  // Recompute the manifest version from full bundled-data content (idempotent,
  // order-independent) so the app rebuilds its SQLite DB on next launch.
  recomputeManifestVersion();

  /* ---- Coverage report ---- */
  const totalRoots = roots.length;
  const rootPct = ((covered / totalRoots) * 100).toFixed(1);
  const freqPct = totalFreq ? ((coveredFreq / totalFreq) * 100).toFixed(1) : 'n/a';

  console.log(`Wrote ${OUT}`);
  console.log('\n──────────── LEXICON COVERAGE ────────────');
  console.log(`Quranic roots (from dataset) : ${totalRoots}`);
  console.log(`Roots with verbatim Lane's   : ${covered}  (${rootPct}%)`);
  console.log(`Excluded — corpus_only/null  : ${excludedCorpusOnly.length}  (no Lane's entry; stay null in-app)`);
  console.log(`Excluded — failed sanity     : ${excludedGarbled.length}${excludedGarbled.length ? '  → ' + excludedGarbled.join(', ') : ''}`);
  console.log(`Key collisions (kept first)  : ${keyCollisions.length}${keyCollisions.length ? '  → ' + keyCollisions.join(', ') : ''}`);
  console.log(`Root-level coverage          : ${rootPct}%`);
  console.log(`Frequency-weighted coverage  : ${freqPct}%  (share of root-bearing word occurrences whose root has a Lane's entry)`);
  console.log('\nNote: the DEFINITIVE word-level coverage + top uncovered roots come from');
  console.log('the combined validation after Importer A assigns a root to each word.');
  console.log('\nDone. Re-running with the same input reproduces byte-identical output.');
}

/** Manifest version = sha256 over every bundled data file (deterministic). */
function recomputeManifestVersion(): void {
  const files: string[] = [];
  const quranDir = path.join(ASSETS, 'quran');
  for (const f of fs.readdirSync(quranDir).sort()) if (f.endsWith('.json')) files.push(path.join(quranDir, f));
  const trDir = path.join(ASSETS, 'translations');
  for (const f of fs.readdirSync(trDir).sort()) if (f.endsWith('.json')) files.push(path.join(trDir, f));
  files.push(OUT);
  const h = crypto.createHash('sha256');
  for (const f of files) h.update(fs.readFileSync(f));
  const manifestPath = path.join(ASSETS, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  manifest.version = parseInt(h.digest('hex').slice(0, 8), 16);
  fs.writeFileSync(manifestPath, stableJson(manifest), 'utf-8');
  console.log(`manifest version → ${manifest.version}`);
}

main();
