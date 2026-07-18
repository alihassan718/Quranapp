import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArabicText } from '../components/ArabicText';
import { AttributionBadge } from '../components/AttributionBadge';
import { Card } from '../components/ui/Card';
import { Divider } from '../components/ui/Divider';
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { AppText } from '../components/ui/Text';
import { TranslationText } from '../components/ui/TranslationText';
import {
  getAyahWithWords,
  getLexiconEntriesForRoot,
  getTranslationsForAyah,
  getTranslators,
} from '../data/database';
import { AyahWithWords, Translation, Translator } from '../domain/models';
import { useReadDb } from '../state/DatabaseProvider';
import { useSettings } from '../state/SettingsContext';
import { useAppNavigation, RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';

interface RootGloss {
  root: string;
  rootTranslit: string | null;
  gloss: string | null;
  word: string;
}

type LayoutMode = 'stacked' | 'switcher';

export function ComparisonScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const db = useReadDb();
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Comparison'>>();
  const { surah, ayah } = route.params;
  const { settings } = useSettings();

  const [ayahData, setAyahData] = useState<AyahWithWords | null>(null);
  const [roots, setRoots] = useState<RootGloss[]>([]);
  const [renderings, setRenderings] = useState<{ translator: Translator; translation: Translation }[]>([]);
  const [hidden, setHidden] = useState<Translator[]>([]);
  const [layout, setLayout] = useState<LayoutMode>(settings.comparisonLayout);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [a, list, allTranslators] = await Promise.all([
        getAyahWithWords(db, surah, ayah),
        getTranslationsForAyah(db, surah, ayah),
        getTranslators(db, false),
      ]);
      if (!alive) return;
      setAyahData(a);
      setRenderings(list);
      setHidden(allTranslators.filter((t) => !t.enabled));

      // Lexical range (author-less): unique roots in verse → first classical sense.
      if (a) {
        const seen = new Set<string>();
        const glosses: RootGloss[] = [];
        for (const w of a.words) {
          if (!w.root || seen.has(w.root)) continue;
          seen.add(w.root);
          const entries = await getLexiconEntriesForRoot(db, w.root);
          const firstSense = entries[0]?.senses.find((s) => s.definitionEn)?.definitionEn ?? null;
          glosses.push({ root: w.root, rootTranslit: w.rootTranslit, gloss: firstSense, word: w.textUthmani });
        }
        if (alive) setRoots(glosses);
      }
    })();
    return () => {
      alive = false;
    };
  }, [db, surah, ayah]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: `Compare ${surah}:${ayah}` });
  }, [navigation, surah, ayah]);

  const active = renderings[Math.min(activeIdx, Math.max(0, renderings.length - 1))];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* The verse */}
      {ayahData ? (
        <Card surface="surface" elevation="sm" style={{ marginBottom: theme.spacing.lg }}>
          <ArabicText text={ayahData.textUthmani} size={30} align="center" />
        </Card>
      ) : null}

      {/* Lexical range FIRST (primary, author-less) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
        <Icon name="library-outline" size={16} tone="accent" />
        <AppText variant="h3">Lexical range</AppText>
      </View>
      <AppText variant="caption" tone="tertiary" style={{ marginBottom: theme.spacing.md }}>
        The documented root meanings — shown first, author-lessly, before any translator's choice.
      </AppText>

      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
        {roots.map((r) => (
          <PressableScale
            key={r.root}
            activeScale={0.99}
            onPress={() => navigation.navigate('RootExplorer', { root: r.root, rootTranslit: r.rootTranslit })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.base,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: theme.spacing.md,
            }}
          >
            <View style={{ alignItems: 'center', minWidth: 60 }}>
              <ArabicText text={r.root} size={22} scaled={false} color={theme.colors.primary} />
              {r.rootTranslit ? (
                <AppText variant="caption" tone="tertiary">
                  {r.rootTranslit}
                </AppText>
              ) : null}
            </View>
            <AppText variant="callout" style={{ flex: 1 }} numberOfLines={2}>
              {r.gloss ?? '—'}
            </AppText>
            <Icon name="chevron-forward" size={16} tone="tertiary" />
          </PressableScale>
        ))}
        {roots.length === 0 ? (
          <AppText variant="callout" tone="tertiary">
            No roots with bundled lexicon entries in this verse.
          </AppText>
        ) : null}
      </View>

      <Divider style={{ marginBottom: theme.spacing.lg }} />

      {/* Reference translations SECOND */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name="people-outline" size={16} tone="accent" />
          <AppText variant="h3">Renderings</AppText>
        </View>
        {renderings.length > 1 ? (
          <SegmentedControl
            style={{ width: 150 }}
            options={[
              { label: 'Stacked', value: 'stacked' },
              { label: 'Switch', value: 'switcher' },
            ]}
            value={layout}
            onChange={(v) => setLayout(v as LayoutMode)}
          />
        ) : null}
      </View>
      <AppText variant="caption" tone="tertiary" style={{ marginBottom: theme.spacing.md }}>
        How different translators rendered the same verse. Each is a clearly-attributed reference — the app takes no side.
      </AppText>

      {layout === 'stacked' || renderings.length <= 1 ? (
        <View style={{ gap: theme.spacing.md }}>
          {renderings.map((r) => (
            <TranslationCard key={r.translator.id} translator={r.translator} text={r.translation.text} />
          ))}
        </View>
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          <SegmentedControl
            options={renderings.map((r, i) => ({ label: lastName(r.translator.translator), value: String(i) }))}
            value={String(Math.min(activeIdx, renderings.length - 1))}
            onChange={(v) => setActiveIdx(Number(v))}
          />
          {active ? (
            <Animated.View key={active.translator.id} entering={FadeIn.duration(260)}>
              <TranslationCard translator={active.translator} text={active.translation.text} />
            </Animated.View>
          ) : null}
        </View>
      )}

      {renderings.length === 0 ? (
        <AppText variant="callout" tone="tertiary">
          No reference translations are bundled for this verse yet.
        </AppText>
      ) : null}

      {/* Transparency: intentionally-hidden translators */}
      {hidden.length > 0 ? (
        <View
          style={{
            marginTop: theme.spacing.lg,
            padding: theme.spacing.md,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surfaceAlt,
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon name="information-circle-outline" size={15} tone="secondary" />
            <AppText variant="label" tone="secondary">
              Not shown
            </AppText>
          </View>
          {hidden.map((t) => (
            <AppText key={t.id} variant="caption" tone="tertiary">
              {t.translator}
              {t.year ? ` (${t.year})` : ''} — {t.licenseStatus === 'contested' ? 'rights contested; not bundled' : 'disabled'}
            </AppText>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function TranslationCard({ translator, text }: { translator: Translator; text: string }) {
  const theme = useTheme();
  return (
    <Card surface="surface" elevation="sm" style={{ gap: theme.spacing.sm }}>
      <AttributionBadge
        name={translator.translator}
        year={translator.year}
        licenseStatus={translator.licenseStatus}
        detail={translator.name}
      />
      <Divider />
      <TranslationText variant="bodyLg" style={{ marginTop: 2 }}>
        {text}
      </TranslationText>
    </Card>
  );
}

function lastName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1];
}
