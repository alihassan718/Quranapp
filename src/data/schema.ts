/**
 * Import schema — the shapes of the bundled JSON data files.
 *
 * THIS FILE IS THE CONTRACT for the data you supply. To ship the real
 * full-Qur'an data, produce files in exactly these shapes and register them in
 * `registry.ts`. See `assets/data/` for a complete worked example (Surah
 * Al-Fātiḥah) and `DATA_NOTES.md` for prose documentation.
 *
 * Layer separation is deliberate and must be preserved:
 *   • Surah data file  → Layer 1 (Uthmani text) + Layer 2 (morphology)
 *   • Lexicon file     → Layer 3 (author-less meanings, keyed by root)
 *   • Translation file → Layer 4 (one file per translator; verses keyed "s:a")
 */

import {
  LexiconSource,
  MorphologyFeature,
  RevelationPlace,
  Translator,
} from '../domain/models';

/** One entry of `assets/data/surahs.json` (metadata for all 114 surahs). */
export interface SurahMetaFile {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  nameTransliteration: string;
  revelationPlace: RevelationPlace;
  ayahCount: number;
}

/** A single word token inside a surah data file (Layer 2). */
export interface WordFile {
  position: number;
  textUthmani: string;
  transliteration: string | null;
  root: string | null;
  rootTranslit: string | null;
  lemma: string | null;
  pos: string | null;
  posLabel: string | null;
  pattern: string | null;
  features: MorphologyFeature[];
  featuresRaw: string | null;
}

/** A single ayah inside a surah data file (Layer 1 + its words). */
export interface AyahFile {
  number: number;
  textUthmani: string;
  words: WordFile[];
}

/** `assets/data/quran/<nnn>.json` — one file per surah. */
export interface SurahDataFile {
  surah: {
    number: number;
    nameArabic: string;
    nameEnglish: string;
    nameTransliteration: string;
    revelationPlace: RevelationPlace;
    ayahCount: number;
    bismillahIsFirstAyah?: boolean;
  };
  ayahs: AyahFile[];
  /** Optional human-readable note; ignored by the importer. */
  _note?: string;
}

/** `assets/data/translations/<id>.json` — one file per translator (Layer 4). */
export interface TranslationFile {
  translator: Translator;
  /** Verse text keyed by "surah:ayah", e.g. "1:1". */
  verses: Record<string, string>;
}

/** A lexicon entry inside a lexicon file. */
export interface LexiconEntryFile {
  root: string;
  rootTranslit: string | null;
  senses: {
    definitionEn: string | null;
    definitionAr: string | null;
    notes: string | null;
  }[];
}

/** `assets/data/lexicon/<id>.json` — one file per lexicon (Layer 3). */
export interface LexiconFile {
  source: LexiconSource;
  /** Entries keyed by root (space-separated letters, e.g. "ر ح م"). */
  entries: Record<string, LexiconEntryFile>;
}
