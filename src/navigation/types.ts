import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Tabs: undefined;
  Reader: { surah: number; ayah?: number };
  RootExplorer: { root: string; rootTranslit?: string | null };
  Comparison: { surah: number; ayah: number };
  ResearchEntry: { entryId: string };
  ResearchBoard: undefined;
  Credits: undefined;
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Research: undefined;
  Notes: undefined;
  Settings: undefined;
};

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Typed navigation to the root stack (works from tab screens too). */
export function useAppNavigation(): AppNavigation {
  return useNavigation<AppNavigation>();
}
