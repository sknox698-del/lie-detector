import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Modal, Dimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, Line, RadialGradient, Rect, Stop, Polygon } from 'react-native-svg';
import { C, EVIDENCE_META } from '../lib/theme';
import {
  Screen, AppHeader, Chip, MONO, Touch, SectionLabel, Meter, Typewriter, EmptyState, PrimaryButton, Grain,
} from '../components/ui';
import Portrait from '../components/Portrait';
import { useGame } from '../lib/store';
import { QUESTIONS, askQuestion, presentEvidence, questionLabel, greetingFor, clamp } from '../lib/dialogue';
import { detectContradictions } from '../lib/generator';
import { DialogueTurn, Emotion, Evidence, SuspectState } from '../lib/types';
import { PERSONALITIES } from '../lib/data/people';
import { Audio } from '../lib/audio';
import { Haptics } from '../lib/haptics';

const { width } = Dimensions.get('window');

const EMOTION_COLOR: Record<Emotion, string> = {
  calm: '#7FE3B0', confident: '#3EE8FF', nervous: '#FFB13C', angry: '#FF4D5E',
  defensive: '#FF7A3C', confused: '#A47BFF', evasive: '#F5D66E', shocked: '#FF7AC8',
  emotional: '#8FE9FF', suspicious: '#C98A5B', broken: '#FF4D5E',
};

