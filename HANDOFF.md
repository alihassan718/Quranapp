# Bayān — session handoff (updated 2026-07-22)

Paste the prompt at the bottom to resume, or just tell the agent: **"read HANDOFF.md and continue."**

## What this project is

Bayān — a premium, fully-offline, English Qur'anic study app at `C:\otherdata\mythings\Quranapp`.
Understand the Qur'an from the Arabic: tap any word → root + morphology → the author-less lexical range
(Lane's) → compare named translations. The app takes no interpretive side. Plus a **Research** knowledge
space. Strictly Qur'an-study + research; NO hadith/prayer-times/qibla/athkar/audio.

- Expo SDK 57, React Native 0.86, React 19, TypeScript, Reanimated 4 (+worklets), gesture-handler,
  react-native-svg, expo-sqlite.
- Android-only for now (iOS possible later). Debug-signed sideloadable APKs.
- GitHub: https://github.com/alihassan718/Quranapp — `main` is current; `research` branch merged into it.
- 100% offline: bundled JSON → read-only SQLite built on first launch (manifest version = content hash
  → rebuilds when data changes). User data (notes/highlights/bookmarks/last-read + Research **board**)
  in a SEPARATE SQLite DB that survives updates. Settings + reading-position in AsyncStorage.

## Absolute rules (user-set — never violate)

1. NEVER fabricate/paraphrase/"fill in" Arabic, roots, morphology, meanings, or citations. Every value
   is verbatim from a source; gaps stay null and get logged/flagged, never invented.
2. Five data layers stay strictly separate (this separation IS the product): L1 Tanzil Uthmani text ·
   L2 QAC morphology · L3 author-less Lane's lexicon · L4 named translations · L5 Research (curated
   summaries + attributed connections).
