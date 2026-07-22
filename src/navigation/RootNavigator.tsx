import { Ionicons } from '@expo/vector-icons';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  Theme as NavTheme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ComparisonScreen } from '../screens/ComparisonScreen';
import { CreditsScreen } from '../screens/CreditsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { ReaderScreen } from '../screens/ReaderScreen';
import { ResearchScreen } from '../screens/ResearchScreen';
import { ResearchTopicScreen } from '../screens/ResearchTopicScreen';
import { RootExplorerScreen } from '../screens/RootExplorerScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../theme/ThemeProvider';
import { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

type TabName = keyof TabParamList;
const TAB_ICONS: Record<TabName, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  Home: { on: 'book', off: 'book-outline' },
  Search: { on: 'search', off: 'search-outline' },
  Research: { on: 'telescope', off: 'telescope-outline' },
  Notes: { on: 'bookmarks', off: 'bookmarks-outline' },
  Settings: { on: 'settings', off: 'settings-outline' },
};

function Tabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundElevated,
          borderTopColor: theme.colors.border,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: theme.fonts.sansMedium, fontSize: 11 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = TAB_ICONS[route.name as TabName];
          return <Ionicons name={focused ? icons.on : icons.off} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Research" component={ResearchScreen} />
      <Tab.Screen name="Notes" component={NotesScreen} options={{ title: 'Library' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const theme = useTheme();
  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme: NavTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: theme.colors.background,
      card: theme.colors.backgroundElevated,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      primary: theme.colors.primary,
      notification: theme.colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.backgroundElevated },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { fontFamily: theme.fonts.serifSemibold, color: theme.colors.textPrimary },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Reader" component={ReaderScreen} options={{ title: 'Reader' }} />
        <Stack.Screen name="RootExplorer" component={RootExplorerScreen} options={{ title: 'Root Explorer' }} />
        <Stack.Screen name="Comparison" component={ComparisonScreen} options={{ title: 'Comparison' }} />
        <Stack.Screen name="ResearchTopic" component={ResearchTopicScreen} options={{ title: 'Research' }} />
        <Stack.Screen name="Credits" component={CreditsScreen} options={{ title: 'Credits' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
