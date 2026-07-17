import { Share } from 'react-native';

export interface VerseShareData {
  surahName: string;
  surah: number;
  ayah: number;
  arabic: string;
  translation?: string | null;
  translatorName?: string | null;
  translatorYear?: string | null;
}

export function buildShareText(d: VerseShareData): string {
  const lines: string[] = [d.arabic];
  if (d.translation) {
    lines.push('');
    lines.push(`“${d.translation}”`);
    const attr = [d.translatorName, d.translatorYear].filter(Boolean).join(', ');
    if (attr) lines.push(`— ${attr}`);
  }
  lines.push('');
  lines.push(`${d.surahName} · ${d.surah}:${d.ayah}`);
  lines.push('Shared from Bayān');
  return lines.join('\n');
}

export async function shareVerseText(d: VerseShareData): Promise<void> {
  await Share.share({ message: buildShareText(d) });
}
