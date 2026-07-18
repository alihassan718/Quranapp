# Bayān — session handoff (written 2026-07-18, resume ~2026-07-25)

Paste this whole file as the opening prompt of the next session (or tell the agent to read HANDOFF.md).

## What this project is

Bayān — a premium, fully-offline, English-language Qur'anic study app at `C:\otherdata\mythings\Quranapp`.
Purpose: understand the Qur'an directly from the Arabic — explore each word's root and its full documented
lexical range **author-lessly first**, then compare named translations as clearly-attributed references.
The app takes no interpretive side. Strictly Qur'an-study only: NO hadith, prayer times, qibla, athkar, audio.

- Expo SDK 57, React Native 0.86, React 19, TypeScript, Reanimated 4 + worklets, expo-sqlite.
- Android-only target for now (iOS possible later). Sideloadable APKs, debug-signed (fine for private testing).
- GitHub: https://github.com/alihassan718/Quranapp (pushed and in sync as of end of session).
- 100% on-device: bundled JSON data → read-only SQLite built on first launch (manifest version = content
  hash → DB rebuilds when data changes). User annotations (notes/highlights/bookmarks/last-read) live in a
  SEPARATE SQLite DB that survives updates. AsyncStorage for settings.

## Absolute rules (user-set, never violate)

1. NEVER fabricate, paraphrase, or "fill in" Arabic, roots, morphology, or meanings. Every value comes
   verbatim from a source file. Gaps stay null and get logged — never repaired by rewriting.
