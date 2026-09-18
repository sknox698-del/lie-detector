import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, DIFFICULTY_META, SHADOW } from '../lib/theme';
import { Screen, Touch, GlassCard, MONO, SectionLabel, ProgressRing, Chip } from '../components/ui';
import { useGame } from '../lib/store';
import { careerFor } from '../lib/scoring';
import { dailySeed, weeklySeed } from '../lib/rng';
import { generateCase } from '../lib/generator';
import { t } from '../lib/i18n';

const { width } = Dimensions.get('window');

const TILES = [
  { id: 'CaseSelect', label: 'CASE FILES', sub: 'Open investigations', icon: 'folder-open', color: C.cyan, big: true },
  { id: 'Daily', label: 'DAILY MYSTERY', sub: 'New case every day', icon: 'today', color: C.amber, big: true },
  { id: 'Challenge', label: 'CHALLENGE', sub: 'Send a case code', icon: 'send', color: C.violet, big: false },
  { id: 'Collection', label: 'COLLECTION', sub: 'Case archive', icon: 'albums', color: C.green, big: false },
  { id: 'Achievements', label: 'AWARDS', sub: 'Commendations', icon: 'ribbon', color: C.gold, big: false },
  { id: 'Stats', label: 'STATISTICS', sub: 'Career record', icon: 'stats-chart', color: '#7FE3B0', big: false },
  { id: 'Profile', label: 'PROFILE', sub: 'Badge & rank', icon: 'person-circle', color: '#FF7AC8', big: false },
  { id: 'Settings', label: 'SETTINGS', sub: 'Audio, graphics, access', icon: 'settings', color: C.textDim, big: false },
];

