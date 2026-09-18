import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, Modal, TextInput, Dimensions, Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, EVIDENCE_META, DIFFICULTY_META } from '../lib/theme';
import {
  Screen, AppHeader, GlassCard, Chip, MONO, Touch, SectionLabel, Meter, EmptyState, PrimaryButton, ScanLine, Pulse,
} from '../components/ui';
import Portrait from '../components/Portrait';
import EvidenceBoard from '../components/EvidenceBoard';
import { useGame } from '../lib/store';
import { detectContradictions, isEvidenceUnlocked } from '../lib/generator';
import { formatTime } from '../lib/scoring';
import { Evidence } from '../lib/types';
import { Audio } from '../lib/audio';
import { Haptics } from '../lib/haptics';

const { width } = Dimensions.get('window');
type Tab = 'suspects' | 'evidence' | 'timeline' | 'board';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'suspects', label: 'SUSPECTS', icon: 'people' },
  { id: 'evidence', label: 'EVIDENCE', icon: 'file-tray-full' },
  { id: 'timeline', label: 'TIMELINE', icon: 'time' },
  { id: 'board', label: 'BOARD', icon: 'git-network' },
];

export default function InvestigationScreen({ navigation }: any) {
  const {
    active, profile, discover, bumpElapsed, setBoard, setNotes, showToast,
  } = useGame();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('suspects');
  const [scanning, setScanning] = useState<{ kind: string } | null>(null);
  const [found, setFound] = useState<Evidence | null>(null);
  const tick = useRef<any>(null);

  useEffect(() => {
    tick.current = setInterval(() => bumpElapsed(), 1000);
    return () => clearInterval(tick.current);
  }, [bumpElapsed]);

  const cf = active?.cf;
  const pr = active?.progress;

  const contradictions = useMemo(
    () => (cf && pr ? detectContradictions(cf, pr.discovered, pr.analysed) : []),
    [cf, pr?.discovered, pr?.analysed]
  );

  const interrogated = useMemo(
    () => (pr ? Object.entries(pr.suspectStates).filter(([, s]) => s.log.length > 0).map(([id]) => id) : []),
    [pr?.suspectStates]
  );

  const runSearch = useCallback((kind: string) => {
    if (!cf || !pr) return;
    const pool = cf.evidence.filter(
      (e) => e.kind === kind && !pr.discovered.includes(e.id)
    );
    const available = pool.filter((e) => isEvidenceUnlocked(e, pr.discovered, interrogated));
    if (!pool.length) { Audio.play('back'); showToast('This source is exhausted.', 'info'); return; }
    if (!available.length) {
      Audio.play('back'); Haptics.warning();
      showToast('Nothing surfaces yet. Recover more groundwork or interview someone first.', 'bad');
      return;
    }
    setScanning({ kind });
    Audio.play('radio');
    setTimeout(() => {
      const ev = available[0];
      const ok = discover(ev.id);
      setScanning(null);
      if (ok) {
        Audio.play('discover'); Haptics.success();
        setFound(ev);
      }
    }, 1150);
  }, [cf, pr, interrogated, discover, showToast]);

  if (!cf || !pr) {
    return (
      <Screen>
        <AppHeader title="No active case" onBack={() => navigation.navigate('Menu')} />
        <EmptyState icon="folder-open" title="NO ACTIVE CASE" body="Open a case file from the department docket." />
      </Screen>
    );
  }

  const meta = DIFFICULTY_META[cf.difficulty];
  const quality = profile.settings.graphics;
  const discoveredCount = pr.discovered.length;

  return (
    <Screen gradient={['#05070B', '#0A0F17', '#06080D']}>
      <AppHeader
        title={cf.title}
        subtitle={`${cf.code} · ${cf.caseType} · ${cf.locationName}`}
        accent={meta.color}
        onBack={() => navigation.navigate('Menu')}
        right={
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.timer}>{formatTime(pr.elapsedMs)}</Text>
            <Text style={styles.timerSub}>{discoveredCount}/{cf.evidence.length} EXHIBITS</Text>
          </View>
        }
      />

      {/* status strip */}
      <View style={styles.strip}>
        <StripItem icon="alert-circle" color={C.red} label="CONTRADICTIONS" value={String(contradictions.length)} />
        <StripItem icon="chatbubbles" color={C.cyan} label="QUESTIONS" value={String(pr.questionsAsked)} />
        <StripItem icon="people" color={C.green} label="INTERVIEWED" value={`${interrogated.length}/${cf.suspects.length}`} />
        <StripItem icon="skull" color={C.amber} label="WINDOW" value={cf.slots[cf.crimeSlotIndex].label} />
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'suspects' && (
          <FlatList
            data={cf.suspects}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const st = pr.suspectStates[item.id];
              const cx = contradictions.filter((c) => c.suspectId === item.id);
              return (
                <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(18)} style={{ marginBottom: 12 }}>
                  <Touch onPress={() => navigation.navigate('Interrogation', { suspectId: item.id })} sfx="whoosh" haptic="medium">
                    <GlassCard accent={cx.length ? C.red : C.cyan} style={{ padding: 0 }}>
                      <LinearGradient
                        colors={[(cx.length ? C.red : C.cyan) + '14', 'transparent']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <View style={{ flexDirection: 'row', padding: 14 }}>
                        <View style={styles.portraitBox}>
                          <LinearGradient colors={['rgba(62,232,255,0.12)', 'transparent']} style={StyleSheet.absoluteFill} />
                          <Portrait
                            face={item.face}
                            emotion={st?.lastEmotion ?? 'calm'}
                            size={96}
                            stress={st?.stress ?? 0}
                            quality={quality}
                            animated={quality !== 'Low'}
                          />
                        </View>
                        <View style={{ flex: 1, marginLeft: 13 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.sName} numberOfLines={1}>{item.name}</Text>
                            {st?.secretRevealed && <Ionicons name="lock-open" size={13} color={C.amber} style={{ marginLeft: 6 }} />}
                          </View>
                          <Text style={styles.sRole}>{item.age} · {item.occupation}</Text>
                          <Text style={styles.sRel}>{item.relationToVictim} of {cf.victimName}</Text>
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <Meter label="TRUST" value={st?.trust ?? 50} color={C.green} />
                            <Meter label="STRESS" value={st?.stress ?? 0} color={C.red} />
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                            {st?.log.length ? <Chip label="Interviewed" color={C.green} small icon="checkmark" /> : <Chip label="Not interviewed" color={C.textFaint} small />}
                            {cx.length > 0 && <Chip label={`${cx.length} contradiction${cx.length > 1 ? 's' : ''}`} color={C.red} filled small icon="warning" />}
                            {st?.brokenStatements.length ? <Chip label={`${st.brokenStatements.length} broken`} color={C.amber} small /> : null}
                          </View>
                        </View>
                      </View>
                    </GlassCard>
                  </Touch>
                </Animated.View>
              );
            }}
          />
        )}

        {tab === 'evidence' && (
          <EvidenceTab
            cf={cf} pr={pr} onSearch={runSearch}
            interrogated={interrogated}
            onOpen={(id) => navigation.navigate('EvidenceDetail', { evidenceId: id })}
          />
        )}

        {tab === 'timeline' && <TimelineTab cf={cf} pr={pr} contradictions={contradictions} />}

        {tab === 'board' && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
            <EvidenceBoard
              cf={cf}
              nodes={pr.board.nodes}
              links={pr.board.links}
              discovered={pr.discovered}
              onChange={setBoard}
            />
            <SectionLabel text="Case notebook" color={C.textFaint} />
            <View style={styles.notesBox}>
              <TextInput
                style={styles.notes}
                multiline
                placeholder="Working theory, timings, names…"
                placeholderTextColor={C.textFaint}
                value={pr.notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        )}
      </View>

      {/* bottom bar */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 8 }]}>
        <LinearGradient colors={['transparent', 'rgba(5,7,11,0.98)']} style={StyleSheet.absoluteFill} />
        <View style={styles.tabBar}>
          {TABS.map((tb) => {
            const on = tab === tb.id;
            return (
              <Touch key={tb.id} onPress={() => { setTab(tb.id); }} sfx="tap" style={{ flex: 1 }}>
                <View style={styles.tabItem}>
                  <Ionicons name={tb.icon as any} size={19} color={on ? C.cyan : C.textFaint} />
                  <Text style={[styles.tabLabel, { color: on ? C.cyan : C.textFaint }]}>{tb.label}</Text>
                  {on && <View style={styles.tabDot} />}
                </View>
              </Touch>
            );
          })}
        </View>
        <PrimaryButton
          label="FILE ACCUSATION"
          icon="hammer"
          color={C.red}
          onPress={() => navigation.navigate('Accusation')}
          small
          style={{ marginHorizontal: 16, marginTop: 4 }}
        />
      </View>

      {/* scanning overlay */}
      <Modal visible={!!scanning} transparent animationType="fade">
        <View style={styles.scanRoot}>
          <View style={styles.scanCard}>
            <ScanLine color={C.cyan} />
            <Pulse>
              <Ionicons name={(EVIDENCE_META[scanning?.kind ?? 'document']?.icon ?? 'search') as any} size={34} color={C.cyan} />
            </Pulse>
            <Text style={styles.scanTitle}>QUERYING SOURCE</Text>
            <Text style={styles.scanSub}>{EVIDENCE_META[scanning?.kind ?? 'document']?.label ?? ''}</Text>
          </View>
        </View>
      </Modal>

      {/* found overlay */}
      <Modal visible={!!found} transparent animationType="fade" onRequestClose={() => setFound(null)}>
        <View style={styles.scanRoot}>
          <Animated.View entering={FadeInUp.springify().damping(16)} style={styles.foundCard}>
            <LinearGradient colors={[(EVIDENCE_META[found?.kind ?? 'document']?.color ?? C.cyan) + '22', 'rgba(10,14,22,0.98)']} style={StyleSheet.absoluteFill} />
            <Chip label="New exhibit recovered" color={EVIDENCE_META[found?.kind ?? 'document']?.color ?? C.cyan} filled icon="sparkles" />
            <Text style={styles.foundTitle}>{found?.title}</Text>
            <Text style={styles.foundSource}>{found?.source}</Text>
            <Text style={styles.foundSummary}>{found?.summary}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <PrimaryButton label="EXAMINE" icon="eye" small color={C.cyan} style={{ flex: 1 }}
                onPress={() => { const id = found!.id; setFound(null); navigation.navigate('EvidenceDetail', { evidenceId: id }); }} />
              <PrimaryButton label="LATER" small color={C.textDim} style={{ flex: 1 }} onPress={() => setFound(null)} />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */

