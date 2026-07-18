/**
 * Importer A — Layer 2 morphology (per-word root / lemma / POS / features).
 *
 * Source: Quranic Arabic Corpus, morphology version 0.4 (Kais Dukes, 2011),
 * GNU GPL — used verbatim, with attribution to the Quranic Arabic Corpus and a
 * link to http://corpus.quran.com (see the Credits screen).
 *
 * The QAC data is SEGMENT-based: each word is split into prefix / stem / suffix
 * rows keyed by (surah:ayah:word:segment). This importer reassembles the
 * segments into whole words, converts Buckwalter → Arabic, maps QAC tag codes
 * to the plain-language grammar the Word Panel shows, and fills the null
 * morphology fields in the existing assets/data/quran/NNN.json files IN PLACE.
 *
 * It NEVER fabricates: per-word English glosses stay null (no clean-licensed
 * source — see DATA_NOTES.md), `pattern`/`transliteration` stay null (QAC 0.4
 * carries neither), and any word whose ayah fails the word-count alignment
 * check keeps null morphology and is logged — never guessed.
 *
 * Alignment is POSITIONAL by (surah, ayah, word-index). The stored Tanzil text
 * is NEVER modified; a diacritic-stripping normalization is used ONLY to
 * cross-check that reassembled QAC forms line up with our word tokens.
 *
 * Root-key convention (SHARED with import-lexicon.ts): Buckwalter → Arabic,
 * hamza/alef-seat normalized, space-separated ("ا ل ه"). Documented in
 * scripts/QAC-MAPPING.md.
 *
 * Run:   node scripts/import-morphology.ts
 * Input: data-sources/qac/quranic-corpus-morphology-0.4.txt  (read-only)
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(path.dirname(process.argv[1]), '..');
const INPUT = path.join(ROOT, 'data-sources', 'qac', 'quranic-corpus-morphology-0.4.txt');
const QURAN_DIR = path.join(ROOT, 'assets', 'data', 'quran');
const ASSETS = path.join(ROOT, 'assets', 'data');

/* ================================================================== *
 * Buckwalter → Arabic (letters + diacritics). Standard Buckwalter.
 * ================================================================== */

const BW2AR: Record<string, string> = {
  "'": 'ء', '>': 'أ', '<': 'إ', '&': 'ؤ', '}': 'ئ', '|': 'آ', '{': 'ٱ',
  A: 'ا', b: 'ب', p: 'ة', t: 'ت', v: 'ث', j: 'ج', H: 'ح', x: 'خ',
  d: 'د', '*': 'ذ', r: 'ر', z: 'ز', s: 'س', $: 'ش', S: 'ص', D: 'ض',
  T: 'ط', Z: 'ظ', E: 'ع', g: 'غ', f: 'ف', q: 'ق', k: 'ك', l: 'ل',
  m: 'م', n: 'ن', h: 'ه', w: 'و', Y: 'ى', y: 'ي', _: 'ـ',
  // diacritics
  a: 'َ', u: 'ُ', i: 'ِ', F: 'ً', N: 'ٌ',
  K: 'ٍ', '~': 'ّ', o: 'ْ', '`': 'ٰ',
};

function bw2ar(bw: string): string {
  let out = '';
  for (const c of bw) out += BW2AR[c] ?? c;
  return out;
}

/* Root-key normalization — identical rule in import-lexicon.ts. */
const HAMZA_NORM: Record<string, string> = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ؤ': 'ء', 'ئ': 'ء',
};
const AR_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** QAC Buckwalter root ("Alh") → canonical space-separated key ("ا ل ه"). */
function rootKeyFromBuckwalter(bwRoot: string): string {
  const ar = bw2ar(bwRoot).replace(AR_MARKS, '');
  return ar
    .split('')
    .filter((c) => c.trim().length > 0)
    .map((c) => HAMZA_NORM[c] ?? c)
    .join(' ');
}

const AR_TO_TRANSLIT: Record<string, string> = {
  'ء': 'ʾ', 'ا': 'ā', 'ى': 'ā', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j',
  'ح': 'ḥ', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's',
  'ش': 'sh', 'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ', 'ع': 'ʿ', 'غ': 'gh',
  'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h',
  'ة': 'h', 'و': 'w', 'ي': 'y',
};

function rootTranslitFromKey(key: string): string | null {
  if (!key) return null;
  const parts = key.split(' ').map((c) => AR_TO_TRANSLIT[c]);
  return parts.some((p) => p === undefined) ? null : parts.join('-');
}

