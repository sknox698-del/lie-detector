import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, DIFFICULTY_META, RANK_META } from '../lib/theme';
import { AppHeader, Chip, GlassCard, MONO, PrimaryButton, Screen, SectionLabel, Touch, ProgressRing } from '../components/ui';
import { useGame } from '../lib/store';
import { careerFor } from '../lib/scoring';
import { RNG } from '../lib/rng';

export default function ProfileScreen({ navigation }: any) {
  const { profile, setHandle } = useGame();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.handle);
  const career = careerFor(profile.xp);

  const rng = new RNG(profile.badgeSeed);
  const badgeHue = rng.pick([C.cyan, C.amber, C.violet, C.green, C.gold]);
  const badgeNo = 1000 + (profile.badgeSeed % 8999);

  return (
    <Screen gradient={['#0A0510', '#100A18', '#05070B']}>
      <AppHeader title="Investigator Profile" subtitle={career.cur.name} accent="#FF7AC8" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn}>
          <GlassCard accent={badgeHue} glow style={{ padding: 20, alignItems: 'center' }}>
            <LinearGradient colors={[badgeHue + '1A', 'transparent']} style={StyleSheet.absoluteFill} />
            <Svg width={98} height={112} viewBox="0 0 100 114">
              <Polygon points="50,2 96,22 96,66 50,112 4,66 4,22" fill="rgba(0,0,0,0.4)" stroke={badgeHue} strokeWidth={2} />
              <Circle cx={50} cy={46} r={22} stroke={badgeHue} strokeWidth={1.2} fill="none" opacity={0.6} />
              <Path d="M28 52 L38 52 L43 36 L50 66 L57 26 L63 52 L74 52" stroke={badgeHue} strokeWidth={2.6} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </Svg>
            {editing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.input}
                  value={draft}
                  onChangeText={setDraft}
                  autoCapitalize="characters"
                  maxLength={16}
                  placeholder="CALL SIGN"
                  placeholderTextColor={C.textFaint}
                />
                <Touch onPress={() => { setHandle(draft || profile.handle); setEditing(false); }} sfx="select">
                  <Ionicons name="checkmark-circle" size={26} color={C.green} />
                </Touch>
              </View>
            ) : (
              <Touch onPress={() => { setDraft(profile.handle); setEditing(true); }} sfx="tap">
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
                  <Text style={styles.handle}>{profile.handle}</Text>
                  <Ionicons name="pencil" size={13} color={C.textFaint} style={{ marginLeft: 8 }} />
                </View>
              </Touch>
            )}
            <Text style={styles.badgeNo}>BADGE No. {badgeNo}</Text>
            <Chip label={career.cur.name} color={badgeHue} filled style={{ marginTop: 12 }} />
          </GlassCard>
        </Animated.View>

        <SectionLabel text="Standing" color={C.cyan} />
        <GlassCard style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <ProgressRing value={career.progress} size={58} color={C.cyan} label={`${Math.round(career.progress * 100)}%`} />
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.xp}>{profile.xp.toLocaleString()} XP</Text>
            <Text style={styles.careerBlurb}>{career.cur.blurb}</Text>
            {career.next && <Text style={styles.next}>Next: {career.next.name} at {career.next.xp.toLocaleString()} XP</Text>}
          </View>
        </GlassCard>

        <SectionLabel text="Service record" color={C.green} />
        <GlassCard style={{ padding: 16 }}>
          <Row label="Cases closed" value={String(profile.casesSolved)} color={C.green} />
          <Row label="Charges dismissed" value={String(profile.casesFailed)} color={C.red} />
          <Row label="Perfect investigations" value={String(profile.perfect)} color={C.gold} />
          <Row label="Evidence recovered" value={String(profile.totalEvidence)} color={C.amber} />
          <Row label="Questions asked" value={String(profile.totalQuestions)} color={C.cyan} />
          <Row label="Current streak" value={`${profile.streak} day${profile.streak === 1 ? '' : 's'}`} color={C.amber} />
          <Row label="Best streak" value={`${profile.bestStreak} days`} color={C.violet} />
          <Row label="Commendations" value={String(profile.achievements.length)} color={C.gold} />
          <Row label="Case types logged" value={String(profile.collection.length)} color="#7FE3B0" />
        </GlassCard>

        <SectionLabel text="Clearance" color={C.amber} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {profile.unlockedDifficulties.map((d) => (
            <Chip key={d} label={d} color={DIFFICULTY_META[d].color} filled />
          ))}
        </View>

        <SectionLabel text="Recent" color={C.textFaint} />
        {profile.history.slice(0, 5).map((hh) => (
          <View key={hh.at} style={styles.hRow}>
            <Text style={[styles.hRank, { color: RANK_META[hh.rank].color }]}>{hh.rank}</Text>
            <Text style={styles.hTitle} numberOfLines={1}>{hh.title}</Text>
            <Text style={styles.hScore}>{hh.score}</Text>
          </View>
        ))}

        <PrimaryButton label="VIEW FULL STATISTICS" icon="stats-chart" color={C.cyan} small style={{ marginTop: 18 }} onPress={() => navigation.navigate('Stats')} />
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowVal, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  handle: { color: C.text, fontSize: 20, fontWeight: '900', letterSpacing: 2.4, fontFamily: MONO },
  badgeNo: { color: C.textFaint, fontSize: 10, letterSpacing: 2, marginTop: 6, fontFamily: MONO },
  editRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 },
  input: {
    color: C.text, fontSize: 18, fontWeight: '900', letterSpacing: 2, fontFamily: MONO,
    borderBottomWidth: 1, borderBottomColor: C.cyan, paddingVertical: 4, minWidth: 170, textAlign: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  xp: { color: C.text, fontSize: 19, fontWeight: '900', fontFamily: MONO },
  careerBlurb: { color: C.textDim, fontSize: 11, marginTop: 5, lineHeight: 16 },
  next: { color: C.textFaint, fontSize: 10, marginTop: 5, fontFamily: MONO },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(140,170,210,0.07)' },
  rowLabel: { color: C.textDim, fontSize: 12.5, flex: 1 },
  rowVal: { fontSize: 13.5, fontWeight: '900', fontFamily: MONO },
  hRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(140,170,210,0.07)' },
  hRank: { width: 24, fontSize: 15, fontWeight: '900', fontFamily: MONO },
  hTitle: { color: C.text, fontSize: 12.5, flex: 1 },
  hScore: { color: C.textDim, fontSize: 12, fontFamily: MONO },
});
