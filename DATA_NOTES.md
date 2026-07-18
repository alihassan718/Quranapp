# Data notes — import schema & what you must supply

This documents the exact JSON format Bayān reads, how to plug in more data, and — most
importantly — **every place where the bundled sample data must be replaced with real,
verified, correctly-attributed data before release.**

The bundled example is **Surah Al-Fātiḥah** — study `assets/data/quran/001.json` alongside
this document; it is the canonical template.

TypeScript shapes for all of these live in `src/data/schema.ts`.

---

## Files & layout

```
assets/data/
  manifest.json              { version, availableSurahs }  — bump version to rebuild the DB
  surahs.json                metadata for all 114 surahs (Home list)
  quran/001.json             Layer 1 (Uthmani text) + Layer 2 (morphology) for a surah
  lexicon/lane.json          Layer 3 — author-less lexicon, keyed by root
  translations/yusufali.json Layer 4 — one file per translator, verses keyed "surah:ayah"
  translations/pickthall.json
  translations/sale.json
  translations/shakir.json   (placeholder — text NOT bundled)
```

## `surahs.json` — all 114 surahs
```json
[
  { "number": 1, "nameArabic": "الفاتحة", "nameEnglish": "The Opening",
    "nameTransliteration": "Al-Fātiḥah", "revelationPlace": "Meccan", "ayahCount": 7 }
]
```
`revelationPlace` must be exactly `"Meccan"` or `"Medinan"`. The 114 `ayahCount`s sum to 6236.

## `quran/<nnn>.json` — Layers 1 + 2 (one file per surah)
```json
{
  "surah": { "number": 1, "nameArabic": "…", "nameEnglish": "…",
             "nameTransliteration": "…", "revelationPlace": "Meccan",
             "ayahCount": 7, "bismillahIsFirstAyah": true },
  "ayahs": [
    {
      "number": 1,
      "textUthmani": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      "words": [
        {
          "position": 1,
          "textUthmani": "بِسْمِ",
          "transliteration": "bis-mi",
          "root": "س م و",              // space-separated letters, or null for particles
          "rootTranslit": "s-m-w",
          "lemma": "ٱسْم",
          "pos": "N",                   // QAC-style tag
          "posLabel": "Noun",           // plain-language
          "pattern": "ٱسْم (ism)",
          "features": [ { "label": "Case", "value": "Genitive" } ],
          "featuresRaw": "STEM|POS:N|…" // optional raw QAC string, for reference
        }
      ]
    }
  ]
}
```
Word tokens here are whitespace-delimited. The full Quranic Arabic Corpus segments clitic
prefixes (`bi-`, `li-`, `wa-`, `al-`) into separate segments; represent those in `features[]`.

## `lexicon/<id>.json` — Layer 3 (author-less, keyed by root)
```json
{
  "source": { "id": "lane", "name": "Lane's Arabic-English Lexicon",
              "author": "Edward William Lane", "year": "1863–1893",
              "license": "…", "licenseStatus": "public-domain",
              "attribution": "…", "isSample": true },
  "entries": {
    "ر ح م": {
      "root": "ر ح م", "rootTranslit": "r-ḥ-m",
      "senses": [
        { "definitionEn": "Mercy, compassion…", "definitionAr": "رقّة…", "notes": null }
      ]
    }
  }
}
```
Set `isSample: false` once you replace the sample glosses with verified source text. The app
shows a red "Sample data" badge whenever `isSample` is `true`.

## `translations/<id>.json` — Layer 4 (one per translator)
```json
{
  "translator": { "id": "yusufali", "name": "The Holy Qur'an",
                  "translator": "Abdullah Yusuf Ali", "year": "1934",
                  "language": "en", "direction": "ltr",
                  "license": "…", "licenseStatus": "public-domain",
                  "attribution": "…", "enabled": true, "note": "…" },
  "verses": { "1:1": "In the name of Allah, Most Gracious, Most Merciful." }
}
```
`licenseStatus` ∈ `public-domain | contested | licensed`. `enabled: false` hides the
translator everywhere (used for the Shakir placeholder). `verses` is keyed `"surah:ayah"`.

## `manifest.json`
```json
{ "version": 1, "availableSurahs": [1] }
```
Bump `version` whenever any bundled data changes → the app drops and rebuilds its read-only
SQLite database on next launch. Translator/lexicon catalogues are derived from the files
registered in `src/data/registry.ts`.

---

## Adding data without touching app logic

1. Drop the JSON file under `assets/data/…` in the shapes above.
2. Add one import + array entry in `src/data/registry.ts`.
3. Bump `version` in `manifest.json`.

