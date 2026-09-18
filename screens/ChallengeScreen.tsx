import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Platform } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, DIFFICULTY_META } from '../lib/theme';
import { AppHeader, Chip, GlassCard, MONO, PrimaryButton, Screen, SectionLabel, Touch, EmptyState } from '../components/ui';
import { useGame } from '../lib/store';
import { caseCode, parseCaseCode } from '../lib/rng';
import { generateCase, DIFFICULTY_ORDER } from '../lib/generator';
import { Difficulty } from '../lib/types';
import { formatTime } from '../lib/scoring';

export default function ChallengeScreen({ navigation }: any) {
  const { profile, showToast } = useGame();
  const insets = useSafeAreaInsets();
  const unlocked = profile.unlockedDifficulties;
  const [difficulty, setDifficulty] = useState<Difficulty>(unlocked[unlocked.length - 1] ?? 'Beginner');
  const [nonce, setNonce] = useState(0);
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const generated = useMemo(() => {
    const seed = (Math.floor(Math.random() * 0xffffffff) ^ (nonce * 2654435761)) >>> 0;
    const cf = generateCase(seed, difficulty);
    return cf;
  }, [difficulty, nonce]);

  const parsed = useMemo(() => parseCaseCode(input), [input]);
  const previewIncoming = useMemo(() => {
    if (!parsed) return null;
    const d = DIFFICULTY_ORDER[parsed.difficultyIndex];
    if (!d) return null;
    return generateCase(parsed.seed, d);
  }, [parsed]);

  const challengeText = useMemo(() => ([
    'LIE DETECTOR — CHALLENGE',
    `“${generated.title}” · ${generated.caseType}`,
    `Difficulty: ${generated.difficulty}`,
    `${generated.suspects.length} suspects · ${generated.evidence.length} exhibits`,
    '',
    `CASE CODE: ${generated.code}`,
    '',
    'Same suspects. Same evidence. Same lie.',
    'Beat my rank.',
  ].join('\n')), [generated]);

  const copy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      showToast('Challenge copied. Send it to anyone.', 'good');
      setTimeout(() => setCopied(false), 2200);
    } catch { showToast('Clipboard unavailable.', 'bad'); }
  };

  const myResults = profile.history.slice(0, 8);

  return (
    <Screen gradient={['#07050F', '#0C0A18', '#05070B']}>
      <AppHeader title="Challenge a Friend" subtitle="Same case, same evidence, no server required" accent={C.violet} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>

        <SectionLabel text="Create a challenge" color={C.violet} />
        <View style={styles.diffRow}>
          {DIFFICULTY_ORDER.map((d) => {
            const locked = !unlocked.includes(d);
            const on = difficulty === d;
            const meta = DIFFICULTY_META[d];
            return (
              <Touch key={d} onPress={() => !locked && setDifficulty(d)} sfx="tap" disabled={locked}>
                <View style={[styles.diffPill, {
                  borderColor: on ? meta.color : C.hairline,
                  backgroundColor: on ? meta.color + '1E' : 'transparent',
                }, locked && { opacity: 0.3 }]}>
                  <Text style={[styles.diffText, { color: on ? meta.color : C.textDim }]}>{d.slice(0, 4).toUpperCase()}</Text>
                </View>
              </Touch>
            );
          })}
        </View>

        <Animated.View entering={FadeIn} key={generated.code}>
          <GlassCard accent={C.violet} glow style={{ padding: 18 }}>
            <Text style={styles.codeLabel}>CASE CODE</Text>
            <Text style={styles.code}>{generated.code}</Text>
            <View style={styles.codeMeta}>
              <Chip label={generated.difficulty} color={DIFFICULTY_META[generated.difficulty].color} filled small />
              <Chip label={`${generated.suspects.length} suspects`} color={C.textDim} small />
              <Chip label={`${generated.evidence.length} exhibits`} color={C.textDim} small />
            </View>
            <Text style={styles.caseTitle}>{generated.title}</Text>
            <Text style={styles.caseIncident} numberOfLines={2}>{generated.incident}</Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <PrimaryButton label={copied ? 'COPIED' : 'COPY CHALLENGE'} icon={copied ? 'checkmark' : 'copy'} color={C.violet} small style={{ flex: 1 }} onPress={() => copy(challengeText)} />
              <PrimaryButton label="NEW" icon="dice" color={C.textDim} small style={{ width: 92 }} onPress={() => setNonce((n) => n + 1)} />
            </View>
            <PrimaryButton
              label="SOLVE IT FIRST"
              icon="play"
              color={C.cyan}
              small
              style={{ marginTop: 10 }}
              onPress={() =>
                navigation.navigate('Briefing', { seed: generated.seed, difficulty: generated.difficulty, mode: 'challenge', resume: true })
              }
            />
          </GlassCard>
        </Animated.View>

        <SectionLabel text="Accept a challenge" color={C.cyan} />
        <View style={styles.inputBox}>
          <Ionicons name="key" size={16} color={C.cyan} />
          <TextInput
            style={styles.input}
            placeholder="XXXX-XXXX"
            placeholderTextColor={C.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            value={input}
            onChangeText={(v) => setInput(v.toUpperCase().slice(0, 9))}
            maxLength={9}
            returnKeyType="go"
          />
          {parsed ? <Ionicons name="checkmark-circle" size={18} color={C.green} /> : input.length > 0 ? <Ionicons name="close-circle" size={18} color={C.red} /> : null}
        </View>

        {previewIncoming ? (
          <Animated.View entering={FadeInDown}>
            <GlassCard accent={C.cyan} style={{ padding: 16, marginTop: 12 }}>
              <Text style={styles.caseTitle}>{previewIncoming.title}</Text>
              <Text style={styles.caseIncident}>{previewIncoming.incident}</Text>
              <View style={styles.codeMeta}>
                <Chip label={previewIncoming.difficulty} color={DIFFICULTY_META[previewIncoming.difficulty].color} filled small />
                <Chip label={`${previewIncoming.suspects.length} suspects`} color={C.textDim} small />
              </View>
              <PrimaryButton
                label="TAKE THE CASE"
                icon="enter"
                color={C.cyan}
                small
                style={{ marginTop: 14 }}
                onPress={() =>
                  navigation.navigate('Briefing', { seed: previewIncoming.seed, difficulty: previewIncoming.difficulty, mode: 'challenge', resume: true })
                }
              />
            </GlassCard>
          </Animated.View>
        ) : input.length > 0 ? (
          <Text style={styles.badCode}>That code is not valid. Codes look like ABCD-EFGH.</Text>
        ) : null}

        <SectionLabel text="Your comparable results" color={C.textFaint} />
        {myResults.length === 0 ? (
          <EmptyState icon="podium" title="NO RESULTS YET" body="Close a case and your result card appears here, ready to compare." />
        ) : (
          myResults.map((r) => (
            <View key={r.at} style={styles.resRow}>
              <View style={[styles.rankPill, { borderColor: (DIFFICULTY_META[r.difficulty]?.color ?? C.cyan) + '66' }]}>
                <Text style={[styles.rankPillText, { color: DIFFICULTY_META[r.difficulty]?.color ?? C.cyan }]}>{r.rank}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.resTitle} numberOfLines={1}>{r.title}</Text>
                <Text style={styles.resMeta}>{r.code} · {r.score} pts · {formatTime(r.timeMs)} · {r.evidenceFound}/{r.evidenceTotal}</Text>
              </View>
              <Touch onPress={() => copy(`LIE DETECTOR — ${r.title}\nCase ${r.code} (${r.difficulty})\nRANK ${r.rank} · ${r.score} pts · ${formatTime(r.timeMs)}\nBeat it.`)} sfx="tap">
                <Ionicons name="share-social" size={17} color={C.violet} />
              </Touch>
            </View>
          ))
        )}

        <View style={styles.note}>
          <Ionicons name="information-circle" size={14} color={C.textFaint} />
          <Text style={styles.noteText}>
            Case codes are deterministic. Anyone who enters the same code receives an identical case — the same
            suspects, the same evidence, the same lie — with no network connection required.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  diffRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  diffPill: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 9, borderWidth: 1 },
  diffText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, fontFamily: MONO },
  codeLabel: { color: C.textFaint, fontSize: 8.5, letterSpacing: 2.4, fontWeight: '900', fontFamily: MONO },
  code: { color: C.violet, fontSize: 34, fontWeight: '900', letterSpacing: 4, fontFamily: MONO, marginTop: 8 },
  codeMeta: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  caseTitle: { color: C.text, fontSize: 17, fontWeight: '800', marginTop: 14 },
  caseIncident: { color: C.textDim, fontSize: 12, marginTop: 6, lineHeight: 18 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 15, paddingVertical: 13,
    borderRadius: 12, borderWidth: 1, borderColor: C.hairlineStrong, backgroundColor: 'rgba(0,0,0,0.3)',
  },
  input: {
    flex: 1, color: C.text, fontSize: 20, letterSpacing: 3, fontFamily: MONO, fontWeight: '800',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  badCode: { color: C.red, fontSize: 11, marginTop: 9 },
  resRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 11, borderWidth: 1,
    borderColor: C.hairline, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.025)',
  },
  rankPill: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rankPillText: { fontSize: 15, fontWeight: '900', fontFamily: MONO },
  resTitle: { color: C.text, fontSize: 12.5, fontWeight: '700' },
  resMeta: { color: C.textFaint, fontSize: 10, marginTop: 3, fontFamily: MONO },
  note: { flexDirection: 'row', marginTop: 22, paddingHorizontal: 4 },
  noteText: { color: C.textFaint, fontSize: 11, marginLeft: 9, flex: 1, lineHeight: 17 },
});
