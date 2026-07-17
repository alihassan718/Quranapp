import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation/RootNavigator';
import { AnnotationsProvider } from './src/state/AnnotationsContext';
import { DatabaseProvider } from './src/state/DatabaseProvider';
import { SettingsProvider, useSettings } from './src/state/SettingsContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { setHapticsEnabled } from './src/utils/haptics';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Reflects the resolved theme into the OS status bar. */
function ThemedStatusBar() {
  const theme = useTheme();
  return <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />;
}

/** Keeps the haptics module flag in sync with the user's setting. */
function HapticsSync() {
  const { settings } = useSettings();
  useEffect(() => {
    setHapticsEnabled(settings.hapticsEnabled);
  }, [settings.hapticsEnabled]);
  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    AmiriQuran: require('./assets/fonts/AmiriQuran-Regular.ttf'),
    ScheherazadeNew: require('./assets/fonts/ScheherazadeNew-Regular.ttf'),
    'ScheherazadeNew-Bold': require('./assets/fonts/ScheherazadeNew-Bold.ttf'),
    Spectral: require('./assets/fonts/Spectral-Regular.ttf'),
    'Spectral-Medium': require('./assets/fonts/Spectral-Medium.ttf'),
    'Spectral-SemiBold': require('./assets/fonts/Spectral-SemiBold.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <ThemedStatusBar />
            <HapticsSync />
            <DatabaseProvider>
              <AnnotationsProvider>
                <RootNavigator />
              </AnnotationsProvider>
            </DatabaseProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