export default function InterrogationScreen({ navigation, route }: any) {
  const { active, profile, setSuspectState, addQuestion, addContradiction, showToast } = useGame();
  const insets = useSafeAreaInsets();
  const { suspectId } = route.params;
  const cf = active?.cf;
  const pr = active?.progress;
  const scrollRef = useRef<ScrollView>(null);
  const [evidenceModal, setEvidenceModal] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const shake = useSharedValue(0);

  const suspect = cf?.suspects.find((s) => s.id === suspectId);
  const state: SuspectState | undefined = pr?.suspectStates[suspectId];

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (!cf || !state || !suspect) return;
    if (state.log.length === 0) {
      const g = greetingFor(cf, suspect, state);
      setSuspectState(suspectId, { ...state, log: [g], lastEmotion: g.emotion ?? 'calm' });
      setSpeaking(true);
      setTimeout(() => setSpeaking(false), 1400);
    }
  }, [cf?.seed, suspectId]);

  const contradictions = useMemo(
    () => (cf && pr ? detectContradictions(cf, pr.discovered, pr.analysed).filter((c) => c.suspectId === suspectId) : []),
    [cf, pr?.discovered, pr?.analysed, suspectId]
  );

  if (!cf || !pr || !suspect || !state) {
    return (
      <Screen>
        <AppHeader title="Interview" onBack={() => navigation.goBack()} />
        <EmptyState icon="person" title="NO SUBJECT" body="This interview is not available." />
      </Screen>
    );
  }

  const ctx = {
    cf, suspect, state,
    discovered: pr.discovered,
    analysed: pr.analysed,
    interrogated: Object.entries(pr.suspectStates).filter(([, s]) => s.log.length > 0).map(([id]) => id),
  };

  const textSpeed = { slow: 30, normal: 16, fast: 7, instant: 0 }[profile.settings.textSpeed];

  const applyResult = (
    playerLine: string,
    res: ReturnType<typeof askQuestion>,
    qid?: string,
    extra?: Partial<SuspectState>
  ) => {
    const you: DialogueTurn = { id: `you_${Date.now()}`, speaker: 'you', text: playerLine };
    const next: SuspectState = {
      ...state,
      ...extra,
      trust: clamp(state.trust + res.delta.trust),
      stress: clamp(state.stress + res.delta.stress),
      cooperation: clamp(state.cooperation + res.delta.cooperation),
      log: [...state.log, you, ...res.turns],
      askedQuestions: qid ? { ...state.askedQuestions, [qid]: (state.askedQuestions[qid] ?? 0) + 1 } : state.askedQuestions,
      secretRevealed: state.secretRevealed || !!res.revealedSecret,
    };

    if (res.brokeStatement && !next.brokenStatements.includes(res.brokeStatement)) {
      next.brokenStatements = [...next.brokenStatements, res.brokeStatement];
    }
    const lastSuspectTurn = [...res.turns].reverse().find((t) => t.speaker === 'suspect');
    next.lastEmotion = lastSuspectTurn?.emotion ?? state.lastEmotion;

    setSuspectState(suspectId, next);
    setSpeaking(true);
    setTimeout(() => setSpeaking(false), Math.min(3200, 900 + (lastSuspectTurn?.text.length ?? 30) * 14));

    if (res.contradiction) {
      Audio.play('sting'); Haptics.error();
      shake.value = withSequence(withTiming(-7, { duration: 55 }), withTiming(7, { duration: 55 }), withTiming(-4, { duration: 55 }), withTiming(0, { duration: 55 }));
    } else if (res.revealedSecret) {
      Audio.play('discover'); Haptics.success();
      showToast(`${suspect.name} has admitted a false statement.`, 'good');
    } else {
      Audio.play('tap');
    }

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const onAsk = (qid: string, label: string) => {
    const res = askQuestion(ctx, qid);
    addQuestion();
    applyResult(label, res, qid);
  };

  const onPresent = (ev: Evidence) => {
    setEvidenceModal(false);
    const res = presentEvidence(ctx, ev);
    applyResult(
      `I'd like you to look at this. ${ev.title}.`,
      res,
      undefined,
      { presentedEvidence: [...state.presentedEvidence, ev.id] }
    );
    if (res.contradiction) {
      const cx = detectContradictions(cf, pr.discovered, pr.analysed)
        .find((c) => c.suspectId === suspectId && c.evidenceId === ev.id);
      if (cx) addContradiction(cx.id);
    }
  };

  const available = QUESTIONS.filter((q) => q.unlocked(ctx));
  const personality = PERSONALITIES[suspect.personality];
  const lastTurn = state.log[state.log.length - 1];
  const emotion = state.lastEmotion;
  const quality = profile.settings.graphics;
  const showTells = profile.settings.showTells;

  const discoveredEvidence = cf.evidence.filter((e) => pr.discovered.includes(e.id));

  return (
    <Screen gradient={['#05070B', '#0B0F17', '#05070B']} grain={profile.settings.grain}>
      <AppHeader
        title={suspect.name}
        subtitle={`${suspect.age} · ${suspect.occupation} · ${personality.label}`}
        onBack={() => navigation.goBack()}
        accent={EMOTION_COLOR[emotion]}
        right={<Chip label={emotion} color={EMOTION_COLOR[emotion]} filled small />}
      />

      {/* Interrogation room */}
      <Animated.View style={[styles.room, shakeStyle]}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <RadialGradient id="lamp" cx="50%" cy="-8%" r="72%">
              <Stop offset="0%" stopColor="#FFE9C4" stopOpacity="0.34" />
              <Stop offset="55%" stopColor="#FFE9C4" stopOpacity="0.06" />
              <Stop offset="100%" stopColor="#FFE9C4" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="cool" cx="86%" cy="18%" r="60%">
              <Stop offset="0%" stopColor="#3EE8FF" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#3EE8FF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="400" height="230" fill="#0A0E15" />
          <Rect x="0" y="0" width="400" height="150" fill="#111823" />
          {/* one-way mirror */}
          <Rect x="228" y="26" width="150" height="86" rx="3" fill="#0C141C" stroke="#243244" strokeWidth="2" />
          <Rect x="234" y="32" width="138" height="74" fill="#16222E" opacity="0.6" />
          <Line x1="234" y1="42" x2="372" y2="36" stroke="#3EE8FF" strokeWidth="0.8" opacity="0.25" />
          {/* wall panel lines */}
          {[0, 1, 2, 3].map((i) => (
            <Line key={i} x1={i * 58} y1={0} x2={i * 58} y2={150} stroke="#1B2532" strokeWidth="1.4" />
          ))}
          {/* table */}
          <Polygon points="30,230 370,230 322,152 78,152" fill="#171E28" />
          <Polygon points="30,230 370,230 356,214 44,214" fill="#0E141C" />
          <Rect x="0" y="148" width="400" height="4" fill="#0A0E14" />
          <Ellipse cx="200" cy="-10" rx="170" ry="130" fill="url(#lamp)" />
          <Rect x="0" y="0" width="400" height="230" fill="url(#cool)" />
        </Svg>

        <View style={styles.portraitStage}>
          <Portrait
            face={suspect.face}
            emotion={emotion}
            size={Math.min(240, width * 0.6)}
            stress={state.stress}
            quality={quality}
            animated={quality !== 'Low' && !profile.settings.reduceMotion}
            speaking={speaking}
          />
        </View>

        <View style={styles.roomHud}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Meter label="TRUST" value={state.trust} color={C.green} icon="heart" />
            <Meter label="STRESS" value={state.stress} color={C.red} icon="pulse" />
            <Meter label="COOP" value={state.cooperation} color={C.cyan} icon="hand-left" />
          </View>
        </View>

        {contradictions.length > 0 && (
          <View style={styles.cxBadge}>
            <Ionicons name="warning" size={11} color={C.red} />
            <Text style={styles.cxBadgeText}>{contradictions.length}</Text>
          </View>
        )}
        <Grain opacity={profile.settings.grain ? 0.1 : 0} seed={suspect.id.length * 13} />
      </Animated.View>

      {/* Observation */}
      {showTells && lastTurn?.tell && lastTurn.speaker === 'suspect' && (
        <Animated.View entering={FadeIn} key={lastTurn.id} style={styles.tellBar}>
          <Ionicons name="eye" size={12} color={EMOTION_COLOR[emotion]} />
          <Text style={[styles.tellText, { color: EMOTION_COLOR[emotion] }]} numberOfLines={2}>{lastTurn.tell}</Text>
        </Animated.View>
      )}

      {/* Dialogue log */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {state.log.map((turn, i) => {
          const isLast = i === state.log.length - 1;
          if (turn.speaker === 'system') {
            return (
              <Animated.View key={turn.id} entering={FadeInDown} style={styles.sysBox}>
                <Ionicons name="alert-circle" size={13} color={C.amber} />
                <Text style={styles.sysText}>{turn.text}</Text>
              </Animated.View>
            );
          }
          if (turn.speaker === 'you') {
            return (
              <Animated.View key={turn.id} entering={FadeInRight} style={styles.youRow}>
                <View style={styles.youBubble}>
                  <Text style={styles.youText}>{turn.text}</Text>
                </View>
                <View style={styles.youTag}><Ionicons name="shield" size={11} color={C.cyan} /></View>
              </Animated.View>
            );
          }
          const ec = EMOTION_COLOR[turn.emotion ?? 'calm'];
          return (
            <Animated.View key={turn.id} entering={FadeInDown} style={styles.themRow}>
              <View style={[styles.themTag, { borderColor: ec + '55' }]}>
                <View style={[styles.themDot, { backgroundColor: ec }]} />
              </View>
              <View style={[styles.themBubble, turn.isContradiction && { borderColor: C.red + '77', backgroundColor: 'rgba(255,77,94,0.08)' }]}>
                {isLast && textSpeed > 0 ? (
                  <Typewriter text={turn.text} speed={textSpeed} style={styles.themText} blip />
                ) : (
                  <Text style={styles.themText}>{turn.text}</Text>
                )}
                {profile.settings.subtitles && turn.emotion && (
                  <Text style={[styles.emoTag, { color: ec }]}>[{turn.emotion.toUpperCase()}]</Text>
                )}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Question deck */}
      <View style={[styles.deck, { paddingBottom: insets.bottom + 10 }]}>
        <LinearGradient colors={['transparent', 'rgba(5,7,11,0.98)', 'rgba(5,7,11,1)']} style={StyleSheet.absoluteFill} />
        <View style={styles.deckHead}>
          <Text style={styles.deckTitle}>QUESTIONS · {available.length}</Text>
          <Touch onPress={() => { setEvidenceModal(true); }} sfx="select" haptic="medium">
            <View style={styles.presentBtn}>
              <Ionicons name="documents" size={13} color={C.amber} />
              <Text style={styles.presentText}>PRESENT EVIDENCE ({discoveredEvidence.length})</Text>
            </View>
          </Touch>
        </View>
        <ScrollView
          style={{ maxHeight: 168 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 7 }}
          showsVerticalScrollIndicator={false}
        >
          {available.map((q) => {
            const label = questionLabel(q, cf);
            const asked = state.askedQuestions[q.id] ?? 0;
            const cat = q.category;
            const color = cat === 'pressure' ? C.red : cat === 'evidence' ? C.amber : cat === 'special' ? C.violet : C.cyan;
            return (
              <Touch key={q.id} onPress={() => onAsk(q.id, label)} sfx="tap">
                <View style={[styles.qRow, { borderColor: color + '33' }, asked > 0 && { opacity: 0.62 }]}>
                  <Ionicons name={q.icon as any} size={14} color={color} />
                  <Text style={styles.qText} numberOfLines={2}>{label}</Text>
                  {asked > 0 && <Text style={styles.qCount}>{asked}×</Text>}
                </View>
              </Touch>
            );
          })}
        </ScrollView>
      </View>

      {/* Evidence picker */}
      <Modal visible={evidenceModal} transparent animationType="slide" onRequestClose={() => setEvidenceModal(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>PRESENT TO {suspect.name.toUpperCase()}</Text>
              <Touch onPress={() => setEvidenceModal(false)} sfx="back"><Ionicons name="close" size={22} color={C.textDim} /></Touch>
            </View>
            <Text style={styles.modalHint}>
              Confronting a subject with an exhibit that falsifies their account will break the statement.
              Presenting an exhibit that supports them will build trust.
            </Text>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {discoveredEvidence.length === 0 && (
                <EmptyState icon="file-tray" title="NOTHING TO PRESENT" body="Recover exhibits from the Evidence tab first." />
              )}
              {discoveredEvidence.map((e) => {
                const m = EVIDENCE_META[e.kind];
                const used = state.presentedEvidence.includes(e.id);
                return (
                  <Touch key={e.id} onPress={() => onPresent(e)} sfx="select">
                    <View style={[styles.pickRow, used && { opacity: 0.5 }]}>
                      <Ionicons name={m.icon as any} size={16} color={m.color} />
                      <View style={{ flex: 1, marginLeft: 11 }}>
                        <Text style={styles.pickTitle} numberOfLines={1}>{e.title}</Text>
                        <Text style={styles.pickSub} numberOfLines={1}>{e.timeLabel} · {e.reliability}</Text>
                      </View>
                      {used && <Chip label="shown" color={C.textFaint} small />}
                    </View>
                  </Touch>
                );
              })}
            </ScrollView>
            <PrimaryButton label="CLOSE" small color={C.textDim} onPress={() => setEvidenceModal(false)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  room: { height: 230, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: C.hairline },
  portraitStage: { position: 'absolute', left: 0, right: 0, bottom: -10, alignItems: 'center' },
  roomHud: { position: 'absolute', left: 14, right: 14, bottom: 10 },
  cxBadge: {
    position: 'absolute', top: 12, right: 14, flexDirection: 'row', alignItems: 'center',
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, borderColor: C.red + '77',
    backgroundColor: 'rgba(255,77,94,0.16)',
  },
  cxBadgeText: { color: C.red, fontSize: 10, fontWeight: '900', marginLeft: 4, fontFamily: MONO },
  tellBar: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.hairline, backgroundColor: 'rgba(255,255,255,0.025)',
  },
  tellText: { fontSize: 11, marginLeft: 8, flex: 1, fontStyle: 'italic', lineHeight: 16 },
  youRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: 12 },
  youBubble: {
    maxWidth: '84%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14,
    borderBottomRightRadius: 4, backgroundColor: 'rgba(62,232,255,0.11)', borderWidth: 1, borderColor: C.cyan + '3A',
  },
  youText: { color: C.text, fontSize: 13, lineHeight: 19 },
  youTag: {
    width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.cyan + '44', marginLeft: 7, marginTop: 2,
  },
  themRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  themTag: {
    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginRight: 8, marginTop: 2,
  },
  themDot: { width: 7, height: 7, borderRadius: 3.5 },
  themBubble: {
    flex: 1, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, borderTopLeftRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: C.hairline,
  },
  themText: { color: C.text, fontSize: 13.5, lineHeight: 20 },
  emoTag: { fontSize: 8.5, letterSpacing: 1.4, marginTop: 7, fontFamily: MONO, fontWeight: '800' },
  sysBox: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 11, borderRadius: 10, marginBottom: 12,
    backgroundColor: 'rgba(255,177,60,0.08)', borderWidth: 1, borderColor: C.amber + '3A',
  },
  sysText: { color: C.amber, fontSize: 11.5, marginLeft: 8, flex: 1, lineHeight: 17 },
  deck: { borderTopWidth: 1, borderTopColor: C.hairline, paddingTop: 12 },
  deckHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  deckTitle: { color: C.textFaint, fontSize: 9, letterSpacing: 1.8, fontWeight: '900', flex: 1, fontFamily: MONO },
  presentBtn: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 11,
    borderRadius: 8, borderWidth: 1, borderColor: C.amber + '55', backgroundColor: 'rgba(255,177,60,0.1)',
  },
  presentText: { color: C.amber, fontSize: 8.5, fontWeight: '900', letterSpacing: 1, marginLeft: 6, fontFamily: MONO },
  qRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 13,
    borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  qText: { color: C.text, fontSize: 12.5, flex: 1, marginLeft: 10, lineHeight: 17 },
  qCount: { color: C.textFaint, fontSize: 9.5, fontFamily: MONO },
  modalRoot: { flex: 1, backgroundColor: 'rgba(3,5,9,0.92)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0D121B', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderTopWidth: 1, borderColor: C.hairlineStrong, padding: 20, paddingBottom: 34,
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { color: C.text, fontSize: 11.5, fontWeight: '900', letterSpacing: 1.6, flex: 1, fontFamily: MONO },
  modalHint: { color: C.textFaint, fontSize: 11, lineHeight: 16, marginBottom: 14 },
  pickRow: {
    flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 10,
    borderWidth: 1, borderColor: C.hairline, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.025)',
  },
  pickTitle: { color: C.text, fontSize: 12.5, fontWeight: '600' },
  pickSub: { color: C.textFaint, fontSize: 10, marginTop: 2, fontFamily: MONO },
});