function StripItem({ icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <View style={styles.stripItem}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.stripVal, { color }]}>{value}</Text>
      <Text style={styles.stripLabel}>{label}</Text>
    </View>
  );
}

function EvidenceTab({
  cf, pr, onSearch, onOpen, interrogated,
}: { cf: any; pr: any; onSearch: (k: string) => void; onOpen: (id: string) => void; interrogated: string[] }) {
  const kinds = useMemo(() => {
    const map: Record<string, { total: number; found: number; avail: number; locked: number }> = {};
    cf.evidence.forEach((e: Evidence) => {
      const k = e.kind;
      if (!map[k]) map[k] = { total: 0, found: 0, avail: 0, locked: 0 };
      map[k].total++;
      if (pr.discovered.includes(e.id)) map[k].found++;
      else if (isEvidenceUnlocked(e, pr.discovered, interrogated)) map[k].avail++;
      else map[k].locked++;
    });
    return Object.entries(map);
  }, [cf, pr.discovered, interrogated]);

  const discovered = cf.evidence.filter((e: Evidence) => pr.discovered.includes(e.id));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
      <SectionLabel text="Sources — tap to query" color={C.cyan} />
      <View style={styles.sourceGrid}>
        {kinds.map(([k, v]) => {
          const m = EVIDENCE_META[k];
          const exhausted = v.found >= v.total;
          const blocked = !exhausted && v.avail === 0;
          return (
            <Touch key={k} onPress={() => onSearch(k)} sfx="tap" style={{ width: (width - 32 - 10) / 2 }}>
              <View style={[styles.source, { borderColor: exhausted ? C.hairline : m.color + '44' }, exhausted && { opacity: 0.45 }]}>
                <LinearGradient colors={[m.color + '14', 'transparent']} style={StyleSheet.absoluteFill} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={m.icon as any} size={17} color={m.color} />
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.sourceCount, { color: m.color }]}>{v.found}/{v.total}</Text>
                </View>
                <Text style={[styles.sourceLabel, { color: m.color }]} numberOfLines={2}>{m.label.toUpperCase()}</Text>
                <Text style={styles.sourceState}>
                  {exhausted ? 'EXHAUSTED' : blocked ? 'NEEDS GROUNDWORK' : `${v.avail} AVAILABLE`}
                </Text>
              </View>
            </Touch>
          );
        })}
      </View>

      <SectionLabel text={`Recovered · ${discovered.length}`} color={C.amber} />
      {discovered.length === 0 ? (
        <EmptyState icon="file-tray" title="EVIDENCE LOCKER EMPTY" body="Query a source above to begin recovering exhibits." />
      ) : (
        discovered.map((e: Evidence, i: number) => {
          const m = EVIDENCE_META[e.kind];
          const analysed = pr.analysed.includes(e.id);
          const rel = analysed && e.analysis?.upgradesTo ? e.analysis.upgradesTo : e.reliability;
          const relColor = rel === 'verified' ? C.green : rel === 'tampered' ? C.red : rel === 'partial' ? C.amber : C.textFaint;
          return (
            <Animated.View key={e.id} entering={FadeIn.delay(i * 30)}>
              <Touch onPress={() => onOpen(e.id)} sfx="select">
                <View style={styles.evRow}>
                  <View style={[styles.evIcon, { borderColor: m.color + '55', backgroundColor: m.color + '12' }]}>
                    <Ionicons name={m.icon as any} size={16} color={m.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.evTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.evSummary} numberOfLines={2}>{e.summary}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                      <Chip label={rel} color={relColor} small filled={rel === 'tampered'} />
                      {e.slotIndex !== null && <Chip label={e.timeLabel} color={C.textDim} small />}
                      {e.slotIndex === cf.crimeSlotIndex && <Chip label="crime window" color={C.red} small />}
                      {!analysed && <Chip label="unanalysed" color={C.violet} small />}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.textFaint} />
                </View>
              </Touch>
            </Animated.View>
          );
        })
      )}
    </ScrollView>
  );
}

