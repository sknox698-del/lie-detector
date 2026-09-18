import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, DIFFICULTY_META } from '../lib/theme';
import { AppHeader, Chip, GlassCard, MONO, Screen, Touch, PrimaryButton, EmptyState } from '../components/ui';
import { useGame } from '../lib/store';
import { generateCase, DIFFICULTY_ORDER, DIFF_CONFIG } from '../lib/generator';
import { hashString } from '../lib/rng';
import { Difficulty } from '../lib/types';
import { careerFor, CAREER_RANKS } from '../lib/scoring';

export default function CaseSelectScreen({ navigation, route }: any) {
  const { profile, progressFor } = useGame();
  const insets = useSafeAreaInsets();
  const unlocked = profile.unlockedDifficulties;
  const [difficulty, setDifficulty] = useState<Difficulty>(route?.params?.difficulty ?? unlocked[unlocked.length - 1] ?? 'Beginner');
  const [rotation, setRotation] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const cases = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const seed = hashString(`DOCKET::${profile.badgeSeed}::${difficulty}::${i}::${rotation}`);
      return generateCase(seed, difficulty);
    });
  }, [difficulty, rotation, profile.badgeSeed]);

  const cfg = DIFF_CONFIG[difficulty];
  const career = careerFor(profile.xp);

  const open = (seed: number) => {
    navigation.navigate('Briefing', { seed, difficulty, resume: true });
  };

  return (
    <Screen>
      <AppHeader
        title="Case Files"
        subtitle={`${cases.length} open investigations · ${difficulty}`}
        onBack={() => navigation.goBack()}
        right={<Chip label={career.cur.name} color={C.cyan} filled small />}
      />

      <View style={styles.diffBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={DIFFICULTY_ORDER}
          keyExtractor={(d) => d}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => {
            const locked = !unlocked.includes(item);
            const meta = DIFFICULTY_META[item];
            const active = difficulty === item;
            return (
              <Touch
                onPress={() => !locked && setDifficulty(item)}
                sfx={locked ? 'back' : 'select'}
                disabled={locked}
              >
                <View style={[
                  styles.diffPill,
                  { borderColor: active ? meta.color : C.hairline, backgroundColor: active ? meta.color + '1E' : 'transparent' },
                  locked && { opacity: 0.35 },
                ]}>
                  {locked && <Ionicons name="lock-closed" size={10} color={C.textFaint} style={{ marginRight: 5 }} />}
                  <Text style={[styles.diffText, { color: active ? meta.color : C.textDim }]}>{item.toUpperCase()}</Text>
                </View>
              </Touch>
            );
          }}
        />
      </View>

      {!unlocked.includes(difficulty) ? (
        <EmptyState icon="lock-closed" title="CLEARANCE REQUIRED" body={`Reach ${CAREER_RANKS.find((r) => r.unlock === difficulty)?.name ?? 'a higher rank'} to open cases at this level.`} />
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(c) => String(c.seed)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={C.cyan}
              onRefresh={() => {
                setRefreshing(true);
                setTimeout(() => { setRotation((r) => r + 1); setRefreshing(false); }, 500);
              }}
            />
          }
          ListHeaderComponent={
            <View style={styles.brief}>
              <Text style={styles.briefTitle}>{difficulty.toUpperCase()} DOCKET</Text>
              <Text style={styles.briefBody}>
                {cfg.suspects} suspects · {cfg.slots} timeline windows · {cfg.secretKeepers} secret-keeper(s) · {cfg.redHerrings} red herrings
                {cfg.tampered ? ' · manipulated exhibits' : ''}{cfg.coordinatedLie ? ' · coordinated alibis' : ''}
                {cfg.footageGap ? ' · deleted footage' : ''}{cfg.alias ? ' · false identities' : ''}
              </Text>
              <Text style={styles.briefHint}>Pull down to rotate the docket.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const meta = DIFFICULTY_META[item.difficulty];
            const p = progressFor(item.seed);
            const inProgress = p && !p.completed && p.discovered.length > 1;
            const done = p?.completed;
            const hist = profile.history.find((h) => h.seed === item.seed);
            return (
              <Animated.View entering={FadeInDown.delay(index * 55).springify().damping(18)} style={{ marginBottom: 12 }}>
                <Touch onPress={() => open(item.seed)} sfx="select" haptic="medium">
                  <GlassCard accent={meta.color} style={{ padding: 0 }}>
                    <LinearGradient colors={[meta.color + '10', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <View style={{ padding: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 9 }}>
                        <Text style={[styles.caseNo, { color: meta.color }]}>CASE {item.code}</Text>
                        <View style={{ flex: 1 }} />
                        {done && hist ? <Chip label={`RANK ${hist.rank}`} color={C.gold} filled small /> :
                          inProgress ? <Chip label="In Progress" color={C.amber} filled small icon="hourglass" /> : null}
                      </View>
                      <Text style={styles.caseTitle}>{item.title}</Text>
                      <Text style={styles.caseType}>{item.caseType.toUpperCase()} · {item.locationName}</Text>
                      <Text style={styles.caseIncident} numberOfLines={2}>{item.incident}</Text>
                      <View style={styles.caseFoot}>
                        <Meta icon="people" text={`${item.suspects.length}`} />
                        <Meta icon="file-tray-full" text={`${item.evidence.length}`} />
                        <Meta icon="time" text={`${item.slots.length}`} />
                        <View style={{ flex: 1 }} />
                        <Text style={[styles.diffTag, { color: meta.color }]}>{item.difficulty.toUpperCase()}</Text>
                        <Ionicons name="chevron-forward" size={16} color={meta.color} style={{ marginLeft: 6 }} />
                      </View>
                    </View>
                  </GlassCard>
                </Touch>
              </Animated.View>
            );
          }}
          ListFooterComponent={
            <PrimaryButton
              label="GENERATE FRESH DOCKET"
              icon="refresh"
              color={C.cyan}
              onPress={() => setRotation((r) => r + 1)}
              style={{ marginTop: 6 }}
              sublabel="Eight new procedurally generated investigations"
            />
          }
        />
      )}
    </Screen>
  );
}

function Meta({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14 }}>
      <Ionicons name={icon} size={12} color={C.textFaint} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  diffBar: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.hairline },
  diffPill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1 },
  diffText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1.4, fontFamily: MONO },
  brief: { marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: C.hairline },
  briefTitle: { color: C.text, fontSize: 10.5, fontWeight: '900', letterSpacing: 2, fontFamily: MONO },
  briefBody: { color: C.textDim, fontSize: 11, marginTop: 7, lineHeight: 17 },
  briefHint: { color: C.textFaint, fontSize: 9.5, marginTop: 8, fontStyle: 'italic' },
  caseNo: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1.6, fontFamily: MONO },
  caseTitle: { color: C.text, fontSize: 17.5, fontWeight: '800', letterSpacing: 0.2 },
  caseType: { color: C.textFaint, fontSize: 9.5, letterSpacing: 1.2, marginTop: 5, fontFamily: MONO },
  caseIncident: { color: C.textDim, fontSize: 12, marginTop: 9, lineHeight: 18 },
  caseFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.hairline },
  metaText: { color: C.textFaint, fontSize: 11, marginLeft: 4, fontFamily: MONO },
  diffTag: { fontSize: 9, fontWeight: '900', letterSpacing: 1.4, fontFamily: MONO },
});
