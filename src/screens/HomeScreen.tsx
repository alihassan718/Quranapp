import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArabicText } from '../components/ArabicText';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { AppText } from '../components/ui/Text';
import { getAllSurahs, getSurahsWithData } from '../data/database';
import { Surah } from '../domain/models';
import { useReadDb } from '../state/DatabaseProvider';
import { useAnnotations } from '../state/AnnotationsContext';
import { useAppNavigation } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { toArabicDigits } from '../utils/arabic';

const ROW_HEIGHT = 78;

export function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const db = useReadDb();
  const navigation = useAppNavigation();
  const { lastRead } = useAnnotations();

  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [withData, setWithData] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      setSurahs(await getAllSurahs(db));
      setWithData(await getSurahsWithData(db));
    })();
  }, [db]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        String(s.number) === q ||
        String(s.number).startsWith(q) ||
        s.nameEnglish.toLowerCase().includes(q) ||
        s.nameTransliteration.toLowerCase().includes(q) ||
        s.nameArabic.includes(query.trim()),
    );
  }, [surahs, query]);

  const continueSurah = lastRead ? surahs.find((s) => s.number === lastRead.surah) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={filtered}
        keyExtractor={(s) => String(s.number)}
        contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.xxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: insets.top + theme.spacing.base }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <AppText variant="overline" tone="tertiary">
                  READ · UNDERSTAND · COMPARE
                </AppText>
                <AppText variant="display" style={{ marginTop: 2 }}>
                  Bayān
                </AppText>
              </View>
              <ArabicText text="بيان" size={40} scaled={false} color={theme.colors.primary} />
            </View>

            {continueSurah && lastRead ? (
              <Animated.View entering={FadeInDown.springify().damping(18)}>
                <PressableScale
                  onPress={() => navigation.navigate('Reader', { surah: lastRead.surah, ayah: lastRead.ayah })}
                  style={{ marginTop: theme.spacing.lg }}
                >
                  <Card
                    surface="surface"
                    elevation="md"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.base,
                      borderColor: theme.colors.primarySoft,
                    }}
                  >
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        backgroundColor: theme.colors.primarySoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="book" size={22} tone="accent" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="overline" tone="accent">
                        CONTINUE READING
                      </AppText>
                      <AppText variant="h3" numberOfLines={1}>
                        {continueSurah.nameTransliteration}
                      </AppText>
                      <AppText variant="caption" tone="secondary">
                        Verse {lastRead.surah}:{lastRead.ayah}
                      </AppText>
                    </View>
                    <Icon name="arrow-forward" size={20} tone="accent" />
                  </Card>
                </PressableScale>
              </Animated.View>
            ) : null}

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
                marginTop: theme.spacing.lg,
                marginBottom: theme.spacing.sm,
              }}
            >
              <Icon name="search" size={18} tone="tertiary" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search surah by name or number"
                placeholderTextColor={theme.colors.textTertiary}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  fontFamily: theme.fonts.serif,
                  fontSize: 16,
                  color: theme.colors.textPrimary,
                }}
              />
              {query ? (
                <PressableScale haptic="selection" onPress={() => setQuery('')} activeScale={0.9}>
                  <Icon name="close-circle" size={18} tone="tertiary" />
                </PressableScale>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <SurahRow
            surah={item}
            hasData={withData.has(item.number)}
            onPress={() => navigation.navigate('Reader', { surah: item.number })}
          />
        )}
      />
    </View>
  );
}

const SurahRow = React.memo(function SurahRow({
  surah,
  hasData,
  onPress,
}: {
  surah: Surah;
  hasData: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      activeScale={0.985}
      style={{
        height: ROW_HEIGHT,
        marginHorizontal: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.base,
      }}
    >
      <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            transform: [{ rotate: '45deg' }],
            backgroundColor: hasData ? theme.colors.primarySoft : theme.colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
        <AppText
          variant="label"
          tone={hasData ? theme.colors.primaryText : theme.colors.textTertiary}
          style={{ position: 'absolute' }}
        >
          {surah.number}
        </AppText>
      </View>

      <View style={{ flex: 1 }}>
        <AppText variant="title" numberOfLines={1}>
          {surah.nameTransliteration}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: 2 }}>
          <AppText variant="caption" tone="secondary">
            {surah.nameEnglish}
          </AppText>
          <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.textTertiary }} />
          <AppText variant="caption" tone="tertiary">
            {surah.ayahCount} verses
          </AppText>
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <ArabicText text={surah.nameArabic} size={22} scaled={false} lineHeightMultiplier={1.4} />
        <Chip
          label={surah.revelationPlace}
          small
          bg={surah.revelationPlace === 'Meccan' ? theme.colors.goldSoft : theme.colors.primarySoft}
          fg={surah.revelationPlace === 'Meccan' ? theme.colors.goldText : theme.colors.primaryText}
        />
      </View>
    </PressableScale>
  );
});
