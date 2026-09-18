import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, EVIDENCE_META } from '../lib/theme';
import { AppHeader, Chip, GlassCard, MONO, PrimaryButton, Screen, SectionLabel, Touch, EmptyState } from '../components/ui';
import Portrait from '../components/Portrait';
import { useGame } from '../lib/store';
import { scoreCase } from '../lib/scoring';
import { Audio } from '../lib/audio';
import { Haptics } from '../lib/haptics';

const { width } = Dimensions.get('window');

const STEPS = [
  { key: 'who', label: 'WHO IS LYING?', icon: 'person' },
  { key: 'what', label: 'WHAT DID THEY LIE ABOUT?', icon: 'chatbox' },
  { key: 'why', label: 'WHY DID THEY LIE?', icon: 'help-circle' },
  { key: 'proof', label: 'WHICH EVIDENCE PROVES IT?', icon: 'documents' },
];

export default function AccusationScreen({ navigation }: any) {
  const { active, profile, completeCase, registerAccusationAttempt, showToast } = useGame();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [who, setWho] = useState<string | null>(null);
  const [what, setWhat] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [proof, setProof] = useState<string | null>(null);
  const [filing, setFiling] = useState(false);

  const cf = active?.cf;
  const pr = active?.progress;

  const discovered = useMemo(
    () => (cf && pr ? cf.evidence.filter((e) => pr.discovered.includes(e.id)) : []),
    [cf, pr?.discovered]
  );

  if (!cf || !pr) {
    return (
      <Screen>
        <AppHeader title="Accusation" onBack={() => navigation.goBack()} />
        <EmptyState icon="hammer" title="NO ACTIVE CASE" body="Open a case before filing an accusation." />
      </Screen>
    );
  }

  const coverage = pr.discovered.length / Math.max(1, cf.evidence.length);
  const complete = who && what && why && proof;
  const quality = profile.settings.graphics;

  const file = () => {
    if (!complete) return;
    setFiling(true);
    Audio.play('lock'); Haptics.heavy();
    setTimeout(() => {
      const { result, breakdown } = scoreCase(cf, pr, {
        suspectId: who!, topicId: what!, motiveId: why!, evidenceId: proof!,
      });
      if (!result.correctSuspect) registerAccusationAttempt();
      const { fresh, xp } = completeCase(result);
      Audio.play(result.correctSuspect ? 'success' : 'fail');
      result.correctSuspect ? Haptics.success() : Haptics.error();
      navigation.replace('Results', {
        resultJson: JSON.stringify(result),
        breakdownJson: JSON.stringify(breakdown),
        freshJson: JSON.stringify(fresh),
        xp,
      });
    }, 900);
  };

  return (
    <Screen gradient={['#0B0508', '#12080C', '#05070B']}>
      <AppHeader
        title="File Accusation"
        subtitle={`${cf.title} · ${cf.code}`}
        accent={C.red}
        onBack={() => navigation.goBack()}
      />

      {/* Stepper */}
      <View style={styles.stepper}>
        {STEPS.map((s, i) => {
          const done = [who, what, why, proof][i];
          const on = step === i;
          return (
            <Touch key={s.key} onPress={() => setStep(i)} sfx="tap" style={{ flex: 1 }}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  { borderColor: done ? C.green : on ? C.red : C.hairline, backgroundColor: done ? C.green + '22' : on ? C.red + '1E' : 'transparent' },
                ]}>
                  {done ? <Ionicons name="checkmark" size={13} color={C.green} /> : <Text style={[styles.stepNum, on && { color: C.red }]}>{i + 1}</Text>}
                </View>
                <View style={[styles.stepLine, { backgroundColor: done ? C.green + '55' : C.hairline }]} />
              </View>
            </Touch>
          );
        })}
      </View>

      <View style={styles.stepHead}>
        <Ionicons name={STEPS[step].icon as any} size={16} color={C.red} />
        <Text style={styles.stepTitle}>{STEPS[step].label}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 150 }} showsVerticalScrollIndicator={false}>
        {coverage < 0.4 && (
          <View style={styles.warn}>
            <Ionicons name="warning" size={15} color={C.amber} />
            <Text style={styles.warnText}>
              You have recovered {Math.round(coverage * 100)}% of the available evidence. An accusation filed on this
              record risks an insufficient-evidence finding.
            </Text>
          </View>
        )}

        {step === 0 && (
          <Animated.View entering={FadeIn}>
            {cf.suspects.map((s, i) => {
              const st = pr.suspectStates[s.id];
              const on = who === s.id;
              return (
                <Animated.View key={s.id} entering={FadeInRight.delay(i * 50)}>
                  <Touch onPress={() => { setWho(s.id); setTimeout(() => setStep(1), 260); }} sfx="select" haptic="medium">
                    <GlassCard accent={on ? C.red : undefined} glow={on} style={[styles.suspectRow, on && { borderColor: C.red + '99' }]}>
                      <View style={styles.pBox}>
                        <Portrait face={s.face} emotion={st?.lastEmotion ?? 'calm'} size={80} quality={quality} animated={false} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.sName}>{s.name}</Text>
                        <Text style={styles.sMeta}>{s.occupation} · {s.relationToVictim}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          {st?.log.length ? <Chip label={`${Object.values(st.askedQuestions).reduce((a, b) => a + b, 0)} questions`} color={C.cyan} small /> : <Chip label="Never interviewed" color={C.amber} small />}
                          {st?.brokenStatements.length ? <Chip label={`${st.brokenStatements.length} broken`} color={C.red} small filled /> : null}
                          {st?.secretRevealed ? <Chip label="Secret revealed" color={C.violet} small /> : null}
                        </View>
                      </View>
                      {on && <Ionicons name="radio-button-on" size={20} color={C.red} />}
                    </GlassCard>
                  </Touch>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

        {step === 1 && (
          <Animated.View entering={FadeIn}>
            {cf.lieTopicOptions.map((o, i) => (
              <Animated.View key={o.id} entering={FadeInRight.delay(i * 50)}>
                <Touch onPress={() => { setWhat(o.id); setTimeout(() => setStep(2), 240); }} sfx="select">
                  <View style={[styles.option, what === o.id && styles.optionOn]}>
                    <View style={[styles.optDot, what === o.id && { backgroundColor: C.red, borderColor: C.red }]} />
                    <Text style={[styles.optText, what === o.id && { color: C.text }]}>{o.label}</Text>
                  </View>
                </Touch>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeIn}>
            {cf.motiveOptions.map((m, i) => (
              <Animated.View key={m.id} entering={FadeInRight.delay(i * 50)}>
                <Touch onPress={() => { setWhy(m.id); setTimeout(() => setStep(3), 240); }} sfx="select">
                  <View style={[styles.option, styles.optionTall, why === m.id && styles.optionOn]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.optDot, why === m.id && { backgroundColor: C.red, borderColor: C.red }]} />
                      <Text style={[styles.optText, { fontWeight: '800' }, why === m.id && { color: C.text }]}>{m.label}</Text>
                    </View>
                    <Text style={styles.optSub}>{m.description}</Text>
                  </View>
                </Touch>
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View entering={FadeIn}>
            {discovered.length === 0 ? (
              <EmptyState icon="file-tray" title="NO EVIDENCE RECOVERED" body="You cannot prove a lie with an empty locker. Return to the case." />
            ) : (
              discovered.map((e, i) => {
                const m = EVIDENCE_META[e.kind];
                const on = proof === e.id;
                const rel = pr.analysed.includes(e.id) && e.analysis?.upgradesTo ? e.analysis.upgradesTo : e.reliability;
                return (
                  <Animated.View key={e.id} entering={FadeInRight.delay(i * 30)}>
                    <Touch onPress={() => setProof(e.id)} sfx="select">
                      <View style={[styles.evRow, on && styles.optionOn]}>
                        <Ionicons name={m.icon as any} size={17} color={m.color} />
                        <View style={{ flex: 1, marginLeft: 11 }}>
                          <Text style={styles.evTitle} numberOfLines={1}>{e.title}</Text>
                          <Text style={styles.evSub} numberOfLines={2}>{e.summary}</Text>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                            <Chip label={rel} color={rel === 'verified' ? C.green : rel === 'tampered' ? C.red : C.amber} small />
                            {e.slotIndex === cf.crimeSlotIndex && <Chip label="crime window" color={C.red} small />}
                          </View>
                        </View>
                        {on && <Ionicons name="radio-button-on" size={19} color={C.red} />}
                      </View>
                    </Touch>
                  </Animated.View>
                );
              })
            )}
          </Animated.View>
        )}

        {/* Review */}
        {complete && (
          <Animated.View entering={FadeIn}>
            <SectionLabel text="Draft charge sheet" color={C.red} />
            <GlassCard accent={C.red} style={{ padding: 16 }}>
              <Text style={styles.chargeLine}>
                <Text style={styles.chargeKey}>SUBJECT  </Text>
                {cf.suspects.find((s) => s.id === who)?.name}
              </Text>
              <Text style={styles.chargeLine}>
                <Text style={styles.chargeKey}>FALSEHOOD  </Text>
                {cf.lieTopicOptions.find((o) => o.id === what)?.label}
              </Text>
              <Text style={styles.chargeLine}>
                <Text style={styles.chargeKey}>MOTIVE  </Text>
                {cf.motiveOptions.find((m) => m.id === why)?.label}
              </Text>
              <Text style={styles.chargeLine}>
                <Text style={styles.chargeKey}>EXHIBIT  </Text>
                {cf.evidence.find((e) => e.id === proof)?.title}
              </Text>
            </GlassCard>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <LinearGradient colors={['transparent', 'rgba(8,4,6,0.98)']} style={StyleSheet.absoluteFill} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {step > 0 && (
            <PrimaryButton label="BACK" color={C.textDim} small style={{ width: 96 }} onPress={() => setStep(step - 1)} />
          )}
          {step < 3 ? (
            <PrimaryButton
              label="NEXT"
              icon="arrow-forward"
              color={C.cyan}
              small
              style={{ flex: 1 }}
              disabled={![who, what, why][step]}
              onPress={() => setStep(step + 1)}
            />
          ) : (
            <PrimaryButton
              label={filing ? 'FILING…' : 'FILE ACCUSATION'}
              icon="hammer"
              color={C.red}
              style={{ flex: 1 }}
              disabled={!complete || filing}
              onPress={file}
              small
              sublabel={complete ? 'This closes the case and cannot be undone' : 'Complete all four determinations'}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14 },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 26, height: 26, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { color: C.textFaint, fontSize: 11, fontWeight: '900', fontFamily: MONO },
  stepLine: { flex: 1, height: 1, marginHorizontal: 5 },
  stepHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  stepTitle: { color: C.text, fontSize: 12.5, fontWeight: '900', letterSpacing: 1.6, marginLeft: 9, fontFamily: MONO },
  warn: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 11, marginBottom: 16,
    backgroundColor: 'rgba(255,177,60,0.09)', borderWidth: 1, borderColor: C.amber + '44',
  },
  warnText: { color: C.amber, fontSize: 11.5, marginLeft: 9, flex: 1, lineHeight: 17 },
  suspectRow: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 11 },
  pBox: {
    width: 74, height: 88, borderRadius: 11, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: C.hairline,
  },
  sName: { color: C.text, fontSize: 14.5, fontWeight: '800' },
  sMeta: { color: C.textFaint, fontSize: 10.5, marginTop: 3, textTransform: 'capitalize' },
  option: {
    flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1,
    borderColor: C.hairline, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.025)',
  },
  optionTall: { flexDirection: 'column', alignItems: 'flex-start' },
  optionOn: { borderColor: C.red + '99', backgroundColor: 'rgba(255,77,94,0.09)' },
  optDot: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.4, borderColor: C.textFaint, marginRight: 12 },
  optText: { color: C.textDim, fontSize: 13, flex: 1, lineHeight: 18 },
  optSub: { color: C.textFaint, fontSize: 11.5, marginTop: 8, lineHeight: 17, marginLeft: 25 },
  evRow: {
    flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 11, borderWidth: 1,
    borderColor: C.hairline, marginBottom: 9, backgroundColor: 'rgba(255,255,255,0.025)',
  },
  evTitle: { color: C.text, fontSize: 12.5, fontWeight: '700' },
  evSub: { color: C.textDim, fontSize: 11, marginTop: 3, lineHeight: 16 },
  chargeLine: { color: C.text, fontSize: 12.5, lineHeight: 22 },
  chargeKey: { color: C.textFaint, fontSize: 9.5, letterSpacing: 1.4, fontFamily: MONO },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 26 },
});
