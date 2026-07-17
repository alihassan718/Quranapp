import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { getTranslationsForAyah, getTranslationText, getTranslators } from '../data/database';
import { Translator } from '../domain/models';
import { useReadDb } from '../state/DatabaseProvider';
import { useSettings } from '../state/SettingsContext';
import { useTheme } from '../theme/ThemeProvider';
import { haptics } from '../utils/haptics';
import { shareVerseText } from '../utils/share';
import { ArabicText } from './ArabicText';
import { Icon } from './ui/Icon';
import { PressableScale } from './ui/PressableScale';
import { AppText } from './ui/Text';

interface ShareSheetProps {
  surah: number;
  ayah: number;
  arabic: string;
  surahName: string;
  onDone: () => void;
}

export function ShareSheet({ surah, ayah, arabic, surahName, onDone }: ShareSheetProps) {
  const theme = useTheme();
  const db = useReadDb();
  const { settings } = useSettings();
  const cardRef = useRef<View>(null);

  const [translation, setTranslation] = useState<string | null>(null);
  const [translator, setTranslator] = useState<Translator | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      let text = await getTranslationText(db, settings.defaultTranslationId, surah, ayah);
      let who: Translator | null = null;
      const translators = await getTranslators(db, true);
      who = translators.find((t) => t.id === settings.defaultTranslationId) ?? null;
      if (!text) {
        const list = await getTranslationsForAyah(db, surah, ayah);
        if (list.length) {
          text = list[0].translation.text;
          who = list[0].translator;
        }
      }
      setTranslation(text);
      setTranslator(who);
    })();
  }, [db, surah, ayah, settings.defaultTranslationId]);

  const shareData = {
    surahName,
    surah,
    ayah,
    arabic,
    translation,
    translatorName: translator?.translator,
    translatorYear: translator?.year,
  };

  const onShareImage = async () => {
    if (Platform.OS === 'web' || !cardRef.current) {
      await shareVerseText(shareData);
      onDone();
      return;
    }
    try {
      setBusy(true);
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share ayah' });
      } else {
        await shareVerseText(shareData);
      }
      haptics.success();
    } catch {
      await shareVerseText(shareData);
    } finally {
      setBusy(false);
      onDone();
    }
  };

  return (
    <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xs }}>
      <AppText variant="h3" style={{ marginBottom: theme.spacing.base }}>
        Share verse
      </AppText>

      {/* The card that gets captured */}
      <View
        ref={cardRef}
        collapsable={false}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.xl,
          gap: theme.spacing.base,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="overline" tone="tertiary">
            {surahName.toUpperCase()} · {surah}:{ayah}
          </AppText>
          <ArabicText text="بيان" size={20} scaled={false} color={theme.colors.primary} />
        </View>

        <ArabicText text={arabic} size={30} scaled={false} align="center" lineHeightMultiplier={1.8} />

        {translation ? (
          <>
            <View style={{ height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing.xs }} />
            <AppText variant="bodyLg" center>
              “{translation}”
            </AppText>
            {translator ? (
              <AppText variant="caption" tone="secondary" center>
                — {translator.translator}
                {translator.year ? `, ${translator.year}` : ''}
              </AppText>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
        <PressableScale
          haptic="medium"
          disabled={busy}
          onPress={onShareImage}
          style={{
            flex: 1,
            flexDirection: 'row',
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="image-outline" size={18} tone="onPrimary" />
          <AppText variant="title" tone="onPrimary">
            {Platform.OS === 'web' ? 'Share' : 'Share image'}
          </AppText>
        </PressableScale>
        <PressableScale
          haptic="medium"
          onPress={async () => {
            await shareVerseText(shareData);
            onDone();
          }}
          style={{
            flex: 1,
            flexDirection: 'row',
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="text-outline" size={18} tone="secondary" />
          <AppText variant="title" tone="secondary">
            Share text
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
}
