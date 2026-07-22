import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useLayoutEffect } from 'react';
import { View } from 'react-native';

import { EmptyState } from '../components/ui/EmptyState';
import { getResearchTopic } from '../data/researchTopics';
import { useAppNavigation, RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * One research subject. Until its curated verse data ships (as bundled data
 * files — never authored in code), this renders the curation-pending state.
 */
export function ResearchTopicScreen() {
  const theme = useTheme();
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ResearchTopic'>>();
  const topic = getResearchTopic(route.params.topicId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: topic?.title ?? 'Research' });
  }, [navigation, topic]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
      <EmptyState
        icon={topic?.icon ?? 'telescope-outline'}
        title={`${topic?.title ?? 'This subject'} — coming soon`}
        subtitle={`Āyāt where ${topic?.title.toLowerCase() ?? 'this subject'} is discussed are being curated. They'll appear here as a study collection, each verse linking into the Reader.`}
      />
    </View>
  );
}
