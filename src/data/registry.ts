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
import surah002 from '../../assets/data/quran/002.json';
import surah003 from '../../assets/data/quran/003.json';
import surah004 from '../../assets/data/quran/004.json';
import surah005 from '../../assets/data/quran/005.json';
import surah006 from '../../assets/data/quran/006.json';
import surah007 from '../../assets/data/quran/007.json';
import surah008 from '../../assets/data/quran/008.json';
import surah009 from '../../assets/data/quran/009.json';
import surah010 from '../../assets/data/quran/010.json';
import surah011 from '../../assets/data/quran/011.json';
import surah012 from '../../assets/data/quran/012.json';
import surah013 from '../../assets/data/quran/013.json';
import surah014 from '../../assets/data/quran/014.json';
import surah015 from '../../assets/data/quran/015.json';
import surah016 from '../../assets/data/quran/016.json';
import surah017 from '../../assets/data/quran/017.json';
import surah018 from '../../assets/data/quran/018.json';
import surah019 from '../../assets/data/quran/019.json';
import surah020 from '../../assets/data/quran/020.json';
import surah021 from '../../assets/data/quran/021.json';
import surah022 from '../../assets/data/quran/022.json';
import surah023 from '../../assets/data/quran/023.json';
import surah024 from '../../assets/data/quran/024.json';
import surah025 from '../../assets/data/quran/025.json';
import surah026 from '../../assets/data/quran/026.json';
import surah027 from '../../assets/data/quran/027.json';
import surah028 from '../../assets/data/quran/028.json';
import surah029 from '../../assets/data/quran/029.json';
import surah030 from '../../assets/data/quran/030.json';
import surah031 from '../../assets/data/quran/031.json';
import surah032 from '../../assets/data/quran/032.json';
import surah033 from '../../assets/data/quran/033.json';
import surah034 from '../../assets/data/quran/034.json';
import surah035 from '../../assets/data/quran/035.json';
import surah036 from '../../assets/data/quran/036.json';
import surah037 from '../../assets/data/quran/037.json';
import surah038 from '../../assets/data/quran/038.json';
import surah039 from '../../assets/data/quran/039.json';
import surah040 from '../../assets/data/quran/040.json';
import surah041 from '../../assets/data/quran/041.json';
import surah042 from '../../assets/data/quran/042.json';
import surah043 from '../../assets/data/quran/043.json';
import surah044 from '../../assets/data/quran/044.json';
import surah045 from '../../assets/data/quran/045.json';
import surah046 from '../../assets/data/quran/046.json';
import surah047 from '../../assets/data/quran/047.json';
import surah048 from '../../assets/data/quran/048.json';
import surah049 from '../../assets/data/quran/049.json';
import surah050 from '../../assets/data/quran/050.json';
import surah051 from '../../assets/data/quran/051.json';
import surah052 from '../../assets/data/quran/052.json';
import surah053 from '../../assets/data/quran/053.json';
import surah054 from '../../assets/data/quran/054.json';
import surah055 from '../../assets/data/quran/055.json';
import surah056 from '../../assets/data/quran/056.json';
import surah057 from '../../assets/data/quran/057.json';
import surah058 from '../../assets/data/quran/058.json';
import surah059 from '../../assets/data/quran/059.json';
import surah060 from '../../assets/data/quran/060.json';
import surah061 from '../../assets/data/quran/061.json';
import surah062 from '../../assets/data/quran/062.json';
import surah063 from '../../assets/data/quran/063.json';
import surah064 from '../../assets/data/quran/064.json';
import surah065 from '../../assets/data/quran/065.json';
import surah066 from '../../assets/data/quran/066.json';
import surah067 from '../../assets/data/quran/067.json';
import surah068 from '../../assets/data/quran/068.json';
import surah069 from '../../assets/data/quran/069.json';
import surah070 from '../../assets/data/quran/070.json';
import surah071 from '../../assets/data/quran/071.json';
import surah072 from '../../assets/data/quran/072.json';
import surah073 from '../../assets/data/quran/073.json';
import surah074 from '../../assets/data/quran/074.json';
import surah075 from '../../assets/data/quran/075.json';
import surah076 from '../../assets/data/quran/076.json';
import surah077 from '../../assets/data/quran/077.json';
import surah078 from '../../assets/data/quran/078.json';
import surah079 from '../../assets/data/quran/079.json';
import surah080 from '../../assets/data/quran/080.json';
import surah081 from '../../assets/data/quran/081.json';
import surah082 from '../../assets/data/quran/082.json';
import surah083 from '../../assets/data/quran/083.json';
import surah084 from '../../assets/data/quran/084.json';
import surah085 from '../../assets/data/quran/085.json';
import surah086 from '../../assets/data/quran/086.json';
import surah087 from '../../assets/data/quran/087.json';
import surah088 from '../../assets/data/quran/088.json';
import surah089 from '../../assets/data/quran/089.json';
import surah090 from '../../assets/data/quran/090.json';
import surah091 from '../../assets/data/quran/091.json';
import surah092 from '../../assets/data/quran/092.json';
import surah093 from '../../assets/data/quran/093.json';
import surah094 from '../../assets/data/quran/094.json';
import surah095 from '../../assets/data/quran/095.json';
import surah096 from '../../assets/data/quran/096.json';
import surah097 from '../../assets/data/quran/097.json';
import surah098 from '../../assets/data/quran/098.json';
import surah099 from '../../assets/data/quran/099.json';
import surah100 from '../../assets/data/quran/100.json';
import surah101 from '../../assets/data/quran/101.json';
import surah102 from '../../assets/data/quran/102.json';
import surah103 from '../../assets/data/quran/103.json';
import surah104 from '../../assets/data/quran/104.json';
import surah105 from '../../assets/data/quran/105.json';
import surah106 from '../../assets/data/quran/106.json';
import surah107 from '../../assets/data/quran/107.json';
import surah108 from '../../assets/data/quran/108.json';
import surah109 from '../../assets/data/quran/109.json';
import surah110 from '../../assets/data/quran/110.json';
import surah111 from '../../assets/data/quran/111.json';
import surah112 from '../../assets/data/quran/112.json';
import surah113 from '../../assets/data/quran/113.json';
import surah114 from '../../assets/data/quran/114.json';
import trPickthall from '../../assets/data/translations/pickthall.json';
import trSale from '../../assets/data/translations/sale.json';
import trShakir from '../../assets/data/translations/shakir.json';
import trYusufali from '../../assets/data/translations/yusufali.json';

