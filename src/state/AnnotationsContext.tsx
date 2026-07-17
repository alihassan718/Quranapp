import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import * as store from '../data/userStore';
import { Bookmark, Highlight, LastRead, Note } from '../domain/models';
import { HighlightColorKey } from '../theme/tokens';
import { useUserDb } from './DatabaseProvider';

interface AnnotationsContextValue {
  highlights: Highlight[];
  notes: Note[];
  bookmarks: Bookmark[];
  lastRead: LastRead | null;
  loaded: boolean;

  // Lookups (cheap, memoised)
  getAyahHighlight: (surah: number, ayah: number) => Highlight | undefined;
  getWordHighlight: (surah: number, ayah: number, position: number) => Highlight | undefined;
  getNote: (surah: number, ayah: number) => Note | undefined;
  isBookmarked: (surah: number, ayah: number) => boolean;

  // Mutations
  toggleHighlight: (
    surah: number,
    ayah: number,
    wordPosition: number | null,
    color: HighlightColorKey,
  ) => Promise<void>;
  removeHighlight: (id: number) => Promise<void>;
  saveNote: (surah: number, ayah: number, text: string) => Promise<void>;
  deleteNote: (surah: number, ayah: number) => Promise<void>;
  toggleBookmark: (surah: number, ayah: number) => Promise<boolean>;
  removeBookmark: (id: number) => Promise<void>;
  markLastRead: (surah: number, ayah: number) => Promise<void>;
}

const AnnotationsContext = createContext<AnnotationsContextValue | undefined>(undefined);

const key = (s: number, a: number) => `${s}:${a}`;

export function AnnotationsProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [lastRead, setLastReadState] = useState<LastRead | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refreshHighlights = useCallback(async () => {
    setHighlights(await store.getAllHighlights(db));
  }, [db]);
  const refreshNotes = useCallback(async () => {
    setNotes(await store.getAllNotes(db));
  }, [db]);
  const refreshBookmarks = useCallback(async () => {
    setBookmarks(await store.getAllBookmarks(db));
  }, [db]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [h, n, b, lr] = await Promise.all([
        store.getAllHighlights(db),
        store.getAllNotes(db),
        store.getAllBookmarks(db),
        store.getLastRead(db),
      ]);
      if (!alive) return;
      setHighlights(h);
      setNotes(n);
      setBookmarks(b);
      setLastReadState(lr);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [db]);

  // Lookup maps
  const ayahHighlightMap = useMemo(() => {
    const m = new Map<string, Highlight>();
    for (const h of highlights) if (h.wordPosition == null) m.set(key(h.surah, h.ayah), h);
    return m;
  }, [highlights]);

  const wordHighlightMap = useMemo(() => {
    const m = new Map<string, Highlight>();
    for (const h of highlights)
      if (h.wordPosition != null) m.set(`${h.surah}:${h.ayah}:${h.wordPosition}`, h);
    return m;
  }, [highlights]);

  const noteMap = useMemo(() => {
    const m = new Map<string, Note>();
    for (const n of notes) m.set(key(n.surah, n.ayah), n);
    return m;
  }, [notes]);

  const bookmarkSet = useMemo(() => {
    const s = new Set<string>();
    for (const b of bookmarks) s.add(key(b.surah, b.ayah));
    return s;
  }, [bookmarks]);

  const getAyahHighlight = useCallback(
    (s: number, a: number) => ayahHighlightMap.get(key(s, a)),
    [ayahHighlightMap],
  );
  const getWordHighlight = useCallback(
    (s: number, a: number, p: number) => wordHighlightMap.get(`${s}:${a}:${p}`),
    [wordHighlightMap],
  );
  const getNote = useCallback((s: number, a: number) => noteMap.get(key(s, a)), [noteMap]);
  const isBookmarked = useCallback((s: number, a: number) => bookmarkSet.has(key(s, a)), [bookmarkSet]);

  const toggleHighlight = useCallback(
    async (s: number, a: number, wordPosition: number | null, color: HighlightColorKey) => {
      await store.toggleHighlight(db, s, a, wordPosition, color);
      await refreshHighlights();
    },
    [db, refreshHighlights],
  );
  const removeHighlight = useCallback(
    async (id: number) => {
      await store.removeHighlight(db, id);
      await refreshHighlights();
    },
    [db, refreshHighlights],
  );
  const saveNote = useCallback(
    async (s: number, a: number, text: string) => {
      await store.upsertNote(db, s, a, text);
      await refreshNotes();
    },
    [db, refreshNotes],
  );
  const deleteNote = useCallback(
    async (s: number, a: number) => {
      await store.deleteNote(db, s, a);
      await refreshNotes();
    },
    [db, refreshNotes],
  );
  const toggleBookmark = useCallback(
    async (s: number, a: number) => {
      const added = await store.toggleBookmark(db, s, a);
      await refreshBookmarks();
      return added;
    },
    [db, refreshBookmarks],
  );
  const removeBookmark = useCallback(
    async (id: number) => {
      await store.removeBookmark(db, id);
      await refreshBookmarks();
    },
    [db, refreshBookmarks],
  );
  const markLastRead = useCallback(
    async (s: number, a: number) => {
      await store.setLastRead(db, s, a);
      setLastReadState({ surah: s, ayah: a, updatedAt: Date.now() });
    },
    [db],
  );

  const value = useMemo<AnnotationsContextValue>(
    () => ({
      highlights,
      notes,
      bookmarks,
      lastRead,
      loaded,
      getAyahHighlight,
      getWordHighlight,
      getNote,
      isBookmarked,
      toggleHighlight,
      removeHighlight,
      saveNote,
      deleteNote,
      toggleBookmark,
      removeBookmark,
      markLastRead,
    }),
    [
      highlights,
      notes,
      bookmarks,
      lastRead,
      loaded,
      getAyahHighlight,
      getWordHighlight,
      getNote,
      isBookmarked,
      toggleHighlight,
      removeHighlight,
      saveNote,
      deleteNote,
      toggleBookmark,
      removeBookmark,
      markLastRead,
    ],
  );

  return <AnnotationsContext.Provider value={value}>{children}</AnnotationsContext.Provider>;
}

export function useAnnotations(): AnnotationsContextValue {
  const ctx = useContext(AnnotationsContext);
  if (!ctx) throw new Error('useAnnotations must be used within an AnnotationsProvider');
  return ctx;
}
