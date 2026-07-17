import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { AppText } from '../components/ui/Text';
import { getAllSurahs } from '../data/database';
import { Surah } from '../domain/models';
import { useAnnotations } from '../state/AnnotationsContext';
import { useReadDb } from '../state/DatabaseProvider';
import { useAppNavigation } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { haptics } from '../utils/haptics';

type Tab = 'bookmarks' | 'notes' | 'highlights';

export function NotesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const db = useReadDb();
  const navigation = useAppNavigation();
  const { bookmarks, notes, highlights, removeBookmark, deleteNote, removeHighlight } = useAnnotations();

  const [tab, setTab] = useState<Tab>('bookmarks');
  const [surahs, setSurahs] = useState<Surah[]>([]);

  useEffect(() => {
    (async () => setSurahs(await getAllSurahs(db)))();
  }, [db]);

  const nameOf = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of surahs) m.set(s.number, s.nameTransliteration);
    return (n: number) => m.get(n) ?? `Surah ${n}`;
  }, [surahs]);

  const go = (surah: number, ayah: number) => navigation.navigate('Reader', { surah, ayah });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: insets.top + theme.spacing.base }}>
        <AppText variant="display">Library</AppText>
        <SegmentedControl
          style={{ marginTop: theme.spacing.md }}
          options={[
            { label: `Bookmarks ${bookmarks.length ? `(${bookmarks.length})` : ''}`.trim(), value: 'bookmarks' },
            { label: `Notes ${notes.length ? `(${notes.length})` : ''}`.trim(), value: 'notes' },
            { label: `Marks ${highlights.length ? `(${highlights.length})` : ''}`.trim(), value: 'highlights' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'bookmarks' ? (
          bookmarks.length === 0 ? (
            <EmptyState icon="bookmark-outline" title="No bookmarks yet" subtitle="Tap the bookmark icon under any verse to save it here." />
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              {bookmarks.map((b) => (
                <RowCard
                  key={b.id}
                  onPress={() => go(b.surah, b.ayah)}
                  onDelete={() => {
                    haptics.light();
                    removeBookmark(b.id);
                  }}
                  leading={<Icon name="bookmark" size={18} tone="accent" />}
                  title={`${nameOf(b.surah)} · ${b.surah}:${b.ayah}`}
                />
              ))}
            </View>
          )
        ) : null}

        {tab === 'notes' ? (
          notes.length === 0 ? (
            <EmptyState icon="create-outline" title="No notes yet" subtitle="Attach a reflection to any verse and it will appear here." />
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              {notes.map((n) => (
                <RowCard
                  key={n.id}
                  onPress={() => go(n.surah, n.ayah)}
                  onDelete={() => {
                    haptics.light();
                    deleteNote(n.surah, n.ayah);
                  }}
                  leading={<Icon name="create" size={18} tone="accent" />}
                  title={`${nameOf(n.surah)} · ${n.surah}:${n.ayah}`}
                  body={n.text}
                />
              ))}
            </View>
          )
        ) : null}

        {tab === 'highlights' ? (
          highlights.length === 0 ? (
            <EmptyState icon="color-palette-outline" title="No highlights yet" subtitle="Highlight a verse or a single word in a colour to collect it here." />
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              {highlights.map((h) => {
                const sw = theme.colors.highlights[h.color];
                return (
                  <RowCard
                    key={h.id}
                    onPress={() => go(h.surah, h.ayah)}
                    onDelete={() => {
                      haptics.light();
                      removeHighlight(h.id);
                    }}
                    leading={<View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: sw.dot }} />}
                    title={`${nameOf(h.surah)} · ${h.surah}:${h.ayah}`}
                    body={h.wordPosition != null ? `Word ${h.wordPosition}` : 'Whole verse'}
                  />
                );
              })}
            </View>
          )
        ) : null}
      </ScrollView>
    </View>
  );
}

function RowCard({
  leading,
  title,
  body,
  onPress,
  onDelete,
}: {
  leading: React.ReactNode;
  title: string;
  body?: string;
  onPress: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale activeScale={0.99} onPress={onPress}>
      <Card surface="surface" elevation="none" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.base }}>
        <View style={{ width: 24, alignItems: 'center' }}>{leading}</View>
        <View style={{ flex: 1 }}>
          <AppText variant="title">{title}</AppText>
          {body ? (
            <AppText variant="callout" tone="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
              {body}
            </AppText>
          ) : null}
        </View>
        <PressableScale haptic="selection" activeScale={0.85} onPress={onDelete} style={{ padding: 6 }}>
          <Icon name="trash-outline" size={18} tone="tertiary" />
        </PressableScale>
      </Card>
    </PressableScale>
  );
}
