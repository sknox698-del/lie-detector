import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, DIFFICULTY_META, RANK_META } from '../lib/theme';
import { AppHeader, GlassCard, MONO, Screen, SectionLabel, EmptyState, Chip } from '../components/ui';
import { useGame } from '../lib/store';
import { formatTime, careerFor, CAREER_RANKS } from '../lib/scoring';

const { width } = Dimensions.get('window');
const CHART_W = width - 32 - 32;

export default function StatsScreen({ navigation }: any) {
  const { profile } = useGame();
  const insets = useSafeAreaInsets();
  const h = profile.history;

  const stats = useMemo(() => {
    const total = h.length;
    const solved = h.filter((x) => x.correctSuspect).length;
    const avgScore = total ? Math.round(h.reduce((a, b) => a + b.score, 0) / total) : 0;
    const avgTime = total ? h.reduce((a, b) => a + b.timeMs, 0) / total : 0;
    const bestScore = total ? Math.max(...h.map((x) => x.score)) : 0;
    const evRate = total ? h.reduce((a, b) => a + b.evidenceFound / Math.max(1, b.evidenceTotal), 0) / total : 0;
    const accuracy = total ? solved / total : 0;
    const topicAcc = total ? h.filter((x) => x.correctTopic).length / total : 0;
    const motiveAcc = total ? h.filter((x) => x.correctMotive).length / total : 0;
    const proofAcc = total ? h.filter((x) => x.correctEvidence).length / total : 0;
    return { total, solved, avgScore, avgTime, bestScore, evRate, accuracy, topicAcc, motiveAcc, proofAcc };
  }, [h]);

  const rankCounts = useMemo(() => {
    const m: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    h.forEach((x) => { m[x.rank] = (m[x.rank] ?? 0) + 1; });
    return m;
  }, [h]);

  const series = useMemo(() => h.slice(0, 14).reverse().map((x) => x.score), [h]);
  const career = careerFor(profile.xp);

  return (
    <Screen gradient={['#05100E', '#071612', '#05070B']}>
      <AppHeader title="Statistics" subtitle={`${stats.total} closed cases on record`} accent="#7FE3B0" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {stats.total === 0 ? (
          <EmptyState icon="stats-chart" title="NO RECORD YET" body="Close your first case and your career statistics begin here." />
        ) : (
          <>
            <View style={styles.grid}>
              <Box icon="checkmark-done" label="CLEARANCE RATE" value={`${Math.round(stats.accuracy * 100)}%`} color={C.green} />
              <Box icon="trophy" label="BEST SCORE" value={String(stats.bestScore)} color={C.gold} />
              <Box icon="speedometer" label="AVG SCORE" value={String(stats.avgScore)} color={C.cyan} />
              <Box icon="time" label="AVG TIME" value={formatTime(stats.avgTime)} color={C.amber} />
              <Box icon="file-tray-full" label="EVIDENCE RATE" value={`${Math.round(stats.evRate * 100)}%`} color={C.violet} />
              <Box icon="chatbubbles" label="QUESTIONS" value={String(profile.totalQuestions)} color="#FF7AC8" />
            </View>

            <SectionLabel text="Score trend" color={C.cyan} />
            <GlassCard style={{ padding: 16 }}>
              <Chart series={series} />
              <Text style={styles.chartCaption}>Last {series.length} closed cases · max 1000</Text>
            </GlassCard>

            <SectionLabel text="Rank distribution" color={C.gold} />
            <GlassCard style={{ padding: 16 }}>
              {Object.entries(rankCounts).map(([r, n]) => {
                const pct = stats.total ? n / stats.total : 0;
                return (
                  <View key={r} style={styles.rankRow}>
                    <Text style={[styles.rankKey, { color: RANK_META[r].color }]}>{r}</Text>
                    <View style={styles.rankTrack}>
                      <View style={[styles.rankFill, { width: `${pct * 100}%`, backgroundColor: RANK_META[r].color }]} />
                    </View>
                    <Text style={styles.rankNum}>{n}</Text>
                  </View>
                );
              })}
            </GlassCard>

            <SectionLabel text="Reasoning accuracy" color={C.violet} />
            <GlassCard style={{ padding: 16 }}>
              <AccRow label="Correct suspect" value={stats.accuracy} color={C.green} />
              <AccRow label="Nature of the lie" value={stats.topicAcc} color={C.cyan} />
              <AccRow label="Motive" value={stats.motiveAcc} color={C.amber} />
              <AccRow label="Proving exhibit" value={stats.proofAcc} color={C.violet} />
            </GlassCard>
          </>
        )}

        <SectionLabel text="Career ladder" color={C.cyan} />
        {CAREER_RANKS.map((r, i) => {
          const reached = profile.xp >= r.xp;
          const current = career.idx === i;
          return (
            <Animated.View key={r.name} entering={FadeInDown.delay(i * 40)}>
              <View style={[styles.careerRow, { borderColor: current ? C.cyan + '88' : reached ? C.green + '44' : C.hairline }, !reached && { opacity: 0.5 }]}>
                <Ionicons name={(reached ? 'shield-checkmark' : 'lock-closed') as any} size={17} color={current ? C.cyan : reached ? C.green : C.textFaint} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.careerName, { color: current ? C.cyan : C.text }]}>{r.name}</Text>
                  <Text style={styles.careerBlurb}>{r.blurb}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.careerXp}>{r.xp.toLocaleString()}</Text>
                  {r.unlock ? <Chip label={r.unlock} color={DIFFICULTY_META[r.unlock].color} small /> : null}
                </View>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function Box({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={[styles.box, { borderColor: color + '33' }]}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.boxVal, { color }]}>{value}</Text>
      <Text style={styles.boxLabel}>{label}</Text>
    </View>
  );
}

function AccRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ marginBottom: 13 }}>
      <View style={{ flexDirection: 'row', marginBottom: 5 }}>
        <Text style={styles.accLabel}>{label}</Text>
        <Text style={[styles.accVal, { color }]}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.rankTrack}>
        <View style={[styles.rankFill, { width: `${value * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function Chart({ series }: { series: number[] }) {
  const h = 110;
  if (series.length < 2) {
    return <Text style={styles.chartCaption}>Close at least two cases to plot a trend.</Text>;
  }
  const max = 1000;
  const step = CHART_W / (series.length - 1);
  const pts = series.map((v, i) => [i * step, h - (v / max) * h]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${CHART_W},${h} L0,${h} Z`;
  return (
    <Svg width={CHART_W} height={h + 10}>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <Line key={g} x1={0} y1={h * g} x2={CHART_W} y2={h * g} stroke="#5A6E8A" strokeWidth={0.5} opacity={0.2} />
      ))}
      <Path d={area} fill={C.cyan} opacity={0.1} />
      <Path d={d} stroke={C.cyan} strokeWidth={2} fill="none" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <Circle key={i} cx={p[0]} cy={p[1]} r={2.8} fill={C.cyan} />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  box: {
    width: (width - 32 - 10) / 2, borderRadius: 12, borderWidth: 1, padding: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  boxVal: { fontSize: 19, fontWeight: '900', fontFamily: MONO, marginTop: 8 },
  boxLabel: { color: C.textFaint, fontSize: 8, letterSpacing: 1.3, marginTop: 3, fontFamily: MONO },
  chartCaption: { color: C.textFaint, fontSize: 10, marginTop: 8, fontFamily: MONO, textAlign: 'center' },
  rankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  rankKey: { width: 20, fontSize: 13, fontWeight: '900', fontFamily: MONO },
  rankTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  rankFill: { height: '100%', borderRadius: 4 },
  rankNum: { color: C.textDim, fontSize: 11, width: 26, textAlign: 'right', fontFamily: MONO },
  accLabel: { color: C.text, fontSize: 12, flex: 1 },
  accVal: { fontSize: 12, fontWeight: '900', fontFamily: MONO },
  careerRow: {
    flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 12, borderWidth: 1,
    marginBottom: 9, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  careerName: { fontSize: 13, fontWeight: '800' },
  careerBlurb: { color: C.textFaint, fontSize: 10.5, marginTop: 3, lineHeight: 15 },
  careerXp: { color: C.textDim, fontSize: 11, fontFamily: MONO, marginBottom: 4 },
});
