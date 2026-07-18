import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { getLexiconEntriesForRoot, getLexiconSources, getRootCount } from '../data/database';
import { LexiconEntry, LexiconSource, Word } from '../domain/models';
import { useReadDb } from '../state/DatabaseProvider';
import { DefinitionLang, useSettings } from '../state/SettingsContext';
import { useTheme } from '../theme/ThemeProvider';
import { ArabicText } from './ArabicText';
import { Chip } from './ui/Chip';
import { Divider } from './ui/Divider';
import { Icon } from './ui/Icon';
import { PressableScale } from './ui/PressableScale';
import { SegmentedControl } from './ui/SegmentedControl';
import { AppText } from './ui/Text';

interface WordPanelProps {
  word: Word;
  onOpenRoot: (root: string, rootTranslit: string | null) => void;
}

/** Chars of a long definition shown before the "Show full definition" toggle. */
const PREVIEW_CHARS = 240;

/**
 * DISPLAY-ONLY cleanup of verbatim Lane's text. The Perseus digitization uses a
 * standalone THAL (ذ, U+0630) as a sense/entry divider; we strip those markers
 * for readability WITHOUT ever mutating the stored data. Only whitespace-
 * delimited markers are removed, so a real ذ inside an Arabic quotation (always
 * letter-attached) is preserved.
 */
function cleanLexiconText(s: string): string {
  return s
    .replace(/(^|\s)ذ(?=\s|$)/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,;.])/g, '$1')
    .trim();
}

