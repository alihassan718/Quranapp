import { HighlightColorKey } from '../theme/tokens';

/* ------------------------------------------------------------------ *
 * Layer 1 — Qur'anic text
 * ------------------------------------------------------------------ */

export type RevelationPlace = 'Meccan' | 'Medinan';

export interface Surah {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTransliteration: string;
  revelationPlace: RevelationPlace;
  ayahCount: number;
}

export interface Ayah {
  id: number;
  surah: number;
  ayah: number;
  textUthmani: string;
}

/* ------------------------------------------------------------------ *
 * Layer 2 — Morphology (per word)
 * ------------------------------------------------------------------ */

export interface MorphologyFeature {
  label: string; // plain-language, e.g. "Case"
  value: string; // e.g. "Genitive"
}

export interface Word {
  id: number;
  surah: number;
  ayah: number;
  position: number; // 1-based within the ayah
  textUthmani: string;
  transliteration: string | null;
  /** Root letters, space-separated (e.g. "ر ح م"); null for particles. */
  root: string | null;
  rootTranslit: string | null; // e.g. "r-ḥ-m"
  lemma: string | null;
  pos: string | null; // QAC-style tag, e.g. "N"
  posLabel: string | null; // plain-language, e.g. "Noun"
  pattern: string | null; // morphological pattern / wazn
  features: MorphologyFeature[];
  featuresRaw: string | null; // raw QAC feature string, for reference
}

export interface AyahWithWords extends Ayah {
  words: Word[];
}

/* ------------------------------------------------------------------ *
 * Layer 3 — Author-less lexicon (root → documented meanings)
 * ------------------------------------------------------------------ */

export type LicenseStatus = 'public-domain' | 'contested' | 'licensed';

export interface LexiconSource {
  id: string;
  name: string;
  author: string | null;
  year: string | null;
  license: string | null;
  licenseStatus: LicenseStatus;
  attribution: string | null;
  /** True when the bundled entries are illustrative samples, not the real source text. */
  isSample: boolean;
}

export interface LexiconSense {
  ord: number;
  definitionEn: string | null;
  definitionAr: string | null;
  notes: string | null;
}

export interface LexiconEntry {
  sourceId: string;
  root: string;
  rootTranslit: string | null;
  senses: LexiconSense[];
}

/* ------------------------------------------------------------------ *
 * Layer 4 — Reference translations (clearly attributed)
 * ------------------------------------------------------------------ */

export interface Translator {
  id: string;
  /** Display title of the work, e.g. "The Holy Qur'an". */
  name: string;
  /** Person, e.g. "Abdullah Yusuf Ali". */
  translator: string;
  year: string | null;
  language: string; // BCP-47-ish, e.g. "en"
  direction: 'ltr' | 'rtl';
  license: string;
  licenseStatus: LicenseStatus;
  attribution: string | null;
  /** Contested/licensed sources may ship disabled by default. */
  enabled: boolean;
  note: string | null;
}

export interface Translation {
  translatorId: string;
  surah: number;
  ayah: number;
  text: string;
}

/* ------------------------------------------------------------------ *
 * Derived / view models
 * ------------------------------------------------------------------ */

/** A word occurrence returned by the Root Explorer, with its surah name. */
export interface RootOccurrence {
  word: Word;
  surahNameEnglish: string;
  surahNameArabic: string;
}

/* ------------------------------------------------------------------ *
 * User-generated annotations (stored in the separate user DB)
 * ------------------------------------------------------------------ */

export interface Highlight {
  id: number;
  surah: number;
  ayah: number;
  /** null = the whole ayah; otherwise a specific word position. */
  wordPosition: number | null;
  color: HighlightColorKey;
  createdAt: number;
}

export interface Note {
  id: number;
  surah: number;
  ayah: number;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface Bookmark {
  id: number;
  surah: number;
  ayah: number;
  label: string | null;
  createdAt: number;
}

export interface LastRead {
  surah: number;
  ayah: number;
  updatedAt: number;
}

/* ------------------------------------------------------------------ *
 * Manifest describing what reference data is bundled
 * ------------------------------------------------------------------ */

export interface DataManifest {
  /** Bumped whenever bundled data changes, to trigger a DB rebuild. */
  version: number;
  /** Surah numbers that have full Layer-1/2 data bundled. */
  availableSurahs: number[];
  translators: Translator[];
  lexiconSources: LexiconSource[];
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

export function verseRef(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

export function rootToKey(root: string): string {
  return root.trim().replace(/\s+/g, ' ');
}
