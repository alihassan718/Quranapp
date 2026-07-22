import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
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
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
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
  /**
   * When the Reader is opened AT a specific ayah (Root Explorer, search,
   * comparison back-links), the list WINDOW starts at that ayah so it renders
   * instantly — no scroll-to-index churn through hundreds of unmeasured rows.
   * "Show earlier verses" prepends the rest; maintainVisibleContentPosition
   * keeps the current verse pinned while it does.
   */
  const [startIndex, setStartIndex] = useState(0);
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
      const idx = targetAyah ? data.findIndex((a) => a.ayah === targetAyah) : -1;
      setStartIndex(idx > 0 ? idx : 0);
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

  /** The rows actually mounted: the full surah, or the window from startIndex. */
  const visibleAyahs = useMemo(
    () => (startIndex > 0 ? ayahs.slice(startIndex) : ayahs),
    [ayahs, startIndex],
  );

  /* ---- "Floating on water" buoyancy (Clear Water theme only) ----
   * Scroll velocity feeds a normalized drift value; each ayah card chases it
   * with its own spring (staggered amplitude), so verses lag and settle like
   * things floating on water. Runs on the UI thread; zero re-renders. */
  const drift = useSharedValue(0);
  const floatEnabled = theme.motionProfile === 'float';
  const scrollSample = useRef({ y: 0, t: 0 });
  const onListScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!floatEnabled) return;
      const y = e.nativeEvent.contentOffset.y;
      const t = Date.now();
      const last = scrollSample.current;
      const dt = Math.max(8, t - last.t);
      const v = (y - last.y) / dt; // px per ms
      scrollSample.current = { y, t };
      drift.value = Math.max(-1, Math.min(1, v / 1.5));
    },
    [floatEnabled, drift],
  );
  const settleDrift = useCallback(() => {
    drift.value = 0;
  }, [drift]);

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
          data={visibleAyahs}
          extraData={inlineTr}
          keyExtractor={(a) => String(a.ayah)}
          viewabilityConfigCallbackPairs={viewPairs.current}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.huge }}
          initialNumToRender={8}
          windowSize={11}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onScroll={onListScroll}
          onScrollEndDrag={settleDrift}
          onMomentumScrollEnd={settleDrift}
          scrollEventThrottle={16}
          ListHeaderComponent={
            startIndex > 0 ? (
              <PressableScale
                haptic="selection"
                activeScale={0.98}
                onPress={() => setStartIndex(0)}
                style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.base }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.spacing.sm,
                    paddingVertical: theme.spacing.md,
                    borderRadius: theme.radii.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Icon name="chevron-up" size={16} tone="accent" />
                  <AppText variant="label" tone="secondary">
                    Show earlier verses (1–{ayahs[startIndex - 1]?.ayah ?? startIndex})
                  </AppText>
                </View>
              </PressableScale>
            ) : surah ? (
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
          renderItem={({ item, index }) => (
            <>
              <AyahView
                ayah={item}
                translation={inlineTr?.verses.get(item.ayah) ?? null}
                translatorName={inlineTr?.translatorName ?? null}
                drift={drift}
                floatEnabled={floatEnabled}
                floatIndex={index}
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
