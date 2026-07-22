import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Remembered reading positions for Research entries (scroll offset per entry).
 * Small, device-local, survives updates; separate from the content data.
 */
const KEY = 'bayan.research.readpos.v1';

let cache: Record<string, number> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function load(): Promise<Record<string, number>> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

export async function getReadingPosition(entryId: string): Promise<number> {
  const map = await load();
  return map[entryId] ?? 0;
}

export function setReadingPosition(entryId: string, offset: number): void {
  if (!cache) {
    void load().then(() => setReadingPosition(entryId, offset));
    return;
  }
  cache[entryId] = Math.max(0, Math.round(offset));
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(cache)).catch(() => {});
  }, 400);
}
