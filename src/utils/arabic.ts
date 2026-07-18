const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Convert a number to Arabic-Indic numerals (e.g. 255 → ٢٥٥). */
export function toArabicDigits(n: number): string {
  return String(n)
    .split('')
    .map((c) => (c >= '0' && c <= '9' ? ARABIC_DIGITS[Number(c)] : c))
    .join('');
}

/**
 * The ornate end-of-ayah marker: U+06DD (ARABIC END OF AYAH) followed by the
 * ayah number in Arabic-Indic digits. Amiri Quran renders this as a medallion.
 */
export function ayahMarker(n: number): string {
  return `۝${toArabicDigits(n)}`;
}

/** Display a root's letters spaced out, e.g. "رحم" → "ر ح م". */
export function formatRoot(root: string): string {
  const cleaned = root.trim();
  if (cleaned.includes(' ')) return cleaned;
  return cleaned.split('').join(' ');
}

/** Parse a verse reference like "2:255" or "2 255" → { surah, ayah } or null. */
export function parseVerseRef(input: string): { surah: number; ayah: number } | null {
  const m = input.trim().match(/^(\d{1,3})\s*[:.\-\s]\s*(\d{1,3})$/);
  if (!m) return null;
  const surah = Number(m[1]);
  const ayah = Number(m[2]);
  if (surah < 1 || surah > 114 || ayah < 1) return null;
  return { surah, ayah };
}

/** Is a query string primarily Arabic characters? */
export function isArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

/**
 * True if the token contains at least one Arabic LETTER. Standalone Qur'anic
 * annotation signs (pause marks ۖ ۗ ۛ …, sajdah ۩, rub-el-hizb ۞) tokenize as
 * their own "words" in Tanzil text downloaded with those options — they are
 * paratextual ornaments, not words, so the Reader must not make them tappable.
 */
export function hasArabicLetters(token: string): boolean {
  return /[ء-يٱ-ۓۺ-ۿ]/u.test(token);
}