import { LexiconFile, SurahDataFile, SurahMetaFile, TranslationFile } from './schema';

/** Metadata for all 114 surahs (powers the Home list). */
export const SURAH_META = surahsMeta as unknown as SurahMetaFile[];

/** Per-surah Layer-1/2 data files. Add new surahs here. */
export const SURAH_DATA_FILES: SurahDataFile[] = [
  surah001 as unknown as SurahDataFile,
  surah002 as unknown as SurahDataFile,
  surah003 as unknown as SurahDataFile,
  surah004 as unknown as SurahDataFile,
  surah005 as unknown as SurahDataFile,
  surah006 as unknown as SurahDataFile,
  surah007 as unknown as SurahDataFile,
  surah008 as unknown as SurahDataFile,
  surah009 as unknown as SurahDataFile,
  surah010 as unknown as SurahDataFile,
  surah011 as unknown as SurahDataFile,
  surah012 as unknown as SurahDataFile,
  surah013 as unknown as SurahDataFile,
  surah014 as unknown as SurahDataFile,
  surah015 as unknown as SurahDataFile,
  surah016 as unknown as SurahDataFile,
  surah017 as unknown as SurahDataFile,
  surah018 as unknown as SurahDataFile,
  surah019 as unknown as SurahDataFile,
  surah020 as unknown as SurahDataFile,
  surah021 as unknown as SurahDataFile,
  surah022 as unknown as SurahDataFile,
  surah023 as unknown as SurahDataFile,
  surah024 as unknown as SurahDataFile,
  surah025 as unknown as SurahDataFile,
  surah026 as unknown as SurahDataFile,
  surah027 as unknown as SurahDataFile,
  surah028 as unknown as SurahDataFile,
  surah029 as unknown as SurahDataFile,
  surah030 as unknown as SurahDataFile,
  surah031 as unknown as SurahDataFile,
  surah032 as unknown as SurahDataFile,
  surah033 as unknown as SurahDataFile,
  surah034 as unknown as SurahDataFile,
  surah035 as unknown as SurahDataFile,
  surah036 as unknown as SurahDataFile,
  surah037 as unknown as SurahDataFile,
  surah038 as unknown as SurahDataFile,
  surah039 as unknown as SurahDataFile,
  surah040 as unknown as SurahDataFile,
  surah041 as unknown as SurahDataFile,
  surah042 as unknown as SurahDataFile,
  surah043 as unknown as SurahDataFile,
  surah044 as unknown as SurahDataFile,
  surah045 as unknown as SurahDataFile,
  surah046 as unknown as SurahDataFile,
  surah047 as unknown as SurahDataFile,
  surah048 as unknown as SurahDataFile,
  surah049 as unknown as SurahDataFile,
  surah050 as unknown as SurahDataFile,
  surah051 as unknown as SurahDataFile,
  surah052 as unknown as SurahDataFile,
  surah053 as unknown as SurahDataFile,
  surah054 as unknown as SurahDataFile,
  surah055 as unknown as SurahDataFile,
  surah056 as unknown as SurahDataFile,
  surah057 as unknown as SurahDataFile,
  surah058 as unknown as SurahDataFile,
  surah059 as unknown as SurahDataFile,
  surah060 as unknown as SurahDataFile,
  surah061 as unknown as SurahDataFile,
  surah062 as unknown as SurahDataFile,
  surah063 as unknown as SurahDataFile,
  surah064 as unknown as SurahDataFile,
  surah065 as unknown as SurahDataFile,
  surah066 as unknown as SurahDataFile,
  surah067 as unknown as SurahDataFile,
  surah068 as unknown as SurahDataFile,
  surah069 as unknown as SurahDataFile,
  surah070 as unknown as SurahDataFile,
  surah071 as unknown as SurahDataFile,
  surah072 as unknown as SurahDataFile,
  surah073 as unknown as SurahDataFile,
  surah074 as unknown as SurahDataFile,
  surah075 as unknown as SurahDataFile,
  surah076 as unknown as SurahDataFile,
  surah077 as unknown as SurahDataFile,
  surah078 as unknown as SurahDataFile,
  surah079 as unknown as SurahDataFile,
  surah080 as unknown as SurahDataFile,
  surah081 as unknown as SurahDataFile,
  surah082 as unknown as SurahDataFile,
  surah083 as unknown as SurahDataFile,
  surah084 as unknown as SurahDataFile,
  surah085 as unknown as SurahDataFile,
  surah086 as unknown as SurahDataFile,
  surah087 as unknown as SurahDataFile,
  surah088 as unknown as SurahDataFile,
  surah089 as unknown as SurahDataFile,
  surah090 as unknown as SurahDataFile,
  surah091 as unknown as SurahDataFile,
  surah092 as unknown as SurahDataFile,
  surah093 as unknown as SurahDataFile,
  surah094 as unknown as SurahDataFile,
  surah095 as unknown as SurahDataFile,
  surah096 as unknown as SurahDataFile,
  surah097 as unknown as SurahDataFile,
  surah098 as unknown as SurahDataFile,
  surah099 as unknown as SurahDataFile,
  surah100 as unknown as SurahDataFile,
  surah101 as unknown as SurahDataFile,
  surah102 as unknown as SurahDataFile,
  surah103 as unknown as SurahDataFile,
  surah104 as unknown as SurahDataFile,
  surah105 as unknown as SurahDataFile,
  surah106 as unknown as SurahDataFile,
  surah107 as unknown as SurahDataFile,
  surah108 as unknown as SurahDataFile,
  surah109 as unknown as SurahDataFile,
  surah110 as unknown as SurahDataFile,
  surah111 as unknown as SurahDataFile,
  surah112 as unknown as SurahDataFile,
  surah113 as unknown as SurahDataFile,
  surah114 as unknown as SurahDataFile,
];

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