export default function MenuScreen({ navigation }: any) {
  const { profile } = useGame();
  const insets = useSafeAreaInsets();
  const career = careerFor(profile.xp);

  const daily = useMemo(() => {
    const s = dailySeed();
    const diffs = profile.unlockedDifficulties;
    const d = diffs[Math.min(diffs.length - 1, 1)] ?? 'Beginner';
    return { seed: s, difficulty: d, cf: generateCase(s, d as any) };
  }, [profile.unlockedDifficulties.length]);

  const weekly = useMemo(() => {
    const s = weeklySeed();
    const diffs = profile.unlockedDifficulties;
    const d = diffs[diffs.length - 1] ?? 'Beginner';
    return { seed: s, difficulty: d, cf: generateCase(s, d as any) };
  }, [profile.unlockedDifficulties.length]);

  const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; })();
  const dailyDone = !!profile.dailyDone[todayKey];

  const go = (id: string) => {
    if (id === 'Daily') {
      navigation.navigate('Briefing', { seed: daily.seed, difficulty: daily.difficulty, mode: 'daily', resume: true });
    } else {
      navigation.navigate(id);
    }
  };

  return (
    <Screen gradient={['#05070B', '#0A121C', '#06080D']}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 40, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Masthead */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.masthead}>
          <View style={styles.mark}>
            <Svg width={38} height={38} viewBox="0 0 100 100">
              <Circle cx={50} cy={50} r={44} stroke={C.cyan} strokeWidth={2} fill="rgba(62,232,255,0.06)" />
              <Path d="M20 62 L32 62 L38 42 L46 76 L54 30 L62 62 L80 62" stroke={C.cyan} strokeWidth={4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </Svg>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.brand}>LIE DETECTOR</Text>
            <Text style={styles.brandSub}>{t('app.tagline')}</Text>
          </View>
        </Animated.View>

        {/* Career card */}
        <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
          <Touch onPress={() => navigation.navigate('Profile')} sfx="select">
            <GlassCard accent={C.cyan} glow style={{ padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ProgressRing value={career.progress} size={58} color={C.cyan} label={`${Math.round(career.progress * 100)}%`} />
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={styles.rankLabel}>{career.cur.name.toUpperCase()}</Text>
                  <Text style={styles.handle}>{profile.handle}</Text>
                  <Text style={styles.rankNext}>
                    {career.next ? `${career.next.xp - profile.xp} XP to ${career.next.name}` : 'Highest rank attained'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={styles.streakBox}>
                    <Ionicons name="flame" size={13} color={profile.streak > 0 ? C.amber : C.textFaint} />
                    <Text style={[styles.streakText, { color: profile.streak > 0 ? C.amber : C.textFaint }]}>{profile.streak}</Text>
                  </View>
                  <Text style={styles.xpText}>{profile.xp.toLocaleString()} XP</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <Stat label="SOLVED" value={String(profile.casesSolved)} color={C.green} />
                <Stat label="FAILED" value={String(profile.casesFailed)} color={C.red} />
                <Stat label="PERFECT" value={String(profile.perfect)} color={C.gold} />
                <Stat label="AWARDS" value={String(profile.achievements.length)} color={C.violet} />
              </View>
            </GlassCard>
          </Touch>
        </Animated.View>

        {!profile.seenTutorial && (
          <Animated.View entering={FadeInDown.delay(120)}>
            <Touch onPress={() => navigation.navigate('Academy')} sfx="select">
              <View style={styles.tutorialBanner}>
                <LinearGradient colors={['rgba(255,177,60,0.18)', 'rgba(255,177,60,0.03)']} style={StyleSheet.absoluteFill} />
                <Ionicons name="school" size={20} color={C.amber} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.tutTitle}>ACADEMY — START HERE</Text>
                  <Text style={styles.tutSub}>Learn how to break an alibi in ninety seconds.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.amber} />
              </View>
            </Touch>
          </Animated.View>
        )}

        {/* Daily + Weekly */}
        <SectionLabel text="Featured" color={C.amber} />
        <Animated.View entering={FadeInDown.delay(160).springify().damping(18)}>
          <Touch onPress={() => go('Daily')} sfx="select" haptic="medium">
            <GlassCard accent={C.amber} style={{ padding: 0, overflow: 'hidden' }}>
              <LinearGradient colors={['rgba(255,177,60,0.14)', 'rgba(255,177,60,0.02)']} style={StyleSheet.absoluteFill} />
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Chip label="Daily Mystery" color={C.amber} filled icon="today" />
                  <View style={{ flex: 1 }} />
                  {dailyDone ? <Chip label="Filed" color={C.green} filled icon="checkmark" small /> : <Chip label={daily.difficulty} color={DIFFICULTY_META[daily.difficulty as keyof typeof DIFFICULTY_META].color} small />}
                </View>
                <Text style={styles.caseTitle}>{daily.cf.title}</Text>
                <Text style={styles.caseMeta}>{daily.cf.caseType.toUpperCase()} · {daily.cf.suspects.length} SUSPECTS · {daily.cf.evidence.length} EXHIBITS</Text>
                <Text style={styles.caseLine} numberOfLines={2}>{daily.cf.incident}</Text>
              </View>
            </GlassCard>
          </Touch>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify().damping(18)} style={{ marginTop: 12 }}>
          <Touch
            onPress={() =>
              navigation.navigate('Briefing', { seed: weekly.seed, difficulty: weekly.difficulty, mode: 'weekly', resume: true })
            }
            sfx="select" haptic="medium"
          >
            <GlassCard accent={C.violet} style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="trophy" size={20} color={C.violet} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.weeklyTitle}>WEEKLY MYSTERY — {weekly.difficulty.toUpperCase()}</Text>
                  <Text style={styles.weeklySub} numberOfLines={1}>{weekly.cf.title} · {weekly.cf.caseType}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.violet} />
              </View>
            </GlassCard>
          </Touch>
        </Animated.View>

        {/* Tiles */}
        <SectionLabel text="Department" color={C.textFaint} />
        <View style={styles.grid}>
          {TILES.filter((x) => x.id !== 'Daily').map((tile, i) => (
            <Animated.View
              key={tile.id}
              entering={FadeInDown.delay(240 + i * 45).springify().damping(18)}
              style={{ width: tile.big ? '100%' : (width - 36 - 12) / 2 }}
            >
              <Touch onPress={() => go(tile.id)} sfx="select">
                <View style={[styles.tile, tile.big && styles.tileBig, { borderColor: tile.color + '3A' }, SHADOW.soft]}>
                  <LinearGradient colors={[tile.color + '18', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <View style={[styles.tileIcon, { borderColor: tile.color + '55', backgroundColor: tile.color + '12' }]}>
                    <Ionicons name={tile.icon as any} size={tile.big ? 22 : 18} color={tile.color} />
                  </View>
                  <Text style={[styles.tileLabel, { color: tile.color }]}>{tile.label}</Text>
                  <Text style={styles.tileSub}>{tile.sub}</Text>
                </View>
              </Touch>
            </Animated.View>
          ))}
        </View>

        <Touch onPress={() => navigation.navigate('Academy')} sfx="tap">
          <View style={styles.academyRow}>
            <Ionicons name="school-outline" size={15} color={C.textDim} />
            <Text style={styles.academyText}>ACADEMY · HOW TO INVESTIGATE</Text>
          </View>
        </Touch>

        <Text style={styles.version}>CASE ENGINE v1.0 · OFFLINE CAPABLE · {Object.keys(profile.dailyDone).length} DAILIES FILED</Text>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  masthead: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  mark: {
    width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.cyan + '44', backgroundColor: 'rgba(62,232,255,0.06)',
  },
  brand: { color: C.text, fontSize: 19, fontWeight: '900', letterSpacing: 3.4, fontFamily: MONO },
  brandSub: { color: C.textFaint, fontSize: 9.5, marginTop: 3, letterSpacing: 0.4, lineHeight: 13 },
  rankLabel: { color: C.cyan, fontSize: 13, fontWeight: '900', letterSpacing: 1.8, fontFamily: MONO },
  handle: { color: C.text, fontSize: 12, marginTop: 3, letterSpacing: 1, fontFamily: MONO },
  rankNext: { color: C.textFaint, fontSize: 10, marginTop: 3 },
  streakBox: { flexDirection: 'row', alignItems: 'center' },
  streakText: { fontSize: 14, fontWeight: '900', marginLeft: 4, fontFamily: MONO },
  xpText: { color: C.textFaint, fontSize: 9.5, marginTop: 3, fontFamily: MONO },
  statRow: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.hairline },
  statVal: { fontSize: 17, fontWeight: '900', fontFamily: MONO },
  statLabel: { color: C.textFaint, fontSize: 8, letterSpacing: 1.4, marginTop: 3, fontFamily: MONO },
  tutorialBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 13, marginTop: 12,
    borderWidth: 1, borderColor: C.amber + '55', overflow: 'hidden',
  },
  tutTitle: { color: C.amber, fontSize: 11, fontWeight: '900', letterSpacing: 1.6, fontFamily: MONO },
  tutSub: { color: C.textDim, fontSize: 11, marginTop: 2 },
  caseTitle: { color: C.text, fontSize: 19, fontWeight: '800', letterSpacing: 0.3 },
  caseMeta: { color: C.amber, fontSize: 9, letterSpacing: 1.4, marginTop: 6, fontFamily: MONO },
  caseLine: { color: C.textDim, fontSize: 12, marginTop: 8, lineHeight: 18 },
  weeklyTitle: { color: C.violet, fontSize: 10.5, fontWeight: '900', letterSpacing: 1.6, fontFamily: MONO },
  weeklySub: { color: C.textDim, fontSize: 12, marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    borderRadius: 15, borderWidth: 1, padding: 15, backgroundColor: C.panel, overflow: 'hidden',
    minHeight: 116, justifyContent: 'flex-end',
  },
  tileBig: { minHeight: 96 },
  tileIcon: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  tileLabel: { fontSize: 11.5, fontWeight: '900', letterSpacing: 1.5, fontFamily: MONO },
  tileSub: { color: C.textFaint, fontSize: 10, marginTop: 3 },
  academyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  academyText: { color: C.textDim, fontSize: 10, letterSpacing: 1.8, marginLeft: 8, fontFamily: MONO, fontWeight: '700' },
  version: { color: C.textFaint, fontSize: 8.5, textAlign: 'center', letterSpacing: 1.2, fontFamily: MONO, marginTop: 4 },
});