/* ================================================================== *
 * QAC tag / feature → plain-language grammar (documented mapping).
 * ================================================================== */

const POS_LABEL: Record<string, string> = {
  N: 'Noun', PN: 'Proper noun', ADJ: 'Adjective', V: 'Verb', PRON: 'Pronoun',
  DEM: 'Demonstrative pronoun', REL: 'Relative pronoun', P: 'Preposition',
  T: 'Time adverb', LOC: 'Location adverb', DET: 'Determiner',
  CONJ: 'Conjunction', SUB: 'Subordinating conjunction', ACC: 'Accusative particle',
  NEG: 'Negative particle', PRO: 'Prohibition particle', INTG: 'Interrogative particle',
  COND: 'Conditional particle', RES: 'Restriction particle', EXP: 'Exceptive particle',
  AVR: 'Aversion particle', CERT: 'Particle of certainty', RSLT: 'Result particle',
  CAUS: 'Particle of cause', AMD: 'Amendment particle', ANS: 'Answer particle',
  INC: 'Inceptive particle', SUR: 'Surprise particle', REM: 'Resumption particle',
  EMPH: 'Emphatic particle', IMPV: 'Imperative verb', VOC: 'Vocative particle',
  INL: 'Quranic initials', INTG_: 'Interrogative', FUT: 'Future particle',
  EQ: 'Equalization particle', RET: 'Retraction particle', PREV: 'Preventive particle',
  CIRC: 'Circumstantial particle', COM: 'Comitative particle', INTJ: 'Interjection',
  SUP: 'Supplemental particle', EXH: 'Exhortation particle', EXL: 'Explanation particle',
};

/** QAC prefix segment codes (before '+') → plain description. */
const PREFIX_LABEL: Record<string, string> = {
  bi: 'bi- (preposition "with/in")', ka: 'ka- (preposition "like")',
  ta: 'ta- (oath preposition)', wa: 'wa- (preposition "by", oath)',
  Al: 'al- (definite article)', l: 'li- (preposition/particle "to/for")',
  w: 'wa- (conjunction "and")', f: 'fa- (conjunction "then/so")',
  s: 'sa- (future particle)', 'A': 'a- (interrogative)', ya: 'yā- (vocative)',
  ha: 'hā- (attention particle)', 'la': 'la- (emphatic prefix)',
};

