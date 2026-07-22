import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Icon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { AppText } from '../components/ui/Text';
import { RESEARCH_TOPICS, ResearchTopic } from '../data/researchTopics';
import { useAppNavigation } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Research — thematic study collections. Each card gathers āyāt where a
 * subject is discussed. Cards are data-driven (src/data/researchTopics.ts);
 * the curated verse material itself will ship later as bundled data.
 */
export function ResearchScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingTop: insets.top + theme.spacing.base,
          paddingBottom: insets.bottom + theme.spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="overline" tone="tertiary">
          STUDY BY SUBJECT
        </AppText>
        <AppText variant="display" style={{ marginTop: 4 }}>
          Research
        </AppText>
        <AppText variant="callout" tone="secondary" style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
          Collections of āyāt where a subject is discussed — read them in context, word by word.
        </AppText>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
          {RESEARCH_TOPICS.map((t) => (
            <TopicCard key={t.id} topic={t} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function TopicCard({ topic }: { topic: ResearchTopic }) {
  const theme = useTheme();
  const navigation = useAppNavigation();
  return (
    <PressableScale
      haptic="selection"
      activeScale={0.97}
      onPress={() => navigation.navigate('ResearchTopic', { topicId: topic.id })}
      style={{ width: '47.5%', flexGrow: 1 }}
    >
      <Card surface="surface" style={{ gap: theme.spacing.sm, minHeight: 160 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.primarySoft,
          }}
        >
          <Icon name={topic.icon} size={22} tone="accent" />
        </View>
        <AppText variant="h3">{topic.title}</AppText>
        <AppText variant="caption" tone="secondary" style={{ flex: 1 }} numberOfLines={3}>
          {topic.blurb}
        </AppText>
        <Chip label="Curation in progress" small bg={theme.colors.goldSoft} fg={theme.colors.goldText} />
      </Card>
    </PressableScale>
  );
}
