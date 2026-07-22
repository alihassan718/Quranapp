import React, { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArabicText } from '../components/ArabicText';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { AppText } from '../components/ui/Text';
import {
  RootSearchHit,
  TranslationSearchHit,
  getSurahsWithData,
  searchRoots,
  searchTranslations,
} from '../data/database';
import { useReadDb } from '../state/DatabaseProvider';
import { useAppNavigation } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { isArabic, parseVerseRef } from '../utils/arabic';

export function SearchScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const db = useReadDb();
  const navigation = useAppNavigation();

  const [query, setQuery] = useState('');
  const [verseRef, setVerseRef] = useState<{ surah: number; ayah: number } | null>(null);
  const [roots, setRoots] = useState<RootSearchHit[]>([]);
  const [hits, setHits] = useState<TranslationSearchHit[]>([]);
  const [bundledCount, setBundledCount] = useState(114);

  useEffect(() => {
    (async () => setBundledCount((await getSurahsWithData(db)).size))();
  }, [db]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setVerseRef(null);
      setRoots([]);
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setVerseRef(parseVerseRef(q));
      if (isArabic(q)) {
        setRoots(await searchRoots(db, q));
        setHits([]);
      } else if (q.length >= 2) {
        const [r, h] = await Promise.all([searchRoots(db, q), searchTranslations(db, q)]);
        setRoots(r);
        setHits(h);
      } else {
        setRoots([]);
        setHits([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [db, query]);

  const nothing = query.trim().length > 0 && !verseRef && roots.length === 0 && hits.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: insets.top + theme.spacing.base }}>
        <AppText variant="display">Search</AppText>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: theme.spacing.base,
            marginTop: theme.spacing.md,
          }}
        >
          <Icon name="search" size={18} tone="tertiary" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="English word, Arabic root, or 2:255"
            placeholderTextColor={theme.colors.textTertiary}
            autoCorrect={false}
            style={{
              flex: 1,
              paddingVertical: 12,
              fontFamily: theme.fonts.serif,
              fontSize: 16,
              color: theme.colors.textPrimary,
            }}
          />
          {query ? (
            <PressableScale haptic="selection" activeScale={0.9} onPress={() => setQuery('')}>
              <Icon name="close-circle" size={18} tone="tertiary" />
            </PressableScale>
          ) : null}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {!query.trim() ? (
          <EmptyState
            icon="search-outline"
            title="Three ways to search"
            subtitle="Type an English word to find it in translations, Arabic letters to find a root, or a reference like 2:255 to jump to a verse."
          />
        ) : null}

        {verseRef ? (
          <>
            <SectionLabel text="VERSE REFERENCE" />
            <PressableScale
              activeScale={0.98}
              onPress={() => navigation.navigate('Reader', { surah: verseRef.surah, ayah: verseRef.ayah })}
              style={{ marginBottom: theme.spacing.lg }}
            >
              <Card surface="surface" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.base }}>
                <Icon name="arrow-redo-outline" size={20} tone="accent" />
                <AppText variant="h3" style={{ flex: 1 }}>
                  Go to {verseRef.surah}:{verseRef.ayah}
                </AppText>
                <Icon name="chevron-forward" size={18} tone="tertiary" />
              </Card>
            </PressableScale>
          </>
        ) : null}

        {roots.length > 0 ? (
          <>
            <SectionLabel text="ROOTS" />
            <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
              {roots.map((r) => (
                <PressableScale
                  key={r.root}
                  activeScale={0.98}
                  onPress={() => navigation.navigate('RootExplorer', { root: r.root, rootTranslit: r.rootTranslit })}
                >
                  <Card surface="surface" elevation="none" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.base }}>
                    <ArabicText text={r.root} size={26} scaled={false} color={theme.colors.primary} />
                    <View style={{ flex: 1 }}>
                      {r.rootTranslit ? (
                        <AppText variant="callout" tone="secondary">
                          {r.rootTranslit}
                        </AppText>
                      ) : null}
                    </View>
                    <Chip label={`${r.count}`} small bg={theme.colors.primarySoft} fg={theme.colors.primaryText} />
                    <Icon name="chevron-forward" size={16} tone="tertiary" />
                  </Card>
                </PressableScale>
              ))}
            </View>
          </>
        ) : null}

        {hits.length > 0 ? (
          <>
            <SectionLabel text={`IN TRANSLATIONS (${hits.length})`} />
            <View style={{ gap: theme.spacing.sm }}>
              {hits.map((h, i) => (
                <PressableScale
                  key={`${h.translatorId}-${h.surah}-${h.ayah}-${i}`}
                  activeScale={0.98}
                  onPress={() => navigation.navigate('Comparison', { surah: h.surah, ayah: h.ayah })}
                >
                  <Card surface="surface" elevation="none" style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <AppText variant="label" tone="accent">
                        {h.surah}:{h.ayah}
                      </AppText>
                      <AppText variant="caption" tone="tertiary">
                        {h.translatorName}
                      </AppText>
                    </View>
                    <AppText variant="callout" numberOfLines={2}>
                      {h.text}
                    </AppText>
                  </Card>
                </PressableScale>
              ))}
            </View>
          </>
        ) : null}

        {nothing ? (
          <EmptyState
            icon="cloud-outline"
            title={query.trim().length < 2 && !isArabic(query) ? 'Keep typing…' : 'No matches'}
            subtitle={
              query.trim().length < 2 && !isArabic(query)
                ? 'English search needs at least two letters. You can also type an Arabic root, or a verse reference like 2:255.'
                : `Nothing found for “${query.trim()}”. Try a different spelling, an Arabic root, or a verse reference like 2:255.` +
                  (bundledCount < 114 ? ` Note: only ${bundledCount} of 114 surahs are bundled in this build.` : '')
            }
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <AppText variant="overline" tone="tertiary" style={{ marginBottom: theme.spacing.sm }}>
      {text}
    </AppText>
  );
}
