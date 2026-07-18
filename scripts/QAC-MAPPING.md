# QAC → app mapping tables (Importer A) + shared root-key convention

This documents how `scripts/import-morphology.ts` converts Quranic Arabic Corpus
(morphology v0.4) data into the app's schema, and the root-key convention shared
with `scripts/import-lexicon.ts`. Nothing here is interpretive: every value is a
mechanical transform of the verbatim QAC annotation.

## 1. QAC file format

Tab-separated, one row per **segment**:

```
LOCATION            FORM        TAG   FEATURES
(1:1:1:1)           bi          P     PREFIX|bi+
(1:1:1:2)           somi        N     STEM|POS:N|LEM:{som|ROOT:smw|M|GEN
```

- `LOCATION` = `(surah:ayah:word:segment)`. Segments are reassembled per
  `(surah:ayah:word)`.
- `FORM` = Buckwalter transliteration of the segment.
- `FEATURES` begins with `PREFIX` / `STEM` / `SUFFIX`; the STEM carries
  `POS:`, `LEM:` (lemma), `ROOT:`, and grammatical tokens.

## 2. Buckwalter → Arabic

Standard Buckwalter. Letters: `' > < & } | { A b p t v j H x d * r z s $ S D T Z E g f q k l m n h w Y y _` →
`ء أ إ ؤ ئ آ ٱ ا ب ة ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ى ي ـ`.
Diacritics: `a u i F N K ~ o \`` → fatḥa, ḍamma, kasra, fatḥatān, ḍammatān,
kasratān, shadda, sukūn, dagger-alef. Lemmas keep their diacritics; roots are
consonantal.

## 3. Root-key convention (SHARED by both importers)

The canonical key is **Arabic letters, hamza/alef-seat normalized,
space-separated**, e.g. `ا ل ه`.

- QAC roots are Buckwalter (`Alh`, `smw`, `rHm`) → `bw2ar` → normalize.
- Lane's roots come from the dataset's Arabic `root` field → normalize.
  (Its `root_buckwalter` uses a *different* Buckwalter dialect and must NOT be
  bridged directly — matching drops from ~99% to ~65%.)
- Normalization: `أ إ آ ٱ → ا`, `ؤ ئ → ء`. This is required because QAC writes
  hamza-bearing roots with a bare alef (`Alh`) while Lane keeps the hamza
  (`أله`); without it the two importers produce different keys.

This yields 1,637 / 1,642 QAC roots (99.7%) with a matching lexicon key; the
coverage ceiling (1,329 roots) is set by *null* Lane definitions, not key
mismatches.

Transliteration (`r-ḥ-m`) is derived from the normalized Arabic letters.

## 4. POS tag → label

`N`→Noun, `PN`→Proper noun, `ADJ`→Adjective, `V`→Verb, `PRON`→Pronoun,
`DEM`→Demonstrative pronoun, `REL`→Relative pronoun, `P`→Preposition,
`T`→Time adverb, `LOC`→Location adverb, `DET`→Determiner, `CONJ`→Conjunction,
`SUB`→Subordinating conjunction, `ACC`→Accusative particle, `NEG`→Negative
particle, `PRO`→Prohibition particle, `INTG`→Interrogative particle,
`COND`→Conditional particle, `RES`→Restriction particle, `EXP`→Exceptive
particle, `AVR`→Aversion particle, `CERT`→Certainty particle, `RSLT`→Result
particle, `CAUS`→Cause particle, `AMD`→Amendment particle, `ANS`→Answer
particle, `INC`→Inceptive particle, `SUR`→Surprise particle, `REM`→Resumption
particle, `EMPH`→Emphatic particle, `IMPV`→Imperative verb, `VOC`→Vocative
particle, `INL`→Quranic initials, `FUT`→Future particle, and the remaining
particle tags similarly. Unknown tags fall through unlabeled (kept only in the
raw feature string — never invented).

## 5. Grammatical feature tokens → plain language

- Case: `NOM`→Nominative, `ACC`→Accusative, `GEN`→Genitive
- State: `DEF`→Definite, `INDEF`→Indefinite
- Mood: `IND`→Indicative, `SUBJ`→Subjunctive, `JUS`→Jussive
- Voice: `ACT`→Active, `PASS`→Passive
- Aspect: `PERF`→Perfect, `IMPF`→Imperfect, `IMPV`→Imperative
- Person/gender/number, compact `3MP` / `MS` / `2FS` / `F` / `P`:
  `1/2/3`→person, `M/F`→gender, `S/D/P`→singular/dual/plural
- Verb form `(I)`…`(XII)` → "Verb form: IV"
- `VN`→Verbal noun; `ACT`(participle context)→Active participle;
  `PASS`→Passive participle
- Prefix clitics: `bi+`→bi- (preposition), `Al+`→al- (definite article),
  `l:P+`→li- (preposition), `w:CONJ+`→wa- (conjunction), `f:CONJ+`→fa-,
  `s:FUT+`→sa- (future), etc.
- Suffix `PRON` → "Attached pronoun (…)"

`POS` is surfaced by the Word Panel's dedicated part-of-speech row, so it is NOT
duplicated in the feature list. Any token not in these tables is preserved only
in `featuresRaw` and never shown with an invented meaning.

## 6. What stays null (by design, never fabricated)

- **Per-word English gloss** — no clean-licensed source (see DATA_NOTES.md).
- **`transliteration`** — no vetted per-word transliteration source.
- **`pattern` (wazn)** — QAC v0.4 does not provide it.
- Any word in an ayah whose letter-token count ≠ QAC word count (4 ayat:
  2:181, 8:6, 13:37, 37:130 — Tanzil splits `بعد ما` / `إل ياسين` where QAC
  joins them) keeps null morphology and is logged.

## 7. Alignment

Positional by `(surah, ayah, word-index)`, matching QAC words to our
**letter-bearing** tokens only (standalone pause / sajdah / rub-el-hizb marks are
ornaments, not words, and keep null morphology). The stored Tanzil text is never
modified; a diacritic-stripping form is used only to cross-check alignment.
