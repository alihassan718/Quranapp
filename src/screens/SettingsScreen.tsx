import React, { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArabicText } from '../components/ArabicText';
import { Card } from '../components/ui/Card';
import { Divider } from '../components/ui/Divider';
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { AppText } from '../components/ui/Text';
import { TranslationText } from '../components/ui/TranslationText';
import { getTranslators } from '../data/database';
import { Translator } from '../domain/models';
import {
  ARABIC_SCALE_RANGE,
  ArabicFont,
  DefinitionLang,
  ThemeMode,
  TRANSLATION_SCALE_RANGE,
  useSettings,
} from '../state/SettingsContext';
import { useReadDb } from '../state/DatabaseProvider';
import { useAppNavigation } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { haptics } from '../utils/haptics';

export function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const db = useReadDb();
  const navigation = useAppNavigation();
  const { settings, update } = useSettings();
  const [translators, setTranslators] = useState<Translator[]>([]);

  useEffect(() => {
    (async () => setTranslators(await getTranslators(db, true)))();
  }, [db]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: insets.top + theme.spacing.base, paddingBottom: insets.bottom + theme.spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="display" style={{ marginBottom: theme.spacing.lg }}>
          Settings
        </AppText>

        {/* Appearance */}
        <SectionHeader icon="contrast-outline" text="APPEARANCE" />
        <Card surface="surface" style={{ gap: theme.spacing.base }}>
          <Field label="Theme">
            <SegmentedControl<ThemeMode>
              options={[
                { label: 'System', value: 'system' },
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
              value={settings.themeMode}
              onChange={(v) => update({ themeMode: v })}
            />
          </Field>
          <Divider />
          <Field label="Arabic typeface">
            <SegmentedControl<ArabicFont>
              options={[
                { label: 'Amiri Quran', value: 'amiri' },
                { label: 'Scheherazade', value: 'scheherazade' },
              ]}
              value={settings.arabicFont}
              onChange={(v) => update({ arabicFont: v })}
            />
          </Field>
        </Card>

        {/* Reading */}
        <SectionHeader icon="text-outline" text="READING" />
        <Card surface="surface" style={{ gap: theme.spacing.base }}>
          <Stepper
            label="Arabic size"
            value={settings.arabicFontScale}
            min={ARABIC_SCALE_RANGE.min}
            max={ARABIC_SCALE_RANGE.max}
            step={ARABIC_SCALE_RANGE.step}
            onChange={(v) => update({ arabicFontScale: v })}
          />
          <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xs }}>
            <ArabicText text="بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" size={28} align="center" />
          </View>
          <Divider />
          <Stepper
            label="Translation size"
            value={settings.translationFontScale}
            min={TRANSLATION_SCALE_RANGE.min}
            max={TRANSLATION_SCALE_RANGE.max}
            step={TRANSLATION_SCALE_RANGE.step}
            onChange={(v) => update({ translationFontScale: v })}
          />
          <TranslationText variant="body" color={theme.colors.textSecondary}>
            In the name of Allah, Most Gracious, Most Merciful.
          </TranslationText>
          <Divider />
          <ToggleRow
            label="Show translation under verses"
            value={settings.showInlineTranslation}
            onChange={(v) => update({ showInlineTranslation: v })}
          />
          <Divider />
          <ToggleRow
            label="Show transliteration"
            value={settings.showTransliteration}
            onChange={(v) => update({ showTransliteration: v })}
          />
        </Card>

        {/* Comparison & lexicon */}
        <SectionHeader icon="layers-outline" text="COMPARISON & LEXICON" />
        <Card surface="surface" style={{ gap: theme.spacing.base }}>
          <Field label="Default translation">
            <View style={{ gap: theme.spacing.xs }}>
              {translators.map((t) => {
                const selected = settings.defaultTranslationId === t.id;
                return (
                  <PressableScale
                    key={t.id}
                    haptic="selection"
                    activeScale={0.99}
                    onPress={() => update({ defaultTranslationId: t.id })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 6 }}
                  >
                    <Icon
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      tone={selected ? 'accent' : 'tertiary'}
                    />
                    <AppText variant="callout" style={{ flex: 1 }}>
                      {t.translator}
                      {t.year ? ` · ${t.year}` : ''}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>
          </Field>
          <Divider />
          <Field label="Lexicon language shown first">
            <SegmentedControl<DefinitionLang>
              options={[
                { label: 'English', value: 'en' },
                { label: 'العربية', value: 'ar' },
              ]}
              value={settings.definitionLang}
              onChange={(v) => update({ definitionLang: v })}
            />
          </Field>
          <Divider />
          <Field label="Comparison layout">
            <SegmentedControl
              options={[
                { label: 'Stacked', value: 'stacked' },
                { label: 'Switcher', value: 'switcher' },
              ]}
              value={settings.comparisonLayout}
              onChange={(v) => update({ comparisonLayout: v as 'stacked' | 'switcher' })}
            />
          </Field>
        </Card>

        {/* General */}
        <SectionHeader icon="options-outline" text="GENERAL" />
        <Card surface="surface" style={{ gap: theme.spacing.base }}>
          <ToggleRow
            label="Haptic feedback"
            value={settings.hapticsEnabled}
            onChange={(v) => update({ hapticsEnabled: v })}
          />
          <Divider />
          <PressableScale
            haptic="selection"
            activeScale={0.99}
            onPress={() => navigation.navigate('Credits')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
          >
            <Icon name="ribbon-outline" size={18} tone="accent" />
            <AppText variant="title" style={{ flex: 1 }}>
              Credits & attribution
            </AppText>
            <Icon name="chevron-forward" size={18} tone="tertiary" />
          </PressableScale>
        </Card>

        <View style={{ alignItems: 'center', marginTop: theme.spacing.xl, gap: 4 }}>
          <ArabicText text="بيان" size={26} scaled={false} color={theme.colors.primary} />
          <AppText variant="caption" tone="tertiary">
            Bayān · v1.0.1 · fully offline, on-device
          </AppText>
        </View>
      </ScrollView>
    </View>
  );

  function SectionHeader({ icon, text }: { icon: React.ComponentProps<typeof Icon>['name']; text: string }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}>
        <Icon name={icon} size={14} tone="accent" />
        <AppText variant="overline" tone="tertiary">
          {text}
        </AppText>
      </View>
    );
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="label" tone="secondary">
          {label}
        </AppText>
        {children}
      </View>
    );
  }

  function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title">{label}</AppText>
        <Switch
          value={value}
          onValueChange={(v) => {
            haptics.selection();
            onChange(v);
          }}
          trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
          thumbColor={theme.colors.surface}
        />
      </View>
    );
  }

  function Stepper({
    label,
    value,
    min,
    max,
    step,
    onChange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
  }) {
    const pct = Math.round(value * 100);
    const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title">{label}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <StepBtn icon="remove" disabled={value <= min} onPress={() => onChange(clamp(value - step))} />
          <AppText variant="label" tone="secondary" style={{ minWidth: 44, textAlign: 'center' }}>
            {pct}%
          </AppText>
          <StepBtn icon="add" disabled={value >= max} onPress={() => onChange(clamp(value + step))} />
        </View>
      </View>
    );
  }

  function StepBtn({ icon, onPress, disabled }: { icon: React.ComponentProps<typeof Icon>['name']; onPress: () => void; disabled?: boolean }) {
    return (
      <PressableScale
        haptic="selection"
        activeScale={0.85}
        disabled={disabled}
        onPress={onPress}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceAlt,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Icon name={icon} size={18} tone="primary" />
      </PressableScale>
    );
  }
}
