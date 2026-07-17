# Bayān — a Qur'anic study app

**Read the Arabic. Understand it from the root. Compare how scholars rendered it.**

Bayān is a premium, fully-offline, English-language Qur'anic study app. Its purpose is to
let you understand the Qur'an **directly from the Arabic** — by exploring each word's root
and its full documented lexical range — and *then* compare how different translators
rendered that same word or verse.

The core principle: **the app takes no interpretive side.** It shows the raw lexical
possibilities author-lessly first, and presents named translations only as clearly-attributed
references for comparison. Everything is framed honestly as *"explore the lexical range and
compare renderings,"* never *"the one true meaning."*

> **Scope:** This is a Qur'an-understanding/research app only. No hadith, prayer times,
> qibla, athkar, or audio recitation. Every screen serves: read the Arabic, understand it
> via roots, compare translations, annotate.

---

## Features

- **Home** — all 114 surahs (Arabic + English + verse count), fast search, and a pinned
  "continue where you left off" card.
- **Reader** — spacious Uthmani Arabic, correct RTL, every **word individually tappable**.
- **Word panel** — tap a word for a spring-up sheet: large Uthmani word, its **root**
  (→ Root Explorer), plain-language morphology, and the **author-less lexicon range** with
  source + Arabic/English toggles.
- **Root Explorer** — every Qur'anic word sharing a root and the verses it appears in.
- **Comparison** — the lexical range shown **first/primary**, then clearly-attributed
  reference-translation cards (stacked or switcher) so you can see how Yusuf Ali vs
  Pickthall vs Sale each chose.
- **Search** — by English word, by Arabic root, or by verse reference (e.g. `2:255`).
- **Annotations** — highlight verses/words in colours, attach notes, bookmark, auto
  "last read". A Library screen reviews everything, each item linking back to its verse.
- **Share** — a clean typeset card (Arabic + chosen translation + attribution) as image or text.
- **Premium UX** — Reanimated 4 motion, custom spring bottom sheet, full light/dark mode,
  adjustable Arabic & translation font sizes, an openly-licensed Qur'an font (Amiri Quran /
  Scheherazade New).

---

## The four data layers (kept strictly separate — this separation *is* the product)

| Layer | What | Source | File |
| --- | --- | --- | --- |
| 1 | Arabic Qur'an text (Uthmani) | Tanzil.net | `assets/data/quran/<nnn>.json` |
| 2 | Morphology per word (root, lemma, POS, features) | Quranic Arabic Corpus model | `assets/data/quran/<nnn>.json` |
| 3 | **Author-less** lexicon (root → documented meanings) | Lane's Lexicon (extensible) | `assets/data/lexicon/<id>.json` |
| 4 | Reference translations (attributed, for comparison) | public-domain only | `assets/data/translations/<id>.json` |

Layer 3 is the **primary** view and must never absorb a translator's chosen rendering.
Layer 4 is always **secondary** and always **attributed**.

---

## Architecture

Clean **presentation / domain / data** separation:

```
src/
  domain/models.ts          typed models (Word, Root, Lexicon, Translation, Annotation…)
  data/                     schema.ts (import contract), registry.ts (plug-in point),
                            database.ts (read-only SQLite), userStore.ts (user SQLite)
  state/                    Settings / Theme / Database / Annotations providers
  theme/                    design tokens + ThemeProvider (light/dark)
  components/               reusable UI + ArabicText, WordPanel, ShareSheet, reader/*
  screens/                  Home, Reader, RootExplorer, Comparison, Search, Notes, Settings, Credits
  navigation/               types + RootNavigator (tabs + native-stack)
```

- **Read layer:** bundled reference data (JSON assets) is loaded into a **read-only SQLite
  DB** (`expo-sqlite`), indexed on `root` and on `(surah, ayah)` for instant Root Explorer
  and verse lookups. It rebuilds automatically when `assets/data/manifest.json`'s `version`
  changes.
- **User layer:** notes, highlights, bookmarks and last-read live in a **separate** SQLite
  DB in the document directory, so they **survive app updates** and never mix with reference
  data. Settings live in AsyncStorage.
- **100% offline.** No backend, no accounts, nothing phones home.

See **[DATA_NOTES.md](DATA_NOTES.md)** for the exact import schema and how to plug in data.

---

## Everything is pluggable via data files

Adding a surah, a translator, or a lexicon = **add an asset + one line in
`src/data/registry.ts` + bump `manifest.json`'s version.** No screen or logic changes.
(Metro requires static import paths, so `registry.ts` is the single place that lists assets.)

---

## Build & run

Requires the local Android toolchain described in `ANDROID_BUILD_SETUP.md`
(JDK 21, Android SDK at `C:\myoros\android-sdk`).

```bash
npm install                 # .npmrc sets legacy-peer-deps
npx expo start --web        # web bundle (smoke test)
```

### Release APK (Android)

```powershell
npx expo prebuild -p android --no-install
# android/local.properties -> sdk.dir=C\:\\myoros\\android-sdk
# android/gradle.properties -> add the JVM AF_UNIX workaround (see ANDROID_BUILD_SETUP.md)
cd android
$env:ANDROID_HOME = "C:\myoros\android-sdk"
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
# -> android/app/build/outputs/apk/release/app-release.apk
```

The release is debug-signed (installable for testing). A real keystore is only needed for
Play Store.

---

## Attribution (legal requirement + part of the app's trustworthiness)

Credited in-app on the **Credits** screen and in context throughout:

- **Qur'an text** — Tanzil Project (CC BY 3.0, used verbatim; link to tanzil.net).
- **Morphology** — Quranic Arabic Corpus, Kais Dukes (GNU GPL; attribution + link to
  corpus.quran.com; cite Dukes & Habash, LREC 2010).
- **Lexicon** — Lane's *Arabic-English Lexicon* (public domain).
- **Translations** — Yusuf Ali (1934, PD), Pickthall (1930, PD), George Sale (1734, PD).
- **Fonts** — Amiri Quran, Scheherazade New, Spectral (all SIL OFL 1.1; `OFL-*.txt` bundled).

> **⚠️ The bundled sample data must be replaced before release.** See the flags in
> [DATA_NOTES.md](DATA_NOTES.md#-data-you-must-supply). This is not legal advice — verify
> each licence against the exact data you ship.
