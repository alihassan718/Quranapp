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

## ⚠️ Data you must supply

Everything below is **flagged in-app** (Credits screen, sample badges) and must be handled
before a real release:

1. **Only Surah Al-Fātiḥah is bundled.** Supply `quran/002.json … quran/114.json` (and their
   translations) in the same format. Source the Uthmani text from **Tanzil.net**, used
   **verbatim** (modification is not permitted), and include Tanzil's copyright notice + a
   link to tanzil.net. Match the exact copyright year to the version you download.

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