/** First whole-word slice of a long definition, for the collapsed preview. */
function previewOf(s: string): string {
  if (s.length <= PREVIEW_CHARS) return s;
  const cut = s.slice(0, PREVIEW_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

/** Content of the word bottom sheet. Lexicon (author-less) is the primary view. */
export function WordPanel({ word, onOpenRoot }: WordPanelProps) {
  const theme = useTheme();
  const db = useReadDb();
  const { settings } = useSettings();

  const [sources, setSources] = useState<LexiconSource[]>([]);
  const [entries, setEntries] = useState<LexiconEntry[]>([]);
  const [sourceId, setSourceId] = useState(settings.lexiconSourceId);
  const [lang, setLang] = useState<DefinitionLang>(settings.definitionLang);
  const [rootCount, setRootCount] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // Collapse long definitions again whenever the word changes.
  useEffect(() => setExpanded(false), [word.position, word.surah, word.ayah]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const srcs = await getLexiconSources(db);
      if (alive) setSources(srcs);
      if (word.root) {
        const [e, c] = await Promise.all([
          getLexiconEntriesForRoot(db, word.root),
          getRootCount(db, word.root),
        ]);
        if (alive) {
          setEntries(e);
          setRootCount(c);
        }
      } else {
        if (alive) {
          setEntries([]);
          setRootCount(0);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [db, word.root]);

  const activeSource = useMemo(
    () => sources.find((s) => s.id === sourceId) ?? sources[0],
    [sources, sourceId],
  );
  const activeEntry = useMemo(
    () => entries.find((e) => e.sourceId === (activeSource?.id ?? sourceId)),
    [entries, activeSource, sourceId],
  );

  // Real lexicon sources may have only English definitions (Lane's). Only offer
  // the Arabic/English toggle when the active entry actually carries Arabic.
  const hasArabic = useMemo(
    () => entries.some((e) => e.senses.some((s) => s.definitionAr)),
    [entries],
  );
  const effLang: DefinitionLang = hasArabic ? lang : 'en';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm }}
    >
      {/* Hero word */}
      <View style={{ alignItems: 'center', paddingVertical: theme.spacing.sm }}>
        <ArabicText text={word.textUthmani} size={52} scaled={false} align="center" />
        {settings.showTransliteration && word.transliteration ? (
          <AppText variant="callout" tone="secondary" style={{ marginTop: 2 }}>
            {word.transliteration}
          </AppText>
        ) : null}
      </View>

      {/* Root */}
      {word.root ? (
        <PressableScale onPress={() => onOpenRoot(word.root!, word.rootTranslit)} style={{ marginTop: theme.spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.primarySoft,
              borderRadius: theme.radii.md,
              padding: theme.spacing.base,
              gap: theme.spacing.base,
            }}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="overline" tone="accent">
                ROOT
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: 2 }}>
                <ArabicText text={word.root} size={30} scaled={false} color={theme.colors.primaryText} />
                {word.rootTranslit ? (
                  <AppText variant="callout" tone={theme.colors.primaryText}>
                    {word.rootTranslit}
                  </AppText>
                ) : null}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <AppText variant="caption" tone={theme.colors.primaryText}>
                {rootCount > 0 ? `Explore ${rootCount}` : 'Explore'}
              </AppText>
              <Icon name="git-network-outline" size={20} tone="accent" />
            </View>
          </View>
        </PressableScale>
      ) : (
        <View
          style={{
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: theme.radii.md,
            padding: theme.spacing.base,
            marginTop: theme.spacing.sm,
          }}
        >
          <AppText variant="callout" tone="secondary">
            No triliteral root — this is a particle or pronoun.
          </AppText>
        </View>
      )}

      {/* Morphology */}
      <SectionLabel icon="construct-outline" text="MORPHOLOGY" />
      <View style={{ gap: theme.spacing.sm }}>
        {word.lemma ? <FeatureRow label="Lemma" valueArabic={word.lemma} /> : null}
        {word.posLabel ? <FeatureRow label="Part of speech" value={word.posLabel} /> : null}
        {word.pattern ? <FeatureRow label="Pattern" value={word.pattern} /> : null}
        {word.features.map((f, i) => (
          <FeatureRow key={i} label={f.label} value={f.value} />
        ))}
      </View>

      {/* Lexicon — primary, author-less */}
      <SectionLabel icon="library-outline" text="LEXICAL RANGE" />
      <AppText variant="caption" tone="tertiary" style={{ marginBottom: theme.spacing.sm }}>
        Documented classical meanings for this root — shown author-lessly, before any translator's choice.
      </AppText>

      {sources.length > 1 || hasArabic ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.base }}>
          {sources.length > 1 ? (
            <SegmentedControl
              style={{ flex: 1 }}
              options={sources.map((s) => ({ label: s.name.split(' ')[0], value: s.id }))}
              value={activeSource?.id ?? sourceId}
              onChange={setSourceId}
            />
          ) : null}
          {hasArabic ? (
            <SegmentedControl
              style={{ width: 168 }}
              options={[
                { label: 'English', value: 'en' },
                { label: 'العربية', value: 'ar' },
              ]}
              value={lang}
              onChange={(v) => setLang(v as DefinitionLang)}
            />
          ) : null}
        </View>
      ) : null}

      {word.root && activeEntry ? (
        // Plain View (not Animated entering): RN-web drops/hides subtrees on a
        // FadeIn entering animation, and this must always be visible.
        <View key={`${activeSource?.id}-${effLang}`} style={{ gap: theme.spacing.sm }}>
          {activeEntry.senses.map((sense, i) => {
            const raw = effLang === 'ar' ? sense.definitionAr : sense.definitionEn;
            if (!raw) return null;
            const isAr = effLang === 'ar';
            const text = isAr ? raw : cleanLexiconText(raw);
            const single = activeEntry.senses.length === 1;
            const long = text.length > PREVIEW_CHARS;
            const shown = long && !expanded ? previewOf(text) : text;
            return (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  gap: theme.spacing.sm,
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radii.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: theme.spacing.base,
                }}
              >
                {single ? null : (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: theme.colors.goldSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText variant="caption" tone={theme.colors.goldText}>
                      {i + 1}
                    </AppText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {isAr ? (
                    <ArabicText text={shown} size={22} scaled={false} />
                  ) : (
                    <AppText variant="body">{shown}</AppText>
                  )}
                  {long ? (
                    <PressableScale
                      haptic="selection"
                      activeScale={0.98}
                      onPress={() => setExpanded((v) => !v)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: theme.spacing.sm }}
                    >
                      <AppText variant="caption" tone="accent">
                        {expanded ? 'Show less' : 'Show full definition'}
                      </AppText>
                      <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} tone="accent" />
                    </PressableScale>
                  ) : null}
                  {sense.notes ? (
                    <AppText variant="caption" tone="tertiary" style={{ marginTop: 4 }}>
                      {sense.notes}
                    </AppText>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : word.root ? (
        <AppText variant="callout" tone="tertiary">
          No lexicon entry bundled for this root yet.
        </AppText>
      ) : null}

      {/* Source attribution */}
      {activeSource ? (
        <View style={{ marginTop: theme.spacing.base }}>
          <Divider />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.md, flexWrap: 'wrap' }}>
            <Icon name="ribbon-outline" size={14} tone="accent" />
            <AppText variant="caption" tone="secondary">
              {activeSource.attribution ?? activeSource.name}
            </AppText>
            {activeSource.isSample ? (
              <Chip label="Sample data" small bg={theme.colors.dangerSoft} fg={theme.colors.danger} />
            ) : null}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function SectionLabel({ icon, text }: { icon: React.ComponentProps<typeof Icon>['name']; text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}>
      <Icon name={icon} size={15} tone="accent" />
      <AppText variant="overline" tone="tertiary">
        {text}
      </AppText>
    </View>
  );
}

function FeatureRow({ label, value, valueArabic }: { label: string; value?: string; valueArabic?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.base }}>
      <AppText variant="callout" tone="secondary" style={{ flexShrink: 0 }}>
        {label}
      </AppText>
      {valueArabic ? (
        <ArabicText text={valueArabic} size={22} scaled={false} />
      ) : (
        <AppText variant="callout" style={{ flex: 1, textAlign: 'right' }}>
          {value}
        </AppText>
      )}
    </View>
  );
}
