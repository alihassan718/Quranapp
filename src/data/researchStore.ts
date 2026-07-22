/**
 * In-memory access layer over the bundled Research content (Layer 5).
 *
 * The data set is small (tens of entries), so it lives as validated in-memory
 * arrays — no SQLite involvement. Every file is validated against the schema
 * at load; invalid entries are EXCLUDED and reported to the console rather
 * than rendered (content integrity over completeness).
 */

import { RESEARCH_FILES } from './researchRegistry';
import {
  Citation,
  ResearchEntry,
  ResearchFieldId,
  validateResearchFile,
} from './researchSchema';

export interface ResearchFieldMeta {
  id: ResearchFieldId;
  count: number;
}

const entriesById = new Map<string, ResearchEntry>();
const entriesByField = new Map<ResearchFieldId, ResearchEntry[]>();
const allEntries: ResearchEntry[] = [];

for (const file of RESEARCH_FILES) {
  const errs = validateResearchFile(file);
  if (errs.length) {
    // Never render data that fails the schema — report and skip the file.
    console.error(`[research] ${file.field}.json failed validation (${errs.length}); file skipped:`, errs.slice(0, 5));
    continue;
  }
  const list: ResearchEntry[] = [];
  for (const e of file.entries) {
    entriesById.set(e.id, e);
    list.push(e);
    allEntries.push(e);
  }
  entriesByField.set(file.field, list);
}

export function getAllResearchEntries(): ResearchEntry[] {
  return allEntries;
}

export function getResearchEntry(id: string): ResearchEntry | undefined {
  return entriesById.get(id);
}

export function getRelatedEntries(id: string): ResearchEntry[] {
  const e = entriesById.get(id);
  if (!e) return [];
  return e.relatedEntryIds
    .map((rid) => entriesById.get(rid))
    .filter((x): x is ResearchEntry => !!x);
}

export function getFieldCounts(): ResearchFieldMeta[] {
  return Array.from(entriesByField.entries()).map(([id, list]) => ({ id, count: list.length }));
}

/** Simple text + field filter across title/hook/summary/tags/proposer. */
export function searchResearch(query: string, field: ResearchFieldId | 'all'): ResearchEntry[] {
  const q = query.trim().toLowerCase();
  const pool = field === 'all' ? allEntries : (entriesByField.get(field) ?? []);
  if (!q) return pool;
  return pool.filter((e) => {
    const hay = `${e.title} ${e.hook} ${e.summary} ${e.tags.join(' ')} ${e.proposer ?? ''}`.toLowerCase();
    return q
      .split(/\s+/)
      .every((term) => hay.includes(term));
  });
}

/** Distinct citation sources across all bundled entries — for the Credits screen. */
export function getResearchSources(): { source: string; access: Citation['access']; count: number }[] {
  const map = new Map<string, { source: string; access: Citation['access']; count: number }>();
  for (const e of allEntries) {
    for (const c of e.citations) {
      const cur = map.get(c.source);
      if (cur) cur.count += 1;
      else map.set(c.source, { source: c.source, access: c.access, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
