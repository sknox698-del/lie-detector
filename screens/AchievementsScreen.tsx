import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../lib/theme';
import { AppHeader, Chip, MONO, Screen, SectionLabel, ProgressRing } from '../components/ui';
import { useGame } from '../lib/store';
import { ACHIEVEMENTS, TIER_COLOR } from '../lib/achievements';

export default function AchievementsScreen({ navigation }: any) {
  const { profile } = useGame();
  const insets = useSafeAreaInsets();
  const unlocked = useMemo(() => new Set(profile.achievements), [profile.achievements]);
  const pct = profile.achievements.length / ACHIEVEMENTS.length;

  return (
    <Screen gradient={['#0B0A05', '#12100A', '#05070B']}>
      <AppHeader title="Commendations" subtitle={`${profile.achievements.length} of ${ACHIEVEMENTS.length} earned`} accent={C.gold} onBack={() => navigation.goBack()} />
      <FlatList
        data={ACHIEVEMENTS}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.head}>
            <ProgressRing value={pct} size={62} color={C.gold} label={`${Math.round(pct * 100)}%`} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.headTitle}>SERVICE RECORD</Text>
              <Text style={styles.headBody}>
                Commendations are awarded automatically for verified conduct. They cannot be purchased.
              </Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const on = unlocked.has(item.id);
          const color = TIER_COLOR[item.tier];
          return (
            <Animated.View entering={FadeInDown.delay(index * 28)}>
              <View style={[styles.row, { borderColor: on ? color + '66' : C.hairline }, !on && { opacity: 0.5 }]}>
                {on && <LinearGradient colors={[color + '16', 'transparent']} style={StyleSheet.absoluteFill} />}
                <View style={[styles.icon, { borderColor: on ? color + '77' : C.hairline, backgroundColor: on ? color + '14' : 'transparent' }]}>
                  <Ionicons name={(on ? item.icon : 'lock-closed') as any} size={19} color={on ? color : C.textFaint} />
                </View>
                <View style={{ flex: 1, marginLeft: 13 }}>
                  <Text style={[styles.name, { color: on ? color : C.textDim }]}>{item.name}</Text>
                  <Text style={styles.desc}>{item.desc}</Text>
                </View>
                <Chip label={item.tier} color={on ? color : C.textFaint} small filled={on} />
              </View>
            </Animated.View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1,
    borderColor: C.hairline, backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 18,
  },
  headTitle: { color: C.gold, fontSize: 11, fontWeight: '900', letterSpacing: 2, fontFamily: MONO },
  headBody: { color: C.textDim, fontSize: 11.5, marginTop: 6, lineHeight: 17 },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 12, borderWidth: 1,
    marginBottom: 9, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  icon: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '800' },
  desc: { color: C.textFaint, fontSize: 11, marginTop: 3, lineHeight: 16 },
});