const CASE_LABEL: Record<string, string> = { NOM: 'Nominative', ACC: 'Accusative', GEN: 'Genitive' };
const STATE_LABEL: Record<string, string> = { DEF: 'Definite', INDEF: 'Indefinite' };
const MOOD_LABEL: Record<string, string> = { IND: 'Indicative', SUBJ: 'Subjunctive', JUS: 'Jussive' };
const VOICE_LABEL: Record<string, string> = { ACT: 'Active', PASS: 'Passive' };
const ASPECT_LABEL: Record<string, string> = { PERF: 'Perfect', IMPF: 'Imperfect', IMPV: 'Imperative' };
const GENDER_LABEL: Record<string, string> = { M: 'Masculine', F: 'Feminine' };
const NUMBER_LABEL: Record<string, string> = { S: 'Singular', D: 'Dual', P: 'Plural' };
const FORM_SET = new Set(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']);

interface Feature {
  label: string;
  value: string;
}

/** A single parsed QAC segment. */
interface Segment {
  seg: number;
  form: string; // Buckwalter
  tag: string;
  type: 'PREFIX' | 'STEM' | 'SUFFIX' | 'OTHER';
  featureTokens: string[]; // raw tokens after the type marker
  rawFeatures: string;
  pos: string | null;
  lemma: string | null; // Buckwalter
  root: string | null; // Buckwalter
}

function parseSegment(location: number[], form: string, tag: string, features: string): Segment {
  const tokens = features.split('|');
  let type: Segment['type'] = 'OTHER';
  if (tokens[0] === 'PREFIX') type = 'PREFIX';
  else if (tokens[0] === 'STEM') type = 'STEM';
  else if (tokens[0] === 'SUFFIX') type = 'SUFFIX';

  let pos: string | null = null;
  let lemma: string | null = null;
  let root: string | null = null;
  const featureTokens: string[] = [];
  for (const tok of tokens) {
    if (tok === 'PREFIX' || tok === 'STEM' || tok === 'SUFFIX') continue;
    if (tok.startsWith('POS:')) pos = tok.slice(4);
    else if (tok.startsWith('LEM:')) lemma = tok.slice(4);
    else if (tok.startsWith('ROOT:')) root = tok.slice(5);
    else featureTokens.push(tok);
  }
  // Prefix/suffix rows carry their category in the TAG, not POS.
  if (!pos && (type === 'PREFIX' || type === 'SUFFIX')) pos = tag;
  return { seg: location[3], form, tag, type, featureTokens, rawFeatures: features, pos, lemma, root };
}

/** Turn a word's segments into the plain-language feature list. */
function buildFeatures(segments: Segment[]): Feature[] {
  const features: Feature[] = [];

  // Prefixes (in order).
  for (const s of segments.filter((x) => x.type === 'PREFIX')) {
    // Prefix form encodes the clitic, e.g. "bi+", "Al+", "l:P+", "w:CONJ+".
    const code = (s.featureTokens.find((t) => t.endsWith('+')) ?? s.form).replace(/[:+].*$/, '').replace(/\+$/, '');
    const label = PREFIX_LABEL[code];
    if (label) features.push({ label: 'Prefix', value: label });
  }

  const stem = segments.find((x) => x.type === 'STEM') ?? segments[0];
  if (stem) {
    // POS is surfaced by the Word Panel's dedicated pos/posLabel row — don't
    // duplicate it in the feature list.
    for (const tok of stem.featureTokens) {
      // Verb form, e.g. "(IV)".
      const fm = tok.match(/^\(([IVX]+)\)$/);
      if (fm && FORM_SET.has(fm[1])) { features.push({ label: 'Verb form', value: fm[1] }); continue; }
      if (CASE_LABEL[tok]) { features.push({ label: 'Case', value: CASE_LABEL[tok] }); continue; }
      if (STATE_LABEL[tok]) { features.push({ label: 'State', value: STATE_LABEL[tok] }); continue; }
      if (MOOD_LABEL[tok]) { features.push({ label: 'Mood', value: MOOD_LABEL[tok] }); continue; }
      if (VOICE_LABEL[tok]) { features.push({ label: 'Voice', value: VOICE_LABEL[tok] }); continue; }
      if (ASPECT_LABEL[tok]) { features.push({ label: 'Aspect', value: ASPECT_LABEL[tok] }); continue; }
      if (tok === 'ACT PCPL' || tok === 'ACT') { features.push({ label: 'Derivation', value: 'Active participle' }); continue; }
      if (tok === 'PASS PCPL' || tok === 'PASS') { features.push({ label: 'Derivation', value: 'Passive participle' }); continue; }
      if (tok === 'VN') { features.push({ label: 'Derivation', value: 'Verbal noun' }); continue; }
      // Combined person/gender/number, e.g. "3MP", "MS", "2FS", "F", "P".
      const pgn = tok.match(/^([123])?([MF])?([SDP])?$/);
      if (pgn && (pgn[1] || pgn[2] || pgn[3])) {
        if (pgn[1]) features.push({ label: 'Person', value: `${pgn[1]}${pgn[1] === '1' ? 'st' : pgn[1] === '2' ? 'nd' : 'rd'} person` });
        if (pgn[2]) features.push({ label: 'Gender', value: GENDER_LABEL[pgn[2]] });
        if (pgn[3]) features.push({ label: 'Number', value: NUMBER_LABEL[pgn[3]] });
        continue;
      }
      // Unknown token: leave it in featuresRaw only (never invent a meaning).
    }
  }

  // Attached pronoun suffixes.
  for (const s of segments.filter((x) => x.type === 'SUFFIX')) {
    const pgn = s.featureTokens.find((t) => /^([123])?([MF])?([SDP])?$/.test(t) && t.length > 0);
    const kind = s.pos === 'PRON' ? 'Attached pronoun' : s.pos ? POS_LABEL[s.pos] ?? 'Suffix' : 'Suffix';
    features.push({ label: 'Suffix', value: pgn ? `${kind} (${pgn})` : kind });
  }

  return features;
}

/* ================================================================== *
 * Parse the QAC file into words.
 * ================================================================== */

interface QacWord {
  root: string | null; // canonical key
  rootTranslit: string | null;
  lemma: string | null; // Arabic
  pos: string | null;
  posLabel: string | null;
  features: Feature[];
  featuresRaw: string;
  formArabic: string; // reassembled, for alignment cross-check only
}

function parseQac(): Map<string, QacWord> {
  const raw = fs.readFileSync(INPUT, 'utf-8');
  // (surah:ayah:word) → segments
  const bucket = new Map<string, Segment[]>();
  const wordOrder: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith('(')) continue;
    const m = line.match(/^\((\d+):(\d+):(\d+):(\d+)\)\t([^\t]*)\t([^\t]*)\t(.*)$/);
    if (!m) continue;
    const loc = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    const seg = parseSegment(loc, m[5], m[6], m[7]);
    const key = `${loc[0]}:${loc[1]}:${loc[2]}`;
    if (!bucket.has(key)) { bucket.set(key, []); wordOrder.push(key); }
    bucket.get(key)!.push(seg);
  }

  const words = new Map<string, QacWord>();
  for (const key of wordOrder) {
    const segs = bucket.get(key)!.sort((a, b) => a.seg - b.seg);
    const stem = segs.find((s) => s.type === 'STEM') ?? segs[0];
    const rootBw = segs.map((s) => s.root).find((r) => r) ?? null;
    const rootKey = rootBw ? rootKeyFromBuckwalter(rootBw) : null;
    const lemmaBw = stem?.lemma ?? null;
    words.set(key, {
      root: rootKey,
      rootTranslit: rootKey ? rootTranslitFromKey(rootKey) : null,
      lemma: lemmaBw ? bw2ar(lemmaBw) : null,
      pos: stem?.pos ?? null,
      posLabel: stem?.pos ? POS_LABEL[stem.pos] ?? null : null,
      features: buildFeatures(segs),
      featuresRaw: segs.map((s) => s.rawFeatures).join(' '),
      formArabic: segs.map((s) => bw2ar(s.form)).join(''),
    });
  }
  return words;
}