That's it — screens, queries and the DB builder iterate the registry arrays generically.

---

## Importing the full Qur'an (Tanzil importer — Layers 1 + 4)

`scripts/import-tanzil.ts` converts raw Tanzil source files into all 114 surah files +
the three translation files, updates `registry.ts` and `manifest.json`, and validates
everything (canonical Kufan counts, 6236 ayat, verse alignment across all sources,
schema conformance). It never invents content: morphology (Layer 2) and lexicon
(Layer 3) fields are written as explicit `null`/`[]` for a later importer to fill.

**1. Download the inputs into `data-sources/tanzil/` (gitignored, never fetched at build time):**

| File | Where | Options |
|---|---|---|
| `quran-uthmani.xml` | <https://tanzil.net/download/> | Qur'an text **Uthmani**, file format **XML**. Leave *pause marks* and *sajdah signs* **unchecked** so word tokens align 1:1 with Quranic Arabic Corpus positions for the later Layer-2 import. |
| `en.yusufali.txt` | <https://tanzil.net/trans/> | **Text** format |
| `en.pickthall.txt` | <https://tanzil.net/trans/> | **Text** format |
| `en.shakir.txt` | <https://tanzil.net/trans/> | **Text** format |

XML is required for the Arabic (not `.txt`) because Tanzil's XML carries the bismillah
as an *attribute*, keeping verse-1 text clean for surahs 2–114.

**2. Run:**

```
npm run import:tanzil
```

The run is idempotent (same inputs → byte-identical outputs; the manifest version is
derived from a content hash) and fails loudly on any count/alignment mismatch instead
of writing misaligned data. The app rebuilds its SQLite DB on next launch.

**Notes:**
- Shakir's verses are imported but the translator stays `enabled: false`
  (rights contested — see point 5 below). Enable it deliberately in
  `assets/data/translations/shakir.json` if you accept that risk.
- `sale.json` is untouched (Tanzil doesn't distribute Sale); it keeps its
  Al-Fātiḥah sample verses until you supply a full source.
- Re-running the importer replaces `001.json`, including its sample morphology —
  after import, **all** words have `root: null` until the QAC (Layer 2) import exists.

---

## ⚠️ Data you must supply

Everything below is **flagged in-app** (Credits screen, sample badges) and must be handled
before a real release:

1. **Only Surah Al-Fātiḥah is bundled.** Download the Tanzil sources and run
   `npm run import:tanzil` (section above) to generate `quran/001.json … 114.json` and the
   three translation files. The Uthmani text is used **verbatim** (modification is not
   permitted); include Tanzil's copyright notice + a link to tanzil.net, and match the exact
   copyright year to the version you download.

2. **The lexicon entries are illustrative SAMPLES, not verbatim Lane's Lexicon.**
   (`lane.json` → `source.isSample: true`.) Replace with verified Lane's text (or OCR of the
   public-domain scans). If you reuse a digitised dataset (e.g. Perseus), honour its added
   licence (Perseus = CC BY-SA 3.0 US). This is the app's core promise — get it right.

3. **The morphology is modelled on the Quranic Arabic Corpus.** If you import the real QAC
   data, keep its attribution ("Quranic Arabic Corpus" + link to corpus.quran.com) and cite
   Dukes & Habash, LREC 2010. Note QAC's GPL terms if your app is closed-source/commercial.

4. **Translation renderings are SAMPLES — verify them** against an authoritative source file
   (e.g. Tanzil) before shipping the full Qur'an. Yusuf Ali (1934) and Pickthall (1930) are
   widely treated as public domain; George Sale (1734) is unambiguously PD.

5. **Shakir is NOT bundled.** Its rights are claimed by **Tahrike Tarsile Qur'an, Inc.**, and
   it is reportedly derivative of Muhammad Ali (1917) — i.e. **not** safely public domain,
   which conflicts with the "no modern copyrighted translation" rule. `shakir.json` ships as a
   disabled placeholder. Supply verified text and set `enabled: true` **only** if you confirm
   the rights, or keep using clean-PD alternatives (Sale 1734, Rodwell 1861, Palmer 1880).

6. **Fonts** — Amiri Quran, Scheherazade New, Spectral are bundled under SIL OFL 1.1 with
   their `OFL-*.txt` files in `assets/fonts/`. Keep those licence files; don't sell the fonts
   standalone; rename if you modify them (respect reserved names "Scheherazade"/"SIL").

7. **App icon & splash** are still the Expo template placeholders — replace with real branding
   before release.

*This is factual/compliance guidance, not legal advice. Verify every licence against the
exact data and fonts you actually ship.*
