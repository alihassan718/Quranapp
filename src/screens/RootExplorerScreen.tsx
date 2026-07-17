import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArabicText } from '../components/ArabicText';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { AppText } from '../components/ui/Text';
import { getLexiconEntriesForRoot, getLexiconSources, getRootOccurrences } from '../data/database';
import { LexiconEntry, LexiconSource, RootOccurrence } from '../domain/models';
import { useReadDb } from '../state/DatabaseProvider';
import { useAppNavigation, RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';

export function RootExplorerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const db = useReadDb();
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'RootExplorer'>>();
  const { root, rootTranslit } = route.params;

  const [occurrences, setOccurrences] = useState<RootOccurrence[]>([]);
  const [entry, setEntry] = useState<LexiconEntry | null>(null);
  const [source, setSource] = useState<LexiconSource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [occ, entries, sources] = await Promise.all([
        getRootOccurrences(db, root),
        getLexiconEntriesForRoot(db, root),
        getLexiconSources(db),
      ]);
      if (!alive) return;
      setOccurrences(occ);
      setEntry(entries[0] ?? null);
      setSource(sources.find((s) => s.id === (entries[0]?.sourceId ?? '')) ?? sources[0] ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [db, root]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Root Explorer' });
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={occurrences}
        keyExtractor={(o) => String(o.word.id)}
        contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.xxl }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.base }}>
            {/* Root hero */}
            <View style={{ alignItems: 'center', gap: 6, marginBottom: theme.spacing.lg }}>
              <ArabicText text={root} size={46} scaled={false} color={theme.colors.primary} lineHeightMultiplier={1.4} />
              {rootTranslit ? (
                <AppText variant="title" tone="secondary">
                  {rootTranslit}
                </AppText>
              ) : null}
              <Chip
                label={`${occurrences.length} occurrence${occurrences.length === 1 ? '' : 's'} in bundled data`}
                small
                bg={theme.colors.primarySoft}
                fg={theme.colors.primaryText}
              />
            </View>

            {/* Lexical range */}
            {entry ? (
              <Card surface="surface" elevation="sm" style={{ marginBottom: theme.spacing.lg, gap: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Icon name="library-outline" size={15} tone="accent" />
                  <AppText variant="overline" tone="tertiary">
                    LEXICAL RANGE
                  </AppText>
                </View>
                {entry.senses.map((s, i) =>
                  s.definitionEn ? (
                    <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                      <AppText variant="callout" tone="accent">
                        {i + 1}.
                      </AppText>
                      <AppText variant="callout" style={{ flex: 1 }}>
                        {s.definitionEn}
                      </AppText>
                    </View>
                  ) : null,
                )}
                {source ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: 4, flexWrap: 'wrap' }}>
                    <Icon name="ribbon-outline" size={13} tone="accent" />
                    <AppText variant="caption" tone="tertiary">
                      {source.attribution ?? source.name}
                    </AppText>
                    {source.isSample ? (
                      <Chip label="Sample" small bg={theme.colors.dangerSoft} fg={theme.colors.danger} />
                    ) : null}
                  </View>
                ) : null}
              </Card>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
              <Icon name="git-network-outline" size={15} tone="accent" />
              <AppText variant="overline" tone="tertiary">
                WORDS FROM THIS ROOT
              </AppText>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <AppText variant="callout" tone="tertiary" center style={{ marginTop: 40 }}>
              No occurrences in the bundled data.
            </AppText>
          )
        }
        renderItem={({ item }) => (
          <PressableScale
            activeScale={0.985}
            onPress={() => navigation.navigate('Reader', { surah: item.word.surah, ayah: item.word.ayah })}
            style={{ marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm }}
          >
            <Card surface="surface" elevation="none" padded style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.base }}>
              <ArabicText text={item.word.textUthmani} size={30} scaled={false} lineHeightMultiplier={1.4} />
              <View style={{ flex: 1 }}>
                <AppText variant="callout" tone="secondary">
                  {item.word.posLabel ?? 'Word'}
                </AppText>
                <AppText variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                  {item.surahNameEnglish} · {item.word.surah}:{item.word.ayah}
                </AppText>
              </View>
              <Icon name="chevron-forward" size={18} tone="tertiary" />
            </Card>
          </PressableScale>
        )}
      />
    </View>
  );
}