2. The 4 data layers stay strictly separate (this separation IS the product):
   L1 Tanzil Uthmani text · L2 QAC morphology · L3 author-less lexicon (Lane's) · L4 named translations.
3. Adding data = adding files + registry entry, never code changes.
4. Attribution is mandatory and visible (Credits screen + in-context).
5. Private test build now, but prefer sources whose licenses also permit public release later.

## Release timeline (all APKs in release/, all debug-signed with the same cert → update in place)

- v1.0.0 (versionCode 1): full app scaffold, all screens, Al-Fātiḥah sample data only.
- v1.0.1 (vc 2): bug fixes — Arabic glyph clipping (never set small lineHeight on Qur'anic text; ArabicText
  now omits lineHeight unless caller passes ≥2), note-editor hidden behind keyboard (BottomSheet lifts via
  useAnimatedKeyboard; app is edge-to-edge targetSdk 36 so adjustResize doesn't work), inline translations
  under every ayah (new setting `showInlineTranslation` + attribution line), web wa-sqlite crash (open the
  two DBs sequentially, never Promise.all).
- v1.1.0 (vc 3): FULL QUR'AN imported from Tanzil (Layers 1+4). 114 surahs, 6,236 ayat, 82,011 tokens.
- v1.2.0 (vc 4, CURRENT): morphology (Layer 2, QAC v0.4) + lexicon (Layer 3, verbatim Lane's) imported.
  Word Panel shows real root/lemma/POS/features + verbatim Lane's definition with collapse/expand.
  Root Explorer works end-to-end. DATA UNDER TEST banner on Credits.

## The data pipeline (all importers idempotent, deterministic, Node 24 runs .ts directly — no tsx)

Inputs live in `data-sources/` (GITIGNORED — currently present on this machine; re-download if lost):
- `data-sources/tanzil/quran-uthmani.xml` — Tanzil Uthmani v1.1 XML (⚠ user's copy INCLUDES pause/sajdah/
  rub-el-hizb marks — 4,578 standalone mark tokens; see "known issues").
- `data-sources/tanzil/en.{yusufali,pickthall,shakir}.txt` — Tanzil translations, text format.
- `data-sources/qac/quranic-corpus-morphology-0.4.txt` — QAC morphology (email-gated download from
  corpus.quran.com/download/; Kais Dukes 2011, GNU GPL).
- `data-sources/lane/quran-arabic-roots-lane-lexicon.json` — structured Lane's dataset (12 MB, from
  github.com/aliozdenisik/quran-arabic-roots-lane-lexicon; can be curl'd).

Run order after any text change: `npm run import:tanzil` → `npm run import:lexicon` →
`npm run import:morphology` → `npm run validate:data`.

- `scripts/import-tanzil.ts` — L1+L4. XML (bismillah is an attribute → verse-1 text stays clean),
  validates canonical Kufan counts (6,236), regenerates quran/001–114.json + 3 translation files,
  rewrites registry.ts (CRLF-tolerant) + manifest version (sha256 of content → idempotent).
- `scripts/import-lexicon.ts` — L3. Bundles ONLY verbatim `definition_en` (all AI-generated fields —
  summary_en/tr, definition_tr — excluded). 1,337/1,651 roots (81%). One sense per root (splitting would
  be interpretive). Attribution: Lane 1863 (public domain) via Perseus Digital Library (CC BY-SA 3.0,
  share-alike) — NOT the repo's incorrect GPL label.
- `scripts/import-morphology.ts` — L2. Reassembles QAC prefix/stem/suffix segments into words,
  Buckwalter→Arabic, tag→plain-language grammar (full mapping tables in `scripts/QAC-MAPPING.md`),
  POSITIONAL alignment by (surah, ayah, word-index) against LETTER-BEARING tokens only (standalone marks
  keep null morphology and render as gold non-tappable ornaments). Per-ayah count mismatch → whole ayah
  null + logged, never guessed. Stored Tanzil text never modified.
- `scripts/validate-data.ts` — coverage + structure report (numbers below).

**Shared root-key convention (critical, documented in QAC-MAPPING.md §3):** Arabic letters,
hamza/alef-seat normalized (أ إ آ ٱ→ا, ؤ ئ→ء), space-separated, e.g. `ا ل ه`. QAC roots via bw2ar;
Lane roots from its Arabic `root` field (NOT its `root_buckwalter` — different Buckwalter dialect,
drops match rate 99.7%→65%). Lane's `definition_en` contains standalone `ذ` (U+0630) node-markers —
stored byte-for-byte, stripped ONLY at render (WordPanel `cleanLexiconText`).

## Current validation numbers (v1.2.0, from `npm run validate:data`)

- 82,011 word tokens (4,578 are pause-mark ornaments).
- Morphology: 77,383 words (94.4%); roots on 49,940 (60.9%). Only 4 ayat unaligned (2:181, 8:6, 13:37,
  37:130 — Tanzil splits بعد ما / إل ياسين where QAC joins them) → null + logged.
- Lexicon: 1,329/1,642 Qur'anic roots covered (80.9%); word-level coverage 80.2%.
- Per-word gloss: 0% — SKIPPED BY USER DECISION (no clean-licensed source; QUL license unclear,
  hablullah CC BY-NC-ND and repo 404s). Meaning comes via root → Lane's.
- transliteration + pattern/wazn: null (no vetted source / not in QAC 0.4).

## Known issues & decisions on record

1. **Lexicon gaps are concentrated in HIGH-FREQUENCY roots** — the structured Lane's dataset left
   ~313 roots blank (`corpus_only`, confidence low), including: ربب 980× (Rabb!), اتي 549×, شيا 519×,
   ايي 382×, كلل 377×, راي 328×, هدي 316×, حقق 287×, وقي 258×, نوس 241×, ولي 231×, جنن 201×, ضلل 191×,
   حيي 184×, بني 184×, لقي 146×, سال 129×, يدي 120×, عزز 120×, جزي 118×. These show morphology but
   "No lexicon entry bundled" in-app. **Agreed next step: a third importer to fill these from the full
   Perseus Lane's XML (github.com/laneslexicon/lexicon_xml has amended Perseus XML; CC BY-SA 3.0).**
2. **Pause marks still in the text**: the user's Tanzil download included annotation marks despite
   intending not to. Handled robustly (ornament rendering + letter-token alignment), but for a clean
   mushaf text: re-download Uthmani XML from tanzil.net/download with pause marks / sajdah signs /
   rub-el-hizb UNCHECKED → replace data-sources/tanzil/quran-uthmani.xml → re-run the 3 importers.
3. **Shakir**: verses imported but translator `enabled:false` (rights contested — Tahrike Tarsile claim).
   Enable = one field in assets/data/translations/shakir.json. **Sale**: still Fatiha-only sample verses
   (Tanzil doesn't distribute Sale) — either supply full Sale text or disable it.
4. **QAC license**: GPL-3.0 per site, but the data file header grants "use in any website or application,
   provided its source is clearly indicated and a link is made to corpus.quran.com" + verbatim-only.
   Compliance path used: annotation verbatim, credit + link on Credits screen, copyright block preserved
   in data-sources file. Lexicon data file treated as CC BY-SA 3.0 share-alike.
5. **App icon & splash are still Expo placeholders.** A Gemini logo prompt was written (concept: one
   calligraphic root ر ح م splitting prism-like into 5 rays, emerald #0E6E5C → gold #AF8340, parchment
   #F6F1E7, no crescent/mosque/book clichés). When the user supplies the PNG: wire into assets/ (icon,
   android-icon-foreground, monochrome, splash) + rebuild.
6. **4 ayah alignment mismatches** (above) — acceptable, logged; could be special-cased later only with
   an explicit, documented token-merge rule (never silently).

## RN / web dev gotchas (hard-won — do not rediscover)

- NEVER set small explicit lineHeight on Qur'anic Arabic (Android hard-clips stacked diacritics).
- expo-sqlite web (wa-sqlite) is not re-entrant: open DBs SEQUENTIALLY (DatabaseProvider does).
- Reanimated `entering` (FadeIn) on RN-web silently hides the subtree — bit us TWICE (AyahView inline
  translation, WordPanel lexicon block). Never use `entering` on must-show content.
- FlatList needs `extraData` for out-of-band state; deep scrollToIndex needs offset-estimate-then-index
  (ReaderScreen does this); RNW virtualized deep-scroll is unreliable — verify verse-jump on DEVICE.
- Hermes stores non-ASCII strings as UTF-16 → verify bundled strings with `encode('utf-16-le')`, not grep.
- Web smoke test: `.claude/launch.json` runs `expo start --web` on port 8082 (moved off 8081 — stale
  OPFS locks from old tabs). Full-page screenshots time out in the preview pane; use read_page /
  get_page_text / javascript_tool instead. Console shows "useAnimatedKeyboard not available on web" — expected.
- tsc: app = `npx tsc --noEmit` (scripts/ excluded); importers = `npx tsc -p scripts --noEmit`.

## Android build (local, offline — full doc: C:\myoros\ANDROID_BUILD_SETUP.md + memory android-build-env)

- JDK 21 at `C:\myoros\jdk-21.0.10+7`, Android SDK at `C:\myoros\android-sdk` (platforms 35/36,
  build-tools 35/36, ndk 27.1). ANDROID_HOME is NOT global — set per session.
- CRITICAL sandbox workaround: JDK NIO AF_UNIX self-pipe breaks in the agent sandbox. All three needed:
  `-Djdk.net.unixdomain.tmpdir=C:/myoros/afux` via _JAVA_OPTIONS + GRADLE_OPTS (and it's in
  gradle.properties), dir `C:\myoros\afux` must exist, run gradlew with sandbox DISABLED.
- Build command (from android/): `./gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a`
  → `android/app/build/outputs/apk/release/app-release.apk`. Incremental ≈ 1–8 min.
- Verify: `C:\myoros\android-sdk\build-tools\35.0.0\aapt2.exe dump badging` + `apksigner.bat verify
  --print-certs` (debug cert SHA-256 starts fac61745…). Copy to `release/bayan-vX.Y.Z.apk`, commit, push.
- Version bump lives in android/app/build.gradle (versionCode/versionName) + app.json + the Settings
  footer string in src/screens/SettingsScreen.tsx. Next release = v1.3.0 / versionCode 5.
- git push: GCM auth works headlessly. Large APK pushes can 408 → push source commit first, then the
  APK commit (http.postBuffer already set to 500 MB in repo config).

## Key source files

- Screens: src/screens/ (Reader, Home, Search, Notes, Settings, Credits, Comparison, RootExplorer).
- Word Panel: src/components/WordPanel.tsx (morphology + collapsed/expandable verbatim Lane's +
  attribution; `cleanLexiconText` strips ذ markers at render).
- Reader: src/screens/ReaderScreen.tsx + src/components/reader/AyahView.tsx (tappable words, ornament
  marks, inline translation w/ attribution) + ui/BottomSheet.tsx (keyboard-aware).
- Data: src/data/registry.ts (the plug-in point; auto-rewritten by importers), schema.ts (file shapes),
  database.ts (SQLite build + queries), userStore.ts (annotations DB).
- Docs: DATA_NOTES.md (import schema + all supply/licensing flags), scripts/QAC-MAPPING.md (tag maps +
  root-key convention), this file.

## Backlog for next session (in rough priority order)

1. **Lane gap-fill importer** (agreed): parse full Perseus Lane's XML → fill the ~313 missing roots
   (ربب, هدي, ضلل, …) with verbatim Lane's text, same root-key convention, same share-alike terms.
   Target: word-level lexicon coverage from 80.2% → ~99%.
2. Optional text hygiene: marks-free Tanzil re-download + re-import (kills the 4,578 ornament tokens).
3. App icon + splash from the user's Gemini logo (prompt already written; ask user for the PNG).
4. Sale: full text or disable. Shakir: user decision on enabling.
5. Nice-to-haves discussed: per-word transliteration (needs a vetted source), wazn/pattern (QAC 0.4
   lacks it), scholar review pass of displayed data, Play Store prep (real keystore, R8 shrink test,
   versioned release signing) — only when the user says so.
6. Any bugs the user finds testing v1.2.0 on device this week (esp. verse-jump 2:255, note editor
   keyboard, long-surah scrolling, Word Panel on low-end devices).

## State of the working tree

Clean; everything committed and pushed (HEAD = "Add release APK v1.2.0", dac629b). Task list done.
Persistent agent memory (bayan-quranapp, android-build-env) is up to date and will auto-load.
