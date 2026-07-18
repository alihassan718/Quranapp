/**
 * Combined data validation — runs after Importers A + B.
 *
 * Reports, from the actual bundled files:
 *   • total words; % with morphology; % with a root; % with a per-word gloss;
 *   • ROOT-level lexicon coverage (distinct roots with a Lane's entry);
 *   • WORD-level lexicon coverage (% of word occurrences whose root has an entry);
 *   • the 20 highest-frequency roots that LACK a lexicon entry (worst gaps);
 *   • structural validation of all 114 files.
 *
 * Read-only: never modifies data.  Run: node scripts/validate-data.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(path.dirname(process.argv[1]), '..');
const QURAN_DIR = path.join(ROOT, 'assets', 'data', 'quran');
const LEXICON = path.join(ROOT, 'assets', 'data', 'lexicon', 'lane.json');

function main(): void {
  const lex = JSON.parse(fs.readFileSync(LEXICON, 'utf-8'));
  const lexKeys = new Set<string>(Object.keys(lex.entries));

  let totalWords = 0;
  let withMorph = 0;
  let withRoot = 0;
  let withGloss = 0;
  let markTokens = 0;
  const structErrors: string[] = [];
  const rootCounts = new Map<string, number>();

  for (let s = 1; s <= 114; s++) {
    const file = path.join(QURAN_DIR, `${String(s).padStart(3, '0')}.json`);
    if (!fs.existsSync(file)) { structErrors.push(`missing ${s}`); continue; }
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (data.surah?.number !== s) structErrors.push(`${s}: surah.number mismatch`);
    if (!Array.isArray(data.ayahs)) { structErrors.push(`${s}: no ayahs`); continue; }
    for (const ayah of data.ayahs) {
      if (!Array.isArray(ayah.words)) { structErrors.push(`${s}:${ayah.number}: no words`); continue; }
      ayah.words.forEach((w: Record<string, unknown>, i: number) => {
        totalWords += 1;
        if (w.position !== i + 1) structErrors.push(`${s}:${ayah.number} pos ${i + 1}`);
        if (typeof w.textUthmani !== 'string' || !(w.textUthmani as string).length) structErrors.push(`${s}:${ayah.number}:${i + 1} empty text`);
        const isMark = !/[ء-يٱ-ۓۺ-ۿ]/u.test(w.textUthmani as string);
        if (isMark) markTokens += 1;
        if (w.pos != null || w.root != null || (Array.isArray(w.features) && (w.features as unknown[]).length)) withMorph += 1;
        if (typeof w.root === 'string' && (w.root as string).length) {
          withRoot += 1;
          rootCounts.set(w.root as string, (rootCounts.get(w.root as string) ?? 0) + 1);
        }
        // No per-word gloss field exists in the schema (skipped by design).
        if ((w as Record<string, unknown>).gloss) withGloss += 1;
      });
    }
  }

  const distinctRoots = [...rootCounts.keys()];
  const coveredRoots = distinctRoots.filter((r) => lexKeys.has(r));
  const uncoveredRoots = distinctRoots.filter((r) => !lexKeys.has(r));

  let coveredWordOcc = 0;
  let rootBearingWordOcc = 0;
  for (const [r, c] of rootCounts) {
    rootBearingWordOcc += c;
    if (lexKeys.has(r)) coveredWordOcc += c;
  }

  const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1) + '%' : 'n/a');

  console.log('════════════════ DATA VALIDATION REPORT ════════════════\n');
  console.log('STRUCTURE');
  console.log(`  114 surah files parsed        : ${structErrors.length === 0 ? 'OK ✓' : structErrors.length + ' errors'}`);
  if (structErrors.length) console.log('   ' + structErrors.slice(0, 20).join('\n   '));

  console.log('\nWORDS & MORPHOLOGY (Layer 2 — Quranic Arabic Corpus v0.4)');
  console.log(`  Total word tokens             : ${totalWords}`);
  console.log(`    of which pause/sajdah marks : ${markTokens} (non-words; morphology null by design)`);
  console.log(`  Words with morphology         : ${withMorph}  (${pct(withMorph, totalWords)} of all tokens)`);
  console.log(`  Words with a root             : ${withRoot}  (${pct(withRoot, totalWords)})`);
  console.log(`  Words with a per-word gloss   : ${withGloss}  (0% — skipped by design, no clean-licensed source)`);

  console.log('\nLEXICON (Layer 3 — Lane\'s via Perseus, CC BY-SA 3.0)');
  console.log(`  Distinct roots in the Qur'an  : ${distinctRoots.length}`);
  console.log(`  Roots WITH a Lane's entry     : ${coveredRoots.length}  (${pct(coveredRoots.length, distinctRoots.length)}) ← root-level coverage`);
  console.log(`  Roots WITHOUT an entry        : ${uncoveredRoots.length}`);
  console.log(`  Root-bearing word occurrences : ${rootBearingWordOcc}`);
  console.log(`  ...covered by a Lane's entry  : ${coveredWordOcc}  (${pct(coveredWordOcc, rootBearingWordOcc)}) ← WORD-level coverage`);

  console.log('\nWORST GAPS — 20 highest-frequency roots with NO lexicon entry:');
  const topUncovered = uncoveredRoots
    .map((r) => ({ root: r, count: rootCounts.get(r) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  for (const u of topUncovered) console.log(`  ${String(u.count).padStart(5)}×  ${u.root}`);

  console.log('\n(These roots have morphology but show no author-less meaning in-app — they stay');
  console.log(' null, never invented. Many are geminate/weak roots the source dataset left blank.)');
}

main();