/* ================================================================== *
 * Alignment + write-back.
 * ================================================================== */

/** True if the token carries an Arabic LETTER (not a lone pause/sajdah mark). */
function hasArabicLetter(token: string): boolean {
  return /[ء-يٱ-ۓۺ-ۿ]/u.test(token);
}

/**
 * Bare-letter comparison form (cross-check ONLY): keep Arabic letters, drop
 * every diacritic, tatweel, pause mark, and QAC's extended-Buckwalter symbols
 * (^ @ # …), then hamza-normalize. Never used to modify stored text.
 */
function normForCompare(s: string): string {
  let out = '';
  for (const c of s) {
    if (/[ء-ي]/.test(c)) out += HAMZA_NORM[c] ?? c;
    else if (c === 'ٱ') out += 'ا';
  }
  return out;
}

interface WordObj {
  position: number;
  textUthmani: string;
  transliteration: string | null;
  root: string | null;
  rootTranslit: string | null;
  lemma: string | null;
  pos: string | null;
  posLabel: string | null;
  pattern: string | null;
  features: Feature[];
  featuresRaw: string | null;
}

function nullMorphWord(w: WordObj): WordObj {
  return {
    position: w.position,
    textUthmani: w.textUthmani, // NEVER modified
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

function stableJson(v: unknown): string {
  return JSON.stringify(v, null, 2) + '\n';
}

function main(): void {
  console.log('Importer A — Layer 2 morphology (Quranic Arabic Corpus v0.4)\n');

  if (!fs.existsSync(INPUT)) {
    console.error(`Missing input: ${INPUT}`);
    console.error(
      '\nDownload the morphology file (email-gated) from corpus.quran.com/download/' +
        '\nand save it verbatim as data-sources/qac/quranic-corpus-morphology-0.4.txt',
    );
    process.exit(2);
  }

  console.log('Parsing QAC morphology …');
  const qac = parseQac();
  console.log(`  ${qac.size} words parsed from the corpus`);

  let totalWords = 0;
  let attached = 0;
  let withRoot = 0;
  let nulledByMismatch = 0;
  const mismatches: string[] = [];
  const formDivergences: string[] = [];

  for (let s = 1; s <= 114; s++) {
    const file = path.join(QURAN_DIR, `${String(s).padStart(3, '0')}.json`);
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));

    for (const ayah of data.ayahs) {
      const ourWords: WordObj[] = ayah.words;
      totalWords += ourWords.length;

      // Align QAC words to our LETTER-BEARING tokens only. Standalone pause /
      // sajdah / rub-el-hizb marks are paratextual ornaments, not words — they
      // keep null morphology regardless of alignment (matching how the Reader
      // renders them). This makes alignment robust whether or not the bundled
      // Tanzil text was downloaded with annotation marks.
      const letterIdx: number[] = [];
      ourWords.forEach((w, i) => { if (hasArabicLetter(w.textUthmani)) letterIdx.push(i); });

      const qacWords: QacWord[] = [];
      for (let w = 1; ; w++) {
        const qw = qac.get(`${s}:${ayah.number}:${w}`);
        if (!qw) break;
        qacWords.push(qw);
      }

      if (qacWords.length !== letterIdx.length) {
        // Genuine segmentation mismatch → null the whole ayah (never guess).
        mismatches.push(`${s}:${ayah.number} (letters ${letterIdx.length}, QAC ${qacWords.length})`);
        ayah.words = ourWords.map(nullMorphWord);
        nulledByMismatch += letterIdx.length;
        continue;
      }

      // Map each letter-bearing token position → its QAC word.
      const qacFor = new Map<number, QacWord>();
      letterIdx.forEach((idx, k) => qacFor.set(idx, qacWords[k]));

      ayah.words = ourWords.map((w, i) => {
        const qw = qacFor.get(i);
        if (!qw) return nullMorphWord(w); // pause/sajdah mark → stays null
        if (normForCompare(w.textUthmani) !== normForCompare(qw.formArabic)) {
          if (formDivergences.length < 40) formDivergences.push(`${s}:${ayah.number}:${w.position} "${w.textUthmani}" vs QAC "${qw.formArabic}"`);
        }
        if (qw.root) withRoot += 1;
        attached += 1;
        return {
          position: w.position,
          textUthmani: w.textUthmani, // verbatim Tanzil — unchanged
          transliteration: null, // no vetted per-word transliteration source
          root: qw.root,
          rootTranslit: qw.rootTranslit,
          lemma: qw.lemma,
          pos: qw.pos,
          posLabel: qw.posLabel,
          pattern: null, // QAC 0.4 carries no wazn/pattern
          features: qw.features,
          featuresRaw: qw.featuresRaw,
        };
      });
    }

    // Note: refresh the per-file provenance note (Layer 2 now populated).
    data._note =
      'Layer 1 (Arabic, verbatim): Tanzil Uthmani v1.1, tanzil.net, CC BY 3.0. ' +
      'Layer 2 (morphology): Quranic Arabic Corpus v0.4 (Kais Dukes, 2011), GNU GPL — ' +
      'attribute "Quranic Arabic Corpus" with a link to corpus.quran.com. Per-word glosses ' +
      'intentionally null (no clean-licensed source). DATA UNDER TEST — not yet scholar-reviewed.';

    fs.writeFileSync(file, stableJson(data), 'utf-8');
  }

  recomputeManifestVersion();

  /* ---- Report ---- */
  console.log('\n──────────── MORPHOLOGY IMPORT ────────────');
  console.log(`Total words (all 114 surahs) : ${totalWords}`);
  console.log(`Words given morphology       : ${attached}  (${((attached / totalWords) * 100).toFixed(1)}%)`);
  console.log(`  of which have a root       : ${withRoot}  (${((withRoot / totalWords) * 100).toFixed(1)}% of all words)`);
  console.log(`Words left null (mismatch)   : ${nulledByMismatch}`);
  console.log(`Ayah word-count mismatches   : ${mismatches.length}${mismatches.length ? ' → ' + mismatches.slice(0, 30).join('; ') + (mismatches.length > 30 ? ' …' : '') : ''}`);
  console.log(`Form cross-check divergences : ${formDivergences.length ? formDivergences.length + ' (positional match kept; samples below)' : 'none'}`);
  for (const d of formDivergences.slice(0, 10)) console.log(`   • ${d}`);
  console.log('\nStill null by design: per-word gloss, transliteration, pattern (wazn).');
  console.log('Done. Re-running with the same input reproduces identical output.');
}

/** Manifest version = sha256 over every bundled data file (deterministic). */
function recomputeManifestVersion(): void {
  const files: string[] = [];
  for (const f of fs.readdirSync(QURAN_DIR).sort()) if (f.endsWith('.json')) files.push(path.join(QURAN_DIR, f));
  const trDir = path.join(ASSETS, 'translations');
  for (const f of fs.readdirSync(trDir).sort()) if (f.endsWith('.json')) files.push(path.join(trDir, f));
  const lex = path.join(ASSETS, 'lexicon', 'lane.json');
  if (fs.existsSync(lex)) files.push(lex);
  const h = crypto.createHash('sha256');
  for (const f of files) h.update(fs.readFileSync(f));
  const manifestPath = path.join(ASSETS, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  manifest.version = parseInt(h.digest('hex').slice(0, 8), 16);
  fs.writeFileSync(manifestPath, stableJson(manifest), 'utf-8');
  console.log(`manifest version → ${manifest.version}`);
}

main();
