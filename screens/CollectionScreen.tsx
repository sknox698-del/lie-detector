import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, DIFFICULTY_META, RANK_META } from '../lib/theme';
import { AppHeader, Chip, GlassCard, MONO, Screen, SectionLabel, EmptyState, Touch } from '../components/ui';
import { useGame } from '../lib/store';
import { ARCHETYPES } from '../lib/data/world';
import { formatTime } from '../lib/scoring';

const { width } = Dimensions.get('window');

const TYPE_ICON: Record<string, string> = {
  Homicide: 'skull', 'Grand Theft': 'diamond', Arson: 'flame', 'Missing Person': 'help-buoy',
  'Corporate Fraud': 'briefcase', Blackmail: 'lock-closed', Sabotage: 'construct',
  'Stolen Artwork': 'color-palette', Cybercrime: 'terminal', Kidnapping: 'car',
  'Insurance Fraud': 'umbrella', 'Corporate Conspiracy': 'people-circle',
};

export default function CollectionScreen({ navigation }: any) {
  const { profile } = useGame();
  const insets = useSafeAreaInsets();
  const owned = useMemo(() => new Set(profile.collection), [profile.collection]);
  const types = ARCHETYPES.map((a) => a.type);

  return (
    <Screen gradient={['#05100A', '#07140F', '#05070B']}>
      <AppHeader title="Collection" subtitle={`${owned.size} of ${types.length} case types logged`} accent={C.green} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <SectionLabel text="Case types" color={C.green} />
        <View style={styles.grid}>
          {types.map((tp, i) => {
            const on = owned.has(tp);
            return (
              <Animated.View key={tp} entering={FadeInDown.delay(i * 30)} style={{ width: (width - 32 - 10) / 2 }}>
                <View style={[styles.tile, { borderColor: on ? C.green + '55' : C.hairline }, !on && { opacity: 0.45 }]}>
                  {on && <LinearGradient colors={['rgba(59,224,141,0.12)', 'transparent']} style={StyleSheet.absoluteFill} />}
                  <Ionicons name={(on ? TYPE_ICON[tp] ?? 'folder' : 'lock-closed') as any} size={20} color={on ? C.green : C.textFaint} />
                  <Text style={[styles.tileName, { color: on ? C.text : C.textFaint }]}>{tp.toUpperCase()}</Text>
                  <Text style={styles.tileState}>{on ? 'LOGGED' : 'NOT YET ENCOUNTERED'}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        <SectionLabel text="Closed case archive" color={C.cyan} />
        {profile.history.length === 0 ? (
          <EmptyState icon="archive" title="ARCHIVE EMPTY" body="Closed cases are filed here with their rank and record." />
        ) : (
          profile.history.map((h) => {
            const rank = RANK_META[h.rank];
            return (
              <GlassCard key={h.at} accent={rank.color} style={styles.archiveRow}>
                <View style={[styles.rankBox, { borderColor: rank.color + '66' }]}>
                  <Text style={[styles.rankText, { color: rank.color }]}>{h.rank}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 13 }}>
                  <Text style={styles.archTitle} numberOfLines={1}>{h.title}</Text>
                  <Text style={styles.archMeta}>{h.code} · {h.difficulty} · {h.score} pts</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                    <Chip label={h.outcome} color={h.correctSuspect ? C.green : C.red} small filled />
                    <Chip label={`${h.evidenceFound}/${h.evidenceTotal}`} color={C.textDim} small />
                    <Chip label={formatTime(h.timeMs)} color={C.textDim} small />
                  </View>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  tile: {
    borderRadius: 13, borderWidth: 1, padding: 14, minHeight: 106, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'space-between',
  },
  tileName: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1, marginTop: 12, fontFamily: MONO },
  tileState: { color: C.textFaint, fontSize: 8, letterSpacing: 1, marginTop: 4, fontFamily: MONO },
  archiveRow: { flexDirection: 'row', alignItems: 'center', padding: 13, marginBottom: 9 },
  rankBox: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 17, fontWeight: '900', fontFamily: MONO },
  archTitle: { color: C.text, fontSize: 13, fontWeight: '700' },
  archMeta: { color: C.textFaint, fontSize: 10.5, marginTop: 3, fontFamily: MONO },
});