function TimelineTab({ cf, pr, contradictions }: { cf: any; pr: any; contradictions: any[] }) {
  const [sel, setSel] = useState<{ sid: string; slot: number } | null>(null);
  const locName = (id: string) => cf.locations.find((l: any) => l.id === id)?.name ?? '?';
  const short = (n: string) => n.split(',')[0].split(' — ')[0].slice(0, 16);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
      <SectionLabel text="Stated movements" color={C.cyan} />
      <Text style={styles.tlHelp}>
        Each row is one account of the evening. Red cells are claims your evidence has already falsified.
        The highlighted column is the crime window.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 96 }} />
            {cf.slots.map((s: any) => (
              <View key={s.index} style={[styles.tlHeadCell, s.index === cf.crimeSlotIndex && styles.tlCrimeCol]}>
                <Text style={[styles.tlHeadText, s.index === cf.crimeSlotIndex && { color: C.red }]}>{s.label}</Text>
              </View>
            ))}
          </View>
          {cf.suspects.map((sus: any) => (
            <View key={sus.id} style={{ flexDirection: 'row' }}>
              <View style={styles.tlNameCell}>
                <Text style={styles.tlName} numberOfLines={2}>{sus.name}</Text>
              </View>
              {cf.slots.map((slot: any) => {
                const st = cf.statements.find((x: any) => x.suspectId === sus.id && x.slotIndex === slot.index);
                const cx = contradictions.find((c: any) => c.suspectId === sus.id && c.slotIndex === slot.index);
                const broken = pr.suspectStates[sus.id]?.brokenStatements.includes(st?.id);
                return (
                  <Touch key={slot.index} onPress={() => setSel({ sid: sus.id, slot: slot.index })} sfx="tap">
                    <View style={[
                      styles.tlCell,
                      slot.index === cf.crimeSlotIndex && styles.tlCrimeCol,
                      cx && { borderColor: C.red + '99', backgroundColor: 'rgba(255,77,94,0.14)' },
                      broken && !cx && { borderColor: C.amber + '77' },
                    ]}>
                      <Text style={[styles.tlCellText, cx && { color: C.red }]} numberOfLines={2}>
                        {short(locName(st?.claimedLocationId ?? ''))}
                      </Text>
                      {cx && <Ionicons name="warning" size={9} color={C.red} style={{ marginTop: 2 }} />}
                    </View>
                  </Touch>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {sel && (() => {
        const st = cf.statements.find((x: any) => x.suspectId === sel.sid && x.slotIndex === sel.slot);
        const sus = cf.suspects.find((x: any) => x.id === sel.sid);
        const cx = contradictions.filter((c: any) => c.suspectId === sel.sid && c.slotIndex === sel.slot);
        const broken = pr.suspectStates[sel.sid]?.brokenStatements.includes(st?.id);
        return (
          <Animated.View entering={FadeIn} style={{ marginTop: 16 }}>
            <GlassCard accent={cx.length ? C.red : C.cyan} style={{ padding: 15 }}>
              <Text style={styles.stHead}>{sus.name} · {cf.slots[sel.slot].label}</Text>
              <Text style={styles.stQuote}>"{broken && st.revisedText ? st.revisedText : st.text}"</Text>
              {broken && <Chip label="Account revised under pressure" color={C.amber} small filled style={{ alignSelf: 'flex-start', marginTop: 8 }} />}
              {cx.map((c: any) => (
                <View key={c.id} style={styles.cxBox}>
                  <Ionicons name="flash" size={13} color={C.red} />
                  <Text style={styles.cxText}>
                    Claimed {c.claimedLocation}. Evidence places them at {c.actualLocation}. {c.note}
                  </Text>
                </View>
              ))}
            </GlassCard>
          </Animated.View>
        );
      })()}

      <SectionLabel text="Contradiction log" color={C.red} />
      {contradictions.length === 0 ? (
        <EmptyState icon="shield-checkmark" title="NO CONTRADICTIONS YET" body="Every account still stands. Recover more evidence and test it against the statements." />
      ) : (
        contradictions.map((c: any) => {
          const sus = cf.suspects.find((s: any) => s.id === c.suspectId);
          const sevColor = c.severity === 'critical' ? C.red : c.severity === 'material' ? C.amber : C.textDim;
          return (
            <View key={c.id} style={[styles.cxRow, { borderColor: sevColor + '55' }]}>
              <Chip label={c.severity} color={sevColor} filled small />
              <Text style={styles.cxRowText}>
                <Text style={{ color: C.text, fontWeight: '700' }}>{sus?.name}</Text>
                {' '}— {cf.slots[c.slotIndex].label}: claimed {c.claimedLocation}, placed at {c.actualLocation}.
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  timer: { color: C.text, fontSize: 14, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  timerSub: { color: C.textFaint, fontSize: 8, letterSpacing: 1, fontFamily: MONO, marginTop: 2 },
  strip: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: C.hairline, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  stripItem: { flex: 1, alignItems: 'center' },
  stripVal: { fontSize: 13, fontWeight: '900', fontFamily: MONO, marginTop: 3 },
  stripLabel: { color: C.textFaint, fontSize: 7, letterSpacing: 1, marginTop: 2, fontFamily: MONO },
  portraitBox: {
    width: 96, height: 112, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'flex-end', borderWidth: 1, borderColor: C.hairline,
  },
  sName: { color: C.text, fontSize: 15, fontWeight: '800', flexShrink: 1 },
  sRole: { color: C.cyan, fontSize: 10.5, marginTop: 3, fontFamily: MONO },
  sRel: { color: C.textFaint, fontSize: 10.5, marginTop: 2, textTransform: 'capitalize' },
  sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  source: {
    borderRadius: 13, borderWidth: 1, padding: 13, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.025)', minHeight: 92, justifyContent: 'space-between',
  },
  sourceCount: { fontSize: 11, fontWeight: '900', fontFamily: MONO },
  sourceLabel: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1.1, marginTop: 8, fontFamily: MONO },
  sourceState: { color: C.textFaint, fontSize: 8, letterSpacing: 1, marginTop: 4, fontFamily: MONO },
  evRow: {
    flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 12,
    borderWidth: 1, borderColor: C.hairline, marginBottom: 9, backgroundColor: 'rgba(255,255,255,0.025)',
  },
  evIcon: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  evTitle: { color: C.text, fontSize: 12.5, fontWeight: '700' },
  evSummary: { color: C.textDim, fontSize: 11, marginTop: 3, lineHeight: 16 },
  tlHelp: { color: C.textFaint, fontSize: 10.5, lineHeight: 16, marginBottom: 14 },
  tlHeadCell: { width: 78, alignItems: 'center', paddingVertical: 7 },
  tlHeadText: { color: C.textDim, fontSize: 10, fontWeight: '800', fontFamily: MONO },
  tlCrimeCol: { backgroundColor: 'rgba(255,77,94,0.07)' },
  tlNameCell: { width: 96, justifyContent: 'center', paddingRight: 8 },
  tlName: { color: C.text, fontSize: 10.5, fontWeight: '700' },
  tlCell: {
    width: 74, height: 52, marginHorizontal: 2, marginVertical: 3, borderRadius: 8, borderWidth: 1,
    borderColor: C.hairline, alignItems: 'center', justifyContent: 'center', padding: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tlCellText: { color: C.textDim, fontSize: 8.5, textAlign: 'center', lineHeight: 11 },
  stHead: { color: C.cyan, fontSize: 11, fontWeight: '900', letterSpacing: 1.3, fontFamily: MONO },
  stQuote: { color: C.text, fontSize: 13.5, lineHeight: 20, marginTop: 9, fontStyle: 'italic' },
  cxBox: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: 11, padding: 10, borderRadius: 9,
    backgroundColor: 'rgba(255,77,94,0.09)', borderWidth: 1, borderColor: C.red + '44',
  },
  cxText: { color: C.text, fontSize: 11.5, marginLeft: 8, flex: 1, lineHeight: 17 },
  cxRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 10,
    borderWidth: 1, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  cxRowText: { color: C.textDim, fontSize: 11.5, flex: 1, lineHeight: 17 },
  notesBox: {
    borderRadius: 12, borderWidth: 1, borderColor: C.hairline, backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12, minHeight: 120,
  },
  notes: { color: C.text, fontSize: 13, minHeight: 100, lineHeight: 20, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 16 },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: C.hairline,
    backgroundColor: 'rgba(14,18,27,0.96)', paddingVertical: 8, marginBottom: 8,
  },
  tabItem: { alignItems: 'center', paddingVertical: 3 },
  tabLabel: { fontSize: 7.5, letterSpacing: 1, fontWeight: '900', marginTop: 4, fontFamily: MONO },
  tabDot: { width: 14, height: 2, borderRadius: 1, backgroundColor: C.cyan, marginTop: 4 },
  scanRoot: { flex: 1, backgroundColor: 'rgba(3,5,9,0.92)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  scanCard: {
    width: '100%', maxWidth: 340, alignItems: 'center', padding: 34, borderRadius: 18,
    borderWidth: 1, borderColor: C.cyan + '44', backgroundColor: 'rgba(10,14,22,0.96)', overflow: 'hidden',
  },
  scanTitle: { color: C.cyan, fontSize: 11, fontWeight: '900', letterSpacing: 2.4, marginTop: 16, fontFamily: MONO },
  scanSub: { color: C.textFaint, fontSize: 10.5, marginTop: 6 },
  foundCard: {
    width: '100%', maxWidth: 380, padding: 22, borderRadius: 18, borderWidth: 1,
    borderColor: C.hairlineStrong, overflow: 'hidden', backgroundColor: 'rgba(10,14,22,0.98)',
  },
  foundTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginTop: 14 },
  foundSource: { color: C.textFaint, fontSize: 10.5, marginTop: 4, fontFamily: MONO },
  foundSummary: { color: C.textDim, fontSize: 12.5, marginTop: 12, lineHeight: 19 },
});
