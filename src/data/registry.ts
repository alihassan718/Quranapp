/**
 * Data registry — the single PLUG-IN POINT for bundled reference data.
 *
 * To add reference data WITHOUT touching any app logic:
 *   1. Drop a JSON file under assets/data/ (surah, translation, or lexicon)
 *      following the shapes in schema.ts.
 *   2. Add one `require`/import line here and push it into the matching array.
 *   3. Bump `version` in assets/data/manifest.json so the SQLite DB rebuilds.
 *
 * Metro bundler requires static import paths, so this registry file is the one
 * place that must list each asset. No other code changes are needed — screens,
 * queries and the DB builder all iterate these arrays generically.
 */

import manifest from '../../assets/data/manifest.json';
import surahsMeta from '../../assets/data/surahs.json';
import laneLexicon from '../../assets/data/lexicon/lane.json';
import surah001 from '../../assets/data/quran/001.json';
import trPickthall from '../../assets/data/translations/pickthall.json';
import trSale from '../../assets/data/translations/sale.json';
import trShakir from '../../assets/data/translations/shakir.json';
import trYusufali from '../../assets/data/translations/yusufali.json';

import { LexiconFile, SurahDataFile, SurahMetaFile, TranslationFile } from './schema';

/** Metadata for all 114 surahs (powers the Home list). */
export const SURAH_META = surahsMeta as unknown as SurahMetaFile[];

/** Per-surah Layer-1/2 data files. Add new surahs here. */
export const SURAH_DATA_FILES: SurahDataFile[] = [surah001 as unknown as SurahDataFile];

/** Layer-3 lexicon files. Add new lexicons here. */
export const LEXICON_FILES: LexiconFile[] = [laneLexicon as unknown as LexiconFile];

/** Layer-4 translation files. Add new translators here. */
export const TRANSLATION_FILES: TranslationFile[] = [
  trYusufali as unknown as TranslationFile,
  trPickthall as unknown as TranslationFile,
  trSale as unknown as TranslationFile,
  trShakir as unknown as TranslationFile,
];

/** Bump when bundled data changes → triggers a read-DB rebuild. */
export const DATA_VERSION: number = (manifest as { version: number }).version;
