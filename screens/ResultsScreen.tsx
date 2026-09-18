import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, RANK_META, DIFFICULTY_META, EVIDENCE_META } from '../lib/theme';
import { AppHeader, Chip, GlassCard, MONO, PrimaryButton, Screen, SectionLabel, Touch, ProgressRing } from '../components/ui';
import Portrait from '../components/Portrait';
import { useGame } from '../lib/store';
import { CaseResult } from '../lib/types';
import { ScoreBreakdown, formatTime, careerFor } from '../lib/scoring';
import { ACHIEVEMENTS, TIER_COLOR } from '../lib/achievements';
import { Audio } from '../lib/audio';

const { width } = Dimensions.get('window');

export default function ResultsScreen({ navigation, route }: any) {
  const { active, profile, reopenCase, endCase, showToast } = useGame();
  const insets = useSafeAreaInsets();
  const result: CaseResult = useMemo(() => JSON.parse(route.params.resultJson), [route.params.resultJson]);
  const breakdown: ScoreBreakdown[] = useMemo(() => JSON.parse(route.params.breakdownJson), [route.params.breakdownJson]);
  const fresh: string[] = useMemo(() => JSON.parse(route.params.freshJson ?? '[]'), [route.params.freshJson]);
  const xp: number = route.params.xp ?? 0;
  const [copied, setCopied] = useState(false);

  const cf = active?.cf;
  const pr = active?.progress;
  const rank = RANK_META[result.rank];
  const scale = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(180, withSpring(1, { damping: 11, stiffness: 110 }));
    glow.value = withDelay(500, withTiming(1, { duration: 900 }));
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const career = careerFor(profile.xp);

  const culprit = cf?.suspects.find((s) => s.id === cf.solution.culpritId);
  const keyEv = cf?.evidence.find((e) => cf.solution.keyEvidenceIds.includes(e.id));

  const outcomeCopy: Record<string, { title: string; body: string; color: string }> = {
    perfect: { title: 'PERFECT INVESTIGATION', body: 'Every determination correct, the locker emptied, and no false charges filed. This is how it is supposed to be done.', color: C.gold },
    correct: { title: 'CHARGE SUSTAINED', body: 'The subject you named is the one the record cannot clear. Your proving exhibit survives challenge.', color: C.green },
    partial: { title: 'CHARGE SUSTAINED — REASONING WEAK', body: 'You named the right person, but part of your reasoning does not hold. A defence lawyer would find the gap.', color: C.cyan },
    insufficient: { title: 'INSUFFICIENT EVIDENCE', body: 'Right instinct, thin file. Without a proving exhibit the charge would not survive first hearing.', color: C.amber },
    wrong: { title: 'CHARGE DISMISSED', body: 'The record does not close around the person you named. Somebody else’s account is the one that fails.', color: C.red },
  };
  const oc = outcomeCopy[result.outcome];

  const shareText = useMemo(() => {
    const stars = '■'.repeat(Math.max(1, Math.round((result.score / 1000) * 10))) + '□'.repeat(10 - Math.max(1, Math.round((result.score / 1000) * 10)));
    return [
      `LIE DETECTOR — ${result.title}`,
      `Case ${result.code} · ${result.difficulty}`,
      `RANK ${result.rank} · ${result.score} pts`,
      stars,
      `${result.evidenceFound}/${result.evidenceTotal} exhibits · ${result.questionsAsked} questions · ${formatTime(result.timeMs)}`,
      `Can you beat it? Use case code ${result.code}`,
    ].join('\n');
  }, [result]);

  const copyShare = async () => {
    try {
      await Clipboard.setStringAsync(shareText);
      setCopied(true);
      showToast('Result card copied. Paste it anywhere.', 'good');
      setTimeout(() => setCopied(false), 2400);
    } catch {
      showToast('Could not access the clipboard.', 'bad');
    }
  };

  const alibiProof = useMemo(() => {
    if (!cf) return [];
    return cf.suspects
      .filter((s) => s.id !== cf.solution.culpritId)
      .map((s) => {
        const ev = cf.evidence.find(
          (e) => e.placesSuspectId === s.id && e.slotIndex === cf.crimeSlotIndex && e.reliability === 'verified' && e.tags.includes('alibi')
        );
        const loc = cf.locations.find((l) => l.id === ev?.placesLocationId);
        return { name: s.name, ev, loc: loc?.name };
      });
  }, [cf]);

  return (
    <Screen gradient={result.correctSuspect ? ['#04100C', '#07140F', '#05070B'] : ['#100407', '#14070B', '#05070B']}>
      <AppHeader
        title="Case Debrief"
        subtitle={`${result.title} · ${result.code}`}
        accent={oc.color}
        onBack={() => { endCase(); navigation.navigate('Menu'); }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Rank badge */}
        <Animated.View style={[styles.badgeWrap, badgeStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
            <LinearGradient colors={[rank.color + '30', 'transparent']} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Svg width={150} height={150} style={{ position: 'absolute' }}>
            <Circle cx={75} cy={75} r={62} stroke={rank.color} strokeWidth={1.2} opacity={0.35} fill="none" />
            <Circle cx={75} cy={75} r={70} stroke={rank.color} strokeWidth={0.6} opacity={0.2} fill="none" />
          </Svg>
          <View style={[styles.badge, { borderColor: rank.color }]}>
            <Text style={[styles.rankText, { color: rank.color }]}>{result.rank}</Text>
          </View>
          <Text style={[styles.rankLabel, { color: rank.color }]}>{rank.label}</Text>
          <Text style={styles.scoreText}>{result.score} / 1000</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <GlassCard accent={oc.color} glow style={{ padding: 17 }}>
            <Text style={[styles.outcomeTitle, { color: oc.color }]}>{oc.title}</Text>
            <Text style={styles.outcomeBody}>{oc.body}</Text>
          </GlassCard>
        </Animated.View>

        {/* determinations */}
        <SectionLabel text="Determinations" color={C.cyan} />
        <GlassCard style={{ padding: 14 }}>
          <Determination label="Suspect" ok={result.correctSuspect} />
          <Determination label="Nature of the lie" ok={result.correctTopic} />
          <Determination label="Motive" ok={result.correctMotive} />
          <Determination label="Proving exhibit" ok={result.correctEvidence} />
        </GlassCard>

        {/* score breakdown */}
        <SectionLabel text="Scoring" color={C.amber} />
        <GlassCard style={{ padding: 14 }}>
          {breakdown.map((b, i) => (
            <Animated.View key={b.label} entering={FadeIn.delay(300 + i * 60)} style={styles.bRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bLabel}>{b.label}</Text>
                <Text style={styles.bDetail}>{b.detail}</Text>
              </View>
              <Text style={[styles.bPoints, { color: b.points < 0 ? C.red : b.ok ? C.green : C.textFaint }]}>
                {b.points >= 0 ? '+' : ''}{b.points}
              </Text>
            </Animated.View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={[styles.totalVal, { color: rank.color }]}>{result.score}</Text>
          </View>
        </GlassCard>

        {/* stats */}
        <SectionLabel text="Case record" color={C.textFaint} />
        <View style={styles.statGrid}>
          <StatBox icon="time" label="TIME" value={formatTime(result.timeMs)} color={C.cyan} />
          <StatBox icon="file-tray-full" label="EXHIBITS" value={`${result.evidenceFound}/${result.evidenceTotal}`} color={C.amber} />
          <StatBox icon="chatbubbles" label="QUESTIONS" value={String(result.questionsAsked)} color={C.green} />
          <StatBox icon="trending-up" label="XP GAINED" value={`+${xp}`} color={C.violet} />
        </View>

        {/* Proof chain (only if they got it right) */}
        {result.correctSuspect && cf && culprit ? (
          <>
            <SectionLabel text="Why the record closes here" color={C.green} />
            <GlassCard accent={C.green} style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={styles.culpritBox}>
                  <Portrait face={culprit.face} emotion="broken" size={70} quality="High" animated={false} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.culpritName}>{culprit.name}</Text>
                  <Text style={styles.culpritMeta}>{culprit.occupation} · {culprit.relationToVictim}</Text>
                  <Chip label={culprit.motive?.label ?? 'Motive'} color={C.amber} small filled style={{ alignSelf: 'flex-start', marginTop: 6 }} />
                </View>
              </View>
              <ProofLine n={1} text={`Their account for ${cf.slots[cf.crimeSlotIndex].label} places them at ${cf.locations.find((l) => l.id === cf.statements.find((s) => s.id === cf.solution.lieStatementId)?.claimedLocationId)?.name}.`} />
              <ProofLine n={2} text={`${keyEv?.title ?? 'The key exhibit'} — a verified system of record — places them inside ${cf.locationName} in the same window.`} />
              <ProofLine n={3} text={`Every other suspect is fixed elsewhere in that window by independent verified record.`} />
              <ProofLine n={4} text={`${culprit.motive?.description ?? ''}`} />
              <View style={styles.alibiBox}>
                {alibiProof.map((a) => (
                  <View key={a.name} style={styles.alibiRow}>
                    <Ionicons name="checkmark-circle" size={12} color={C.green} />
                    <Text style={styles.alibiText}>{a.name} — {a.loc ?? 'verified elsewhere'}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </>
        ) : cf ? (
          <>
            <SectionLabel text="Where the file is thin" color={C.red} />
            <GlassCard accent={C.red} style={{ padding: 16 }}>
              <Hint text={`You recovered ${result.evidenceFound} of ${result.evidenceTotal} exhibits. Every innocent party has at least one verified record placing them elsewhere at ${cf.slots[cf.crimeSlotIndex].label}. Find those first — then look at who is left.`} />
              <Hint text="Presence at the scene outside the crime window proves nothing. Check the timestamp before you rely on a placement." />
              <Hint text="Run forensic analysis on anything marked unverified. Manipulated exhibits are designed to point at the wrong person." />
              <Hint text="A suspect who lies is not automatically the offender. Some of them are protecting something ordinary and humiliating." />
              <Text style={styles.noReveal}>The solution has not been disclosed. The case remains open to you.</Text>
            </GlassCard>
          </>
        ) : null}

        {/* Achievements */}
        {fresh.length > 0 && (
          <>
            <SectionLabel text="Commendations earned" color={C.gold} />
            {fresh.map((id) => {
              const a = ACHIEVEMENTS.find((x) => x.id === id);
              if (!a) return null;
              return (
                <Animated.View key={id} entering={FadeInDown}>
                  <View style={[styles.achRow, { borderColor: TIER_COLOR[a.tier] + '66' }]}>
                    <Ionicons name={a.icon as any} size={19} color={TIER_COLOR[a.tier]} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.achName, { color: TIER_COLOR[a.tier] }]}>{a.name}</Text>
                      <Text style={styles.achDesc}>{a.desc}</Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </>
        )}

        {/* Career */}
        <SectionLabel text="Career" color={C.cyan} />
        <GlassCard style={{ padding: 15, flexDirection: 'row', alignItems: 'center' }}>
          <ProgressRing value={career.progress} size={52} color={C.cyan} label={`${Math.round(career.progress * 100)}%`} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.careerName}>{career.cur.name.toUpperCase()}</Text>
            <Text style={styles.careerBlurb}>{career.cur.blurb}</Text>
            {career.next && <Text style={styles.careerNext}>{career.next.xp - profile.xp} XP to {career.next.name}</Text>}
          </View>
        </GlassCard>

        {/* Share */}
        <SectionLabel text="Share result" color={C.violet} />
        <Touch onPress={copyShare} sfx="select">
          <View style={styles.shareCard}>
            <LinearGradient colors={['rgba(164,123,255,0.16)', 'rgba(10,14,22,0.95)']} style={StyleSheet.absoluteFill} />
            <Text style={styles.shareText}>{shareText}</Text>
            <View style={styles.shareBtn}>
              <Ionicons name={copied ? 'checkmark' : 'copy'} size={13} color={C.violet} />
              <Text style={styles.shareBtnText}>{copied ? 'COPIED' : 'COPY RESULT CARD'}</Text>
            </View>
          </View>
        </Touch>

        <View style={{ gap: 10, marginTop: 20 }}>
          {!result.correctSuspect && (
            <PrimaryButton
              label="REOPEN THE CASE"
              icon="refresh"
              color={C.amber}
              onPress={() => { reopenCase(); Audio.play('whoosh'); navigation.replace('Investigation'); }}
              sublabel="Your evidence and interviews are preserved. A further false charge costs points."
            />
          )}
          <PrimaryButton
            label="NEXT CASE"
            icon="arrow-forward"
            color={C.cyan}
            onPress={() => { endCase(); navigation.replace('CaseSelect'); }}
          />
          <PrimaryButton
            label="DEPARTMENT"
            icon="home"
            color={C.textDim}
            small
            onPress={() => { endCase(); navigation.navigate('Menu'); }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Determination({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View style={styles.detRow}>
      <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={17} color={ok ? C.green : C.red} />
      <Text style={styles.detLabel}>{label}</Text>
      <Text style={[styles.detVal, { color: ok ? C.green : C.red }]}>{ok ? 'CORRECT' : 'INCORRECT'}</Text>
    </View>
  );
}

function StatBox({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statBox, { borderColor: color + '33' }]}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProofLine({ n, text }: { n: number; text: string }) {
  if (!text) return null;
  return (
    <View style={styles.proofRow}>
      <View style={styles.proofNum}><Text style={styles.proofNumText}>{n}</Text></View>
      <Text style={styles.proofText}>{text}</Text>
    </View>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <View style={styles.hintRow}>
      <Ionicons name="bulb" size={13} color={C.amber} />
      <Text style={styles.hintText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 26, marginBottom: 8 },
  badge: {
    width: 104, height: 104, borderRadius: 34, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  rankText: { fontSize: 50, fontWeight: '900', fontFamily: MONO },
  rankLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 4, marginTop: 14, fontFamily: MONO },
  scoreText: { color: C.textDim, fontSize: 13, marginTop: 6, fontFamily: MONO },
  outcomeTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1.6, fontFamily: MONO },
  outcomeBody: { color: C.text, fontSize: 13, marginTop: 9, lineHeight: 20 },
  detRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(140,170,210,0.07)' },
  detLabel: { color: C.text, fontSize: 12.5, flex: 1, marginLeft: 11 },
  detVal: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1.2, fontFamily: MONO },
  bRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(140,170,210,0.07)' },
  bLabel: { color: C.text, fontSize: 12.5, fontWeight: '600' },
  bDetail: { color: C.textFaint, fontSize: 10.5, marginTop: 2, lineHeight: 15 },
  bPoints: { fontSize: 14, fontWeight: '900', fontFamily: MONO, marginLeft: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 13, marginTop: 5 },
  totalLabel: { color: C.textFaint, fontSize: 10, letterSpacing: 2, fontWeight: '900', flex: 1, fontFamily: MONO },
  totalVal: { fontSize: 22, fontWeight: '900', fontFamily: MONO },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: {
    width: (width - 32 - 10) / 2, borderRadius: 12, borderWidth: 1, padding: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  statVal: { fontSize: 17, fontWeight: '900', fontFamily: MONO, marginTop: 8 },
  statLabel: { color: C.textFaint, fontSize: 8, letterSpacing: 1.4, marginTop: 3, fontFamily: MONO },
  culpritBox: {
    width: 64, height: 78, borderRadius: 11, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: C.hairline,
  },
  culpritName: { color: C.text, fontSize: 15, fontWeight: '800' },
  culpritMeta: { color: C.textFaint, fontSize: 10.5, marginTop: 2, textTransform: 'capitalize' },
  proofRow: { flexDirection: 'row', marginBottom: 10 },
  proofNum: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: C.green + '55',
    alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: 'rgba(59,224,141,0.1)',
  },
  proofNumText: { color: C.green, fontSize: 9.5, fontWeight: '900', fontFamily: MONO },
  proofText: { color: C.text, fontSize: 12.5, flex: 1, lineHeight: 19 },
  alibiBox: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.hairline },
  alibiRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  alibiText: { color: C.textDim, fontSize: 11.5, marginLeft: 8 },
  hintRow: { flexDirection: 'row', marginBottom: 11 },
  hintText: { color: C.textDim, fontSize: 12, flex: 1, marginLeft: 9, lineHeight: 18 },
  noReveal: { color: C.textFaint, fontSize: 11, fontStyle: 'italic', marginTop: 6, textAlign: 'center' },
  achRow: {
    flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 11, borderWidth: 1,
    marginBottom: 9, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  achName: { fontSize: 12.5, fontWeight: '900', letterSpacing: 0.6 },
  achDesc: { color: C.textFaint, fontSize: 10.5, marginTop: 2 },
  careerName: { color: C.cyan, fontSize: 12, fontWeight: '900', letterSpacing: 1.6, fontFamily: MONO },
  careerBlurb: { color: C.textDim, fontSize: 11, marginTop: 4, lineHeight: 16 },
  careerNext: { color: C.textFaint, fontSize: 10, marginTop: 5, fontFamily: MONO },
  shareCard: {
    borderRadius: 14, borderWidth: 1, borderColor: C.violet + '44', padding: 16, overflow: 'hidden',
  },
  shareText: { color: C.text, fontSize: 11.5, lineHeight: 19, fontFamily: MONO },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14,
    paddingVertical: 10, borderRadius: 9, borderWidth: 1, borderColor: C.violet + '66',
  },
  shareBtnText: { color: C.violet, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.4, marginLeft: 7, fontFamily: MONO },
});
