/**
 * Research content model (Layer 5 — curated knowledge space).
 *
 * LEGAL/OFFLINE FOUNDATION: we bundle NO papers, articles, or copied text.
 * Each entry is a CURATED SUMMARY written fresh for this app plus verbatim
 * METADATA only (title/authors/year/source/URL-DOI), and MUST cite at least one
 * authoritative source. Entries live in bundled data files (one per field),
 * pluggable like every other layer — adding/editing entries = editing data,
 * not code.
 *
 * Two entry types with different rules:
 *   • 'knowledge'  — standalone educational content; summary + citations.
 *   • 'connection' — a named person's proposed link between a verse and a
 *     finding, rendered in three visually-separate parts (fact / proposed
 *     connection / status) and ATTRIBUTED — never the app's own claim, never
 *     "proof".
 */

export const RESEARCH_SCHEMA_VERSION = 1;

export type ResearchFieldId = 'science' | 'maths' | 'philosophy' | 'psychology' | 'medicine';

export const RESEARCH_FIELD_IDS: ResearchFieldId[] = [
  'science',
  'maths',
  'philosophy',
  'psychology',
  'medicine',
];

export type EntryType = 'knowledge' | 'connection';

/** How the cited source may be used — drives the "may we quote?" boundary. */
export type CitationAccess =
  | 'open-access' // openly licensed (CC etc.) — may summarize + link
  | 'free-to-read' // readable free, rights reserved — summarize + link, no verbatim quoting
  | 'public-domain' // out of copyright — may quote
  | 'metadata-only'; // paywalled; we cite metadata + link only

export interface Citation {
  /** Publisher/source name, e.g. "PLOS ONE", "Stanford Encyclopedia of Philosophy". */
  source: string;
  title: string;
  authors: string | null;
  year: string | null;
  /** Canonical URL or DOI link — tappable, opens the browser. */
  url: string;
  access: CitationAccess;
  note: string | null;
}

/** Connection-entry status — the honest label. Never "proof". */
export type ConnectionStatus = 'widely-discussed' | 'contested' | 'criticized';

export interface ResearchEntry {
  id: string; // e.g. "sci-k-001", "med-c-002"
  field: ResearchFieldId;
  type: EntryType;
  title: string;
  /** One-line hook shown first (progressive disclosure). */
  hook: string;
  /** Short, plain-language summary in the app's OWN words. */
  summary: string;
  /** "Go deeper" body; null if the summary stands alone. */
  detail: string | null;
  citations: Citation[];
  tags: string[];
  relatedEntryIds: string[];

  /* ---- type === 'connection' only (null/empty otherwise) ---- */
  verseRef: { surah: number; ayah: number } | null;
  /** Cited to the authoritative source. */
  whatKnowledgeSays: string | null;
  /** Attributed to whoever proposed it — the app takes no side. */
  proposedConnection: string | null;
  proposer: string | null;
  status: ConnectionStatus | null;
  /** One line on why this status (esp. for contested/criticized). */
  statusNote: string | null;

  /** Curation provenance — flagged in-app while under review. */
  reviewFlag: string | null;
}

/** `assets/data/research/<field>.json` — one file per field. */
export interface ResearchFieldFile {
  field: ResearchFieldId;
  schemaVersion: number;
  entries: ResearchEntry[];
  _note?: string;
}

/* ------------------------------------------------------------------ *
 * Validation — run at import; reject malformed entries loudly.
 * ------------------------------------------------------------------ */

export function validateResearchFile(file: ResearchFieldFile): string[] {
  const errs: string[] = [];
  if (!RESEARCH_FIELD_IDS.includes(file.field)) errs.push(`bad field: ${file.field}`);
  if (file.schemaVersion !== RESEARCH_SCHEMA_VERSION)
    errs.push(`schemaVersion ${file.schemaVersion} != ${RESEARCH_SCHEMA_VERSION}`);
  if (!Array.isArray(file.entries)) {
    errs.push('entries not an array');
    return errs;
  }
  const ids = new Set<string>();
  for (const e of file.entries) {
    const at = `entry ${e.id}`;
    if (!e.id) errs.push('entry with no id');
    if (ids.has(e.id)) errs.push(`${at}: duplicate id`);
    ids.add(e.id);
    if (e.field !== file.field) errs.push(`${at}: field mismatch`);
    if (e.type !== 'knowledge' && e.type !== 'connection') errs.push(`${at}: bad type`);
    for (const k of ['title', 'hook', 'summary'] as const)
      if (typeof e[k] !== 'string' || !e[k].trim()) errs.push(`${at}: missing ${k}`);
    // Every entry MUST cite at least one authoritative source.
    if (!Array.isArray(e.citations) || e.citations.length === 0)
      errs.push(`${at}: needs ≥1 citation`);
    for (const c of e.citations ?? []) {
      if (!c.source?.trim() || !c.title?.trim() || !c.url?.trim())
        errs.push(`${at}: incomplete citation`);
      if (!/^https?:\/\//.test(c.url ?? '')) errs.push(`${at}: citation url not http(s)`);
    }
    if (e.type === 'connection') {
      if (!e.verseRef || !e.verseRef.surah || !e.verseRef.ayah)
        errs.push(`${at}: connection needs verseRef`);
      for (const k of ['whatKnowledgeSays', 'proposedConnection', 'proposer', 'status'] as const)
        if (!e[k]) errs.push(`${at}: connection needs ${k}`);
      if (e.status && !['widely-discussed', 'contested', 'criticized'].includes(e.status))
        errs.push(`${at}: bad status`);
      // Integrity guard: the word "proof" must never appear in a connection.
      const blob = `${e.summary} ${e.detail ?? ''} ${e.proposedConnection ?? ''}`.toLowerCase();
      if (/\bproof\b|\bproves\b|\bproven\b/.test(blob)) errs.push(`${at}: uses "proof" language`);
    }
  }
  return errs;
}
