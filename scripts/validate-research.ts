/**
 * Validates the bundled Research data files against the schema in
 * src/data/researchSchema.ts (every entry cites ≥1 source; connection entries
 * are attributed + status-labelled + never say "proof"; ids unique; etc.).
 *
 * Run: node scripts/validate-research.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { RESEARCH_FIELD_IDS, validateResearchFile } from '../src/data/researchSchema.ts';

const ROOT = path.resolve(path.dirname(process.argv[1]), '..');
const DIR = path.join(ROOT, 'assets', 'data', 'research');

let total = 0;
let knowledge = 0;
let connection = 0;
let withFlags = 0;
let allErrors = 0;

for (const field of RESEARCH_FIELD_IDS) {
  const p = path.join(DIR, `${field}.json`);
  if (!fs.existsSync(p)) {
    console.error(`✖ missing ${field}.json`);
    allErrors += 1;
    continue;
  }
  const file = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const errs = validateResearchFile(file);
  const k = file.entries.filter((e: { type: string }) => e.type === 'knowledge').length;
  const c = file.entries.filter((e: { type: string }) => e.type === 'connection').length;
  const flagged = file.entries.filter((e: { reviewFlag: string | null }) => e.reviewFlag).length;
  total += file.entries.length;
  knowledge += k;
  connection += c;
  withFlags += flagged;
  if (errs.length) {
    allErrors += errs.length;
    console.error(`✖ ${field}: ${errs.length} error(s)`);
    for (const e of errs) console.error(`    - ${e}`);
  } else {
    console.log(`✓ ${field}: ${file.entries.length} entries (${k} knowledge, ${c} connection, ${flagged} flagged) — valid`);
  }
}

console.log('\n────────────────────────────');
console.log(`Total: ${total} entries (${knowledge} knowledge, ${connection} connection); ${withFlags} carry a review flag.`);
if (allErrors) {
  console.error(`\n✖ ${allErrors} schema error(s) — fix before shipping.`);
  process.exit(1);
}
console.log('✓ All Research data files valid against schemaVersion 1.');
