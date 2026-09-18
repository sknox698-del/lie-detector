import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';

import { GameProvider, useGame } from './lib/store';
import { C } from './lib/theme';
import { Toast } from './components/ui';

import BootScreen from './screens/BootScreen';
import MenuScreen from './screens/MenuScreen';
import CaseSelectScreen from './screens/CaseSelectScreen';
import BriefingScreen from './screens/BriefingScreen';
import InvestigationScreen from './screens/InvestigationScreen';
import InterrogationScreen from './screens/InterrogationScreen';
import EvidenceDetailScreen from './screens/EvidenceDetailScreen';
import AccusationScreen from './screens/AccusationScreen';
import ResultsScreen from './screens/ResultsScreen';
import ProfileScreen from './screens/ProfileScreen';
import StatsScreen from './screens/StatsScreen';
import AchievementsScreen from './screens/AchievementsScreen';
import CollectionScreen from './screens/CollectionScreen';
import SettingsScreen from './screens/SettingsScreen';
import ChallengeScreen from './screens/ChallengeScreen';
import AcademyScreen from './screens/AcademyScreen';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: C.cyan,
    background: C.void,
    card: C.panelSolid,
    text: C.text,
    border: C.hairline,
    notification: C.red,
  },
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    // analytics-ready hook: forward to a reporter here
    if (__DEV__) console.warn('[LIE DETECTOR]', error?.message);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={styles.err}>
          <Ionicons name="alert-circle" size={40} color={C.red} />
          <Text style={styles.errTitle}>CASE SYSTEM FAULT</Text>
          <Text style={styles.errBody}>{String(this.state.error?.message ?? 'Unknown error')}</Text>
          <Text style={styles.errHint} onPress={() => this.setState({ error: null })}>
            TAP TO RECOVER
          </Text>
        </View>
      );
    }
    return this.props.children as any;
  }
}

function ToastHost() {
  const { toast } = useGame();
  if (!toast) return null;
  return <Toast text={toast.text} kind={toast.kind} />;
}

function Navigator() {
  return (
    <Stack.Navigator
      initialRouteName="Boot"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.void },
        animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
        animationDuration: 260,
      }}
    >
      <Stack.Screen name="Boot" component={BootScreen} />
      <Stack.Screen name="Menu" component={MenuScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Academy" component={AcademyScreen} />
      <Stack.Screen name="CaseSelect" component={CaseSelectScreen} />
      <Stack.Screen name="Briefing" component={BriefingScreen} />
      <Stack.Screen name="Investigation" component={InvestigationScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Interrogation" component={InterrogationScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="EvidenceDetail" component={EvidenceDetailScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Accusation" component={AccusationScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Results" component={ResultsScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Collection" component={CollectionScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Challenge" component={ChallengeScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: C.void }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.void }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <GameProvider>
            <NavigationContainer theme={navTheme as any}>
              <StatusBar style="light" />
              <Navigator />
              <ToastHost />
            </NavigationContainer>
          </GameProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  err: { flex: 1, backgroundColor: C.void, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errTitle: { color: C.red, fontSize: 13, fontWeight: '900', letterSpacing: 2.4, marginTop: 16 },
  errBody: { color: C.textDim, fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 },
  errHint: { color: C.cyan, fontSize: 11, letterSpacing: 2, marginTop: 24, fontWeight: '800' },
});