3. Adding data = adding files + a registry entry, never code changes.
4. Attribution is mandatory + visible (Credits screen + in-context).
5. Connection (Qur'an-and-science) entries are ATTRIBUTED reflections with an honest status chip —
   never "proofs" (the validator rejects the word "proof" in connection entries).

## Current release — v1.3.0 (versionCode 5), all APKs in release/

Debug-signed, same cert across versions → each installs as an update. HEAD ≈ `c2dfe84`.
- v1.0.0/1.0.1 scaffold+bugfixes · v1.1.0 full Qur'an text+translations · v1.2.0 morphology+lexicon ·
  **v1.3.0 = Research feature (reading experience + personal Board).** ← latest, `release/bayan-v1.3.0.apk`

## Data pipeline (importers: idempotent, deterministic, run with plain `node` — Node 24, no tsx)

Inputs in `data-sources/` (GITIGNORED — present on this machine; re-download if lost):
- `tanzil/quran-uthmani.xml` (⚠ current copy INCLUDES pause/sajdah/rub-el-hizb marks — 4,578 mark
  tokens; handled as non-tappable ornaments) + `tanzil/en.{yusufali,pickthall,shakir}.txt`
- `qac/quranic-corpus-morphology-0.4.txt` (email-gated; Kais Dukes 2011, GPL)
- `lane/quran-arabic-roots-lane-lexicon.json` (structured Lane's; curl-able)

Commands: `npm run import:tanzil` (L1+L4) · `import:morphology` (L2) · `import:lexicon` (L3) ·
`validate:data` · `validate:research`. Docs: `DATA_NOTES.md`, `scripts/QAC-MAPPING.md`.
Shared root-key convention (both importers): hamza/alef-normalized, space-separated Arabic (`ا ل ه`).

## Research feature (Layer 5) — DONE through Phase 2

- Schema `src/data/researchSchema.ts` (validator rejects zero-citation entries and "proof" in
  connections). Data `assets/data/research/<field>.json` (5 fields). Plug-in point
  `src/data/researchRegistry.ts`; validated in-memory loader `src/data/researchStore.ts` (invalid
  files skipped, never rendered); reading-position `src/data/researchProgress.ts`.
- **58 entries**: 50 knowledge (10 each: science/maths/philosophy/psychology/medicine) + 8 connection.
  Drafted by a 21-agent research fan-out, user-reviewed, citation-rechecked (0 fake/dead URLs).
  Embryology (23:12–14) + mountains-as-pegs (78:7) marked CRITICIZED; Big-Bang/expanding-universe/iron/
  two-seas/honey CONTESTED; life-from-water widely-discussed. Proposers attributed by name.
- **6 entries still carry review flags** (surface in-app as "Under review"): uncited sub-claims
  (medicine-k-005 vaccine cellular mechanism, psychology-k-003 Ainsworth categories, science-c-004
  supernova specifics, psychology-k-009 liberty foundation) + 2 attribution caveats (science-c-001
  Ṭanṭāwī precursor, science-c-007 wider ʿalaqa attribution). User is editing the JSON at leisure.
- **Screens:** `ResearchScreen` (search, field chips, My-Board card, integrity intro), `ResearchEntryScreen`
  (progressive disclosure hook→summary→Go-deeper→citations; connection triad visually separated;
  verse→Reader; related strip; remembered scroll), `ResearchBoardScreen` (canvas).
- **The Board** (user's own space): `board_nodes`/`board_edges` in the USER DB (`src/data/userStore.ts`).
  Pin entries (📌 on entry) + ayāt (pin action in Reader `AyahView`); pinch-zoom/pan; drag (UI-thread
  worklet + runOnJS for the DB write); tap→action bar (Open/Connect/Note/Unpin); labeled SVG connection
  curves; notes on nodes+edges. ⚠ **Board touch gestures are DEVICE-ONLY — web preview cannot drive
  RNGH multitouch. Verify drag/pinch/connect on the APK.**
- Credits has a "Research sources" section; DATA-UNDER-TEST notice covers the tab.

## Other features already shipped

- Full Reader (RTL Uthmani, tappable words, inline attributed translations, ornament marks), Word Panel
  (morphology + collapsible verbatim Lane's), Root Explorer, Comparison, Search, Notes/Library, Share.
- **Themes** (Settings → Appearance): palette registry in `src/theme/tokens.ts` — Bayān / **Clear Water**
  (float-on-scroll buoyancy, `motionProfile:'float'`) / **Forest**; each light+dark, composes with the
  light/dark Mode toggle. Add a theme = one entry in `PALETTES`.
- Reader **instant verse jump**: opening at a target ayah WINDOWS the list to start there + a "Show
  earlier verses" pill (no scroll-to-index lag). `maintainVisibleContentPosition` — verify pinning on device.

## Known gaps / backlog (rough priority)

1. **Lane lexicon gap-fill importer** (agreed, not yet built): ~313 high-frequency roots have no Lane's
   definition (ربب 980×, هدي, ضلل…) — `corpus_only` in the dataset. Fill from full Perseus Lane's XML
   (github.com/laneslexicon/lexicon_xml, CC BY-SA 3.0) → word-level coverage ~80% → ~99%.
2. Research review flags (6) — user editing; apply any requested fixes + `npm run validate:research`.
3. App icon & splash still Expo placeholders (a Gemini logo prompt exists: one root ر ح م splitting
   prism-like into 5 emerald→gold rays, parchment bg, no crescent/mosque/book). Ask user for the PNG.
4. Optional: marks-free Tanzil re-download → re-run 3 importers (drops the 4,578 ornament tokens).
5. Sale = Fatiha-only sample (supply full text or disable); Shakir imported but `enabled:false`.
6. Play Store later: real keystore, R8 shrink test, AAB. Data is 64 MB JSON → 23 MB Hermes bundle →
   44 MB APK; a future win is shipping a prebuilt SQLite asset instead of JSON-in-bundle.

## RN / web dev gotchas (hard-won — don't rediscover)

- NEVER set a small explicit lineHeight on Qur'anic Arabic (Android hard-clips stacked diacritics);
  `ArabicText` omits lineHeight unless caller passes ≥2.
- expo-sqlite web (wa-sqlite) not re-entrant → open DBs SEQUENTIALLY (DatabaseProvider does).
- Reanimated `entering` (FadeIn) on RN-web silently HIDES the subtree — never on must-show content.
- FlatList needs `extraData`; RNW virtualized deep-scroll is unreliable — verify verse-jump on device.
- **Hermes stores strings as UTF-16LE** → verify bundled strings with `encode('utf-16-le')`, not grep.
- **RNGH multitouch (drag/pinch/tap-select) can't be driven by the web preview** — device-only. Board
  gesture code: worklet handlers touch only shared values; JS work via `runOnJS`; pan/pinch start values
  are shared values, NOT React refs (a ref read inside a worklet is a bug).
- Web preview: `.claude/launch.json` runs `expo start --web` on port 8082. Screenshots time out; use
  read_page / get_page_text / javascript_tool. `useAnimatedKeyboard not available on web` warning is expected.
- Typecheck: app = `npx tsc --noEmit` (scripts/ excluded); importers = `npx tsc -p scripts --noEmit`.

## Android build (local, offline — full doc C:\myoros\ANDROID_BUILD_SETUP.md + memory android-build-env)

- JDK 21 `C:\myoros\jdk-21.0.10+7`; Android SDK `C:\myoros\android-sdk` (platforms 35/36, build-tools
  35/36, ndk 27.1). ANDROID_HOME is NOT global — set per session.
- CRITICAL sandbox workaround (all three): `-Djdk.net.unixdomain.tmpdir=C:/myoros/afux` via
  `_JAVA_OPTIONS` + `GRADLE_OPTS`; dir `C:\myoros\afux` must exist; run gradlew with sandbox DISABLED.
- Build (from android/): `./gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a` →
  `android/app/build/outputs/apk/release/app-release.apk`. Incremental ≈ 1–2 min.
- Verify: `…/build-tools/35.0.0/aapt2.exe dump badging <apk>` + `apksigner.bat verify <apk>` (debug cert
  SHA-256 starts fac61745…; apksigner via PowerShell shows a harmless exit-255 stderr quirk — output is fine).
  Copy to `release/bayan-vX.Y.Z.apk`, commit, push. Version bump lives in android/app/build.gradle
  (versionCode/Name) + app.json + the Settings footer string. **Next release = v1.4.0 / versionCode 6.**
- Adding a NEW native module (like react-native-svg was) → the first assembleRelease autolinks it; no
  re-prebuild needed. git push over HTTPS works headlessly (GCM).

## State of the working tree

On `main`, clean, everything committed + pushed (HEAD ≈ c2dfe84). `research` branch also on remote.
Persistent memory ([[bayan-quranapp]], [[android-build-env]]) is current and auto-loads.
