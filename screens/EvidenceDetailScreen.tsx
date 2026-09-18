import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, EVIDENCE_META } from '../lib/theme';
import { AppHeader, Chip, GlassCard, MONO, PrimaryButton, Screen, SectionLabel, Touch, EmptyState, ScanLine } from '../components/ui';
import EvidenceBody from '../components/EvidenceViewers';
import { useGame } from '../lib/store';
import { Audio } from '../lib/audio';
import { Haptics } from '../lib/haptics';

export default function EvidenceDetailScreen({ navigation, route }: any) {
  const { active, analyse, setBoard, showToast } = useGame();
  const insets = useSafeAreaInsets();
  const { evidenceId } = route.params;
  const cf = active?.cf;
  const pr = active?.progress;
  const [analysing, setAnalysing] = useState(false);

  const ev = cf?.evidence.find((e) => e.id === evidenceId);

  const locationKind = useMemo(() => {
    if (!cf || !ev) return 'office';
    const loc = cf.locations.find((l) => l.id === ev.placesLocationId);
    return loc?.kind ?? 'office';
  }, [cf, ev]);

  if (!cf || !pr || !ev) {
    return (
      <Screen>
        <AppHeader title="Exhibit" onBack={() => navigation.goBack()} />
        <EmptyState icon="document" title="EXHIBIT UNAVAILABLE" body="This item is not in the evidence locker." />
      </Screen>
    );
  }

  const m = EVIDENCE_META[ev.kind];
  const analysed = pr.analysed.includes(ev.id);
  const reliability = analysed && ev.analysis?.upgradesTo ? ev.analysis.upgradesTo : ev.reliability;
  const relColor = reliability === 'verified' ? C.green : reliability === 'tampered' ? C.red : reliability === 'partial' ? C.amber : C.textFaint;

  const placedSuspect = cf.suspects.find((s) => s.id === ev.placesSuspectId);
  const statement = placedSuspect && ev.slotIndex !== null
    ? cf.statements.find((s) => s.suspectId === placedSuspect.id && s.slotIndex === ev.slotIndex)
    : null;
  const claimedLoc = statement ? cf.locations.find((l) => l.id === statement.claimedLocationId) : null;
  const actualLoc = cf.locations.find((l) => l.id === ev.placesLocationId);
  const conflicts = !!statement && !!ev.placesLocationId && statement.claimedLocationId !== ev.placesLocationId && reliability !== 'tampered';

  const pinned = pr.board.nodes.some((n) => n.refId === ev.id);

  const runAnalysis = () => {
    setAnalysing(true);
    Audio.play('radio');
    setTimeout(() => {
      analyse(ev.id);
      setAnalysing(false);
      if (ev.analysis?.upgradesTo === 'tampered') { Audio.play('sting'); Haptics.error(); showToast('Exhibit integrity failure detected.', 'bad'); }
      else { Audio.play('discover'); Haptics.success(); showToast('Forensic analysis complete.', 'good'); }
    }, 1200);
  };

  const pin = () => {
    if (pinned) { showToast('Already pinned to the board.', 'info'); return; }
    const i = pr.board.nodes.length;
    const node = {
      id: `n${Date.now()}`, kind: 'evidence' as const, refId: ev.id,
      x: 18 + (i % 2) * 150, y: 20 + Math.floor(i / 2) * 78,
    };
    setBoard([...pr.board.nodes, node], pr.board.links);
    Audio.play('lock'); Haptics.medium();
    showToast('Pinned to the evidence board.', 'good');
  };

  return (
    <Screen gradient={['#05070B', '#0A0F17', '#06080D']}>
      <AppHeader
        title={m.label}
        subtitle={ev.source}
        accent={m.color}
        onBack={() => navigation.goBack()}
        right={<Chip label={reliability} color={relColor} filled small />}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn}>
          <View style={styles.hero}>
            <LinearGradient colors={[m.color + '1E', 'transparent']} style={StyleSheet.absoluteFill} />
            <Text style={[styles.exhibitRef, { color: m.color }]}>EXHIBIT {ev.id.toUpperCase()} · {ev.timeLabel}</Text>
            <Text style={styles.title}>{ev.title}</Text>
            <Text style={styles.summary}>{ev.summary}</Text>
            <View style={styles.chipRow}>
              {ev.slotIndex === cf.crimeSlotIndex && <Chip label="Crime window" color={C.red} filled small icon="skull" />}
              {ev.placesLocationId === cf.crimeLocationId && <Chip label="At the scene" color={C.amber} filled small icon="location" />}
              {ev.tags.map((t) => <Chip key={t} label={t} color={C.textFaint} small />)}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80)}>
          <SectionLabel text="Exhibit content" color={m.color} />
          <GlassCard style={{ padding: 15 }}>
            <EvidenceBody ev={ev} locationKind={locationKind} />
          </GlassCard>
        </Animated.View>

        {/* Statement comparison */}
        {placedSuspect && statement && (
          <Animated.View entering={FadeInDown.delay(140)}>
            <SectionLabel text="Compare against statement" color={conflicts ? C.red : C.green} />
            <GlassCard accent={conflicts ? C.red : C.green} style={{ padding: 15 }}>
              <Text style={styles.cmpName}>{placedSuspect.name} — {cf.slots[ev.slotIndex!].label}</Text>
              <View style={styles.cmpRow}>
                <View style={styles.cmpCol}>
                  <Text style={styles.cmpLabel}>THEY CLAIM</Text>
                  <Text style={styles.cmpVal}>{claimedLoc?.name}</Text>
                </View>
                <Ionicons name={conflicts ? 'close-circle' : 'checkmark-circle'} size={20} color={conflicts ? C.red : C.green} />
                <View style={styles.cmpCol}>
                  <Text style={styles.cmpLabel}>EXHIBIT SHOWS</Text>
                  <Text style={[styles.cmpVal, conflicts && { color: C.red }]}>{actualLoc?.name}</Text>
                </View>
              </View>
              <Text style={styles.cmpNote}>
                {reliability === 'tampered'
                  ? 'This exhibit has been proven unreliable. It cannot place anybody anywhere.'
                  : conflicts
                    ? ev.slotIndex === cf.crimeSlotIndex
                      ? 'This falsifies their account of the crime window. Confront them with it.'
                      : 'This falsifies their account — but outside the crime window. A liar is not automatically an offender.'
                    : 'This exhibit corroborates their account for this window.'}
              </Text>
            </GlassCard>
          </Animated.View>
        )}

        {/* Forensic analysis */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <SectionLabel text="Forensic analysis" color={C.violet} />
          {analysed ? (
            <GlassCard accent={ev.analysis?.upgradesTo === 'tampered' ? C.red : C.violet} style={{ padding: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 9 }}>
                <Ionicons name="flask" size={15} color={ev.analysis?.upgradesTo === 'tampered' ? C.red : C.violet} />
                <Text style={[styles.labTitle, { color: ev.analysis?.upgradesTo === 'tampered' ? C.red : C.violet }]}>
                  LABORATORY REPORT
                </Text>
              </View>
              <Text style={styles.labBody}>{ev.analysis?.result ?? 'No anomalies detected.'}</Text>
            </GlassCard>
          ) : analysing ? (
            <GlassCard style={{ padding: 22, alignItems: 'center', overflow: 'hidden' }}>
              <ScanLine color={C.violet} />
              <Ionicons name="flask" size={26} color={C.violet} />
              <Text style={styles.analysingText}>RUNNING INTEGRITY CHECKS…</Text>
            </GlassCard>
          ) : (
            <PrimaryButton
              label="RUN FORENSIC ANALYSIS"
              icon="flask"
              color={C.violet}
              onPress={runAnalysis}
              sublabel="Verifies timestamps, source integrity and chain of custody"
            />
          )}
        </Animated.View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <PrimaryButton
            label={pinned ? 'PINNED' : 'PIN TO BOARD'}
            icon="pin"
            color={pinned ? C.textDim : C.cyan}
            small
            style={{ flex: 1 }}
            onPress={pin}
          />
          <PrimaryButton
            label="BACK TO CASE"
            icon="arrow-back"
            color={C.textDim}
            small
            style={{ flex: 1 }}
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 15, borderWidth: 1, borderColor: C.hairlineStrong, padding: 17, overflow: 'hidden',
    backgroundColor: 'rgba(10,14,22,0.7)',
  },
  exhibitRef: { fontSize: 9, fontWeight: '900', letterSpacing: 1.8, fontFamily: MONO },
  title: { color: C.text, fontSize: 19, fontWeight: '800', marginTop: 8, lineHeight: 24 },
  summary: { color: C.textDim, fontSize: 12.5, marginTop: 8, lineHeight: 19 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  cmpName: { color: C.text, fontSize: 12.5, fontWeight: '800', marginBottom: 12 },
  cmpRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cmpCol: { flex: 1 },
  cmpLabel: { color: C.textFaint, fontSize: 8, letterSpacing: 1.4, fontWeight: '800', fontFamily: MONO },
  cmpVal: { color: C.text, fontSize: 12.5, marginTop: 5, fontWeight: '600', lineHeight: 17 },
  cmpNote: { color: C.textDim, fontSize: 11.5, marginTop: 14, lineHeight: 17, fontStyle: 'italic' },
  labTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginLeft: 8, fontFamily: MONO },
  labBody: { color: C.text, fontSize: 12.5, lineHeight: 19 },
  analysingText: { color: C.violet, fontSize: 10, letterSpacing: 2, marginTop: 12, fontFamily: MONO, fontWeight: '800' },
});
