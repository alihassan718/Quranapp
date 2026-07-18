import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArabicText } from '../components/ArabicText';
import { AyahView } from '../components/reader/AyahView';
import { HighlightSwatches } from '../components/HighlightSwatches';
import { NoteEditor } from '../components/NoteEditor';
import { ShareSheet } from '../components/ShareSheet';
import { WordPanel } from '../components/WordPanel';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Chip } from '../components/ui/Chip';
import { Divider } from '../components/ui/Divider';
import { EmptyState } from '../components/ui/EmptyState';
import { AppText } from '../components/ui/Text';
import { getAyahsWithWords, getSurah, getTranslationsForSurah } from '../data/database';
import { AyahWithWords, Surah, Word } from '../domain/models';
import { useAnnotations } from '../state/AnnotationsContext';
import { useReadDb } from '../state/DatabaseProvider';
import { useSettings } from '../state/SettingsContext';
import { useAppNavigation, RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { HighlightColorKey } from '../theme/tokens';

export function ReaderScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const db = useReadDb();
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Reader'>>();
  const { surah: surahNum, ayah: targetAyah } = route.params;
  const { getAyahHighlight, getWordHighlight, toggleHighlight, markLastRead } = useAnnotations();
  const { settings } = useSettings();

  const [surah, setSurah] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<AyahWithWords[]>([]);
  const [loading, setLoading] = useState(true);
  const [inlineTr, setInlineTr] = useState<{ translatorName: string | null; verses: Map<number, string> } | null>(
    null,
  );

  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [highlightAyah, setHighlightAyah] = useState<number | null>(null);
  const [noteAyah, setNoteAyah] = useState<number | null>(null);
  const [shareAyah, setShareAyah] = useState<AyahWithWords | null>(null);

  const listRef = useRef<FlatList<AyahWithWords>>(null);
  const markRef = useRef(markLastRead);
  markRef.current = markLastRead;
  const lastWritten = useRef<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [meta, data] = await Promise.all([getSurah(db, surahNum), getAyahsWithWords(db, surahNum)]);
      if (!alive) return;
      setSurah(meta);
      setAyahs(data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [db, surahNum]);

  // Inline translation for the whole surah (one query; re-runs when the user
  // changes the default translator or toggles the setting).
  useEffect(() => {
    let alive = true;
    if (!settings.showInlineTranslation) {
      setInlineTr(null);
      return;
    }
    (async () => {
      const res = await getTranslationsForSurah(db, settings.defaultTranslationId, surahNum);
      if (alive) setInlineTr(res);
    })();
    return () => {
      alive = false;
    };
  }, [db, surahNum, settings.showInlineTranslation, settings.defaultTranslationId]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: surah?.nameTransliteration ?? `Surah ${surahNum}` });
  }, [navigation, surah, surahNum]);

  // Scroll to a requested ayah once data is present. Rows have variable,
  // unmeasured heights, so a distant scrollToIndex can no-op (web) or fail
  // (native): approach by estimated offset first — which makes the list
  // render/measure that range — then land exactly on the index.
  useEffect(() => {
    if (loading || !targetAyah || !ayahs.length) return;
    const index = ayahs.findIndex((a) => a.ayah === targetAyah);
    if (index <= 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: index * 300, animated: false });
        timers.push(
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.1 });
          }, 400),
        );
      }, 350),
    );
    return () => timers.forEach(clearTimeout);
  }, [loading, targetAyah, ayahs]);

  const viewPairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 35 },
      onViewableItemsChanged: ({ viewableItems }: { viewableItems: { item: AyahWithWords; isViewable: boolean }[] }) => {
        const vi = viewableItems.find((v) => v.isViewable);
        if (vi && vi.item.ayah !== lastWritten.current) {
          lastWritten.current = vi.item.ayah;
          markRef.current(vi.item.surah, vi.item.ayah);
        }
      },
    },
  ]);

  const onWordPress = useCallback((w: Word) => setSelectedWord(w), []);

  const showBismillah = surah != null && surah.number !== 1 && surah.number !== 9;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : ayahs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="document-text-outline"
            title="Not bundled yet"
            subtitle={`The text and morphology for ${surah?.nameTransliteration ?? 'this surah'} isn't included in this sample build. Supply its data file to read it here.`}
          />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={ayahs}
          extraData={inlineTr}
          keyExtractor={(a) => String(a.ayah)}
          viewabilityConfigCallbackPairs={viewPairs.current}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.huge }}
          initialNumToRender={8}
          windowSize={11}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            // Rows have variable heights, so a far-away index isn't measured
            // yet: jump near it by estimated offset first, then land exactly.
            listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: false });
            setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.1 }), 300);
          }}
          ListHeaderComponent={
            surah ? (
              <View style={{ alignItems: 'center', paddingTop: theme.spacing.base, paddingHorizontal: theme.spacing.lg }}>
                <ArabicText text={surah.nameArabic} size={34} scaled={false} color={theme.colors.primary} />
                <AppText variant="h3" style={{ marginTop: 4 }}>
                  {surah.nameEnglish}
                </AppText>
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                  <Chip label={surah.revelationPlace} small bg={theme.colors.surfaceAlt} />
                  <Chip label={`${surah.ayahCount} verses`} small bg={theme.colors.surfaceAlt} />
                </View>
                {showBismillah ? (
                  <ArabicText
                    text="بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
                    size={26}
                    align="center"
                    style={{ marginTop: theme.spacing.lg }}
                  />
                ) : null}
                <Divider style={{ marginTop: theme.spacing.lg, alignSelf: 'stretch' }} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <>
              <AyahView
                ayah={item}
                translation={inlineTr?.verses.get(item.ayah) ?? null}
                translatorName={inlineTr?.translatorName ?? null}
                onWordPress={onWordPress}
                onHighlight={() => setHighlightAyah(item.ayah)}
                onNote={() => setNoteAyah(item.ayah)}
                onCompare={() => navigation.navigate('Comparison', { surah: item.surah, ayah: item.ayah })}
                onShare={() => setShareAyah(item)}
              />
              <Divider inset={theme.spacing.lg} />
            </>
          )}
        />
      )}

      {/* Word panel */}
      <BottomSheet visible={!!selectedWord} onClose={() => setSelectedWord(null)} maxHeightRatio={0.86}>
        {selectedWord ? (
          <WordPanel
            word={selectedWord}
            onOpenRoot={(root, rootTranslit) => {
              setSelectedWord(null);
              navigation.navigate('RootExplorer', { root, rootTranslit });
            }}
          />
        ) : null}
      </BottomSheet>

      {/* Ayah highlight picker */}
      <BottomSheet visible={highlightAyah != null} onClose={() => setHighlightAyah(null)} maxHeightRatio={0.5}>
        {highlightAyah != null ? (
          <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xs }}>
            <AppText variant="h3" style={{ marginBottom: theme.spacing.base }}>
              Highlight {surahNum}:{highlightAyah}
            </AppText>
            <HighlightSwatches
              selected={getAyahHighlight(surahNum, highlightAyah)?.color}
              onSelect={(color: HighlightColorKey) => {
                toggleHighlight(surahNum, highlightAyah, null, color);
                setHighlightAyah(null);
              }}
              onRemove={() => {
                const cur = getAyahHighlight(surahNum, highlightAyah)?.color;
                if (cur) toggleHighlight(surahNum, highlightAyah, null, cur);
                setHighlightAyah(null);
              }}
            />
          </View>
        ) : null}
      </BottomSheet>

      {/* Note editor */}
      <BottomSheet visible={noteAyah != null} onClose={() => setNoteAyah(null)} maxHeightRatio={0.7}>
        {noteAyah != null ? (
          <NoteEditor surah={surahNum} ayah={noteAyah} onDone={() => setNoteAyah(null)} />
        ) : null}
      </BottomSheet>

      {/* Share */}
      <BottomSheet visible={!!shareAyah} onClose={() => setShareAyah(null)} maxHeightRatio={0.8}>
        {shareAyah ? (
          <ShareSheet
            surah={shareAyah.surah}
            ayah={shareAyah.ayah}
            arabic={shareAyah.textUthmani}
            surahName={surah?.nameTransliteration ?? `Surah ${surahNum}`}
            onDone={() => setShareAyah(null)}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
}
