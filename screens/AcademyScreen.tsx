import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../lib/theme';
import { AppHeader, Chip, GlassCard, MONO, PrimaryButton, Screen, SectionLabel, Touch } from '../components/ui';
import Portrait from '../components/Portrait';
import { useGame } from '../lib/store';
import { makeFace } from '../lib/data/people';
import { RNG, hashString } from '../lib/rng';
import { generateCase } from '../lib/generator';

const { width } = Dimensions.get('window');

const LESSONS = [
  {
    icon: 'document-text', color: '#3EE8FF', title: 'THE CASE FILE',
    body: 'Every case fixes an incident to one place and one thirty-minute window. That window is the only one that matters. Everything else is context, colour, and noise.',
    points: [
      'Read the scene report first. It fixes the crime window.',
      'Note the crime location. Presence there matters only inside the window.',
      'Suspects, statements and exhibits are generated fresh for every case.',
    ],
  },
  {
    icon: 'people', color: '#7FE3B0', title: 'THE INTERVIEW',
    body: 'Suspects remember what they told you. Ask the same question twice and you may get consistency, drift, defensiveness, or a new detail. Pressure raises stress and lowers trust; rapport does the reverse.',
    points: [
      'Rapport opens people up. Pressure cracks them — and sometimes closes them.',
      'High stress makes secret-keepers confess things that have nothing to do with the crime.',
      'A suspect who revises their story under pressure has not confessed to anything.',
    ],
  },
  {
    icon: 'eye', color: '#FFB13C', title: 'BODY LANGUAGE IS NOT PROOF',
    body: 'Sweating, breaking eye contact, folding the arms — these are signals of pressure, not deceit. Innocent people under suspicion produce every single one. Use tells to decide where to dig. Never to decide who did it.',
    points: [
      'Some personalities are almost unreadable. Some liars are calm.',
      'Grief, anxiety and hostility all look like guilt and are not.',
      'Only the record decides. Body language points the shovel.',
    ],
  },
  {
    icon: 'file-tray-full', color: '#A47BFF', title: 'EVIDENCE AND SOURCES',
    body: 'Query a source to recover exhibits: carrier records, financial disclosure, cameras, forensics, social media, witnesses. Some exhibits only surface after you have done other groundwork.',
    points: [
      'VERIFIED means an audited system of record. Trust it.',
      'UNVERIFIED means nothing until you run forensic analysis.',
      'TAMPERED exhibits are real and are designed to frame an innocent person.',
    ],
  },
  {
    icon: 'flash', color: '#FF4D5E', title: 'BREAKING AN ALIBI',
    body: 'A contradiction exists when a verified exhibit places a suspect somewhere their own statement denies. Present it to them in the interview and the statement breaks.',
    points: [
      'A contradiction INSIDE the crime window is material.',
      'A contradiction OUTSIDE it usually means a private embarrassment, not a crime.',
      'One suspect will have no verified alibi for the window. That is your person.',
    ],
  },
  {
    icon: 'git-network', color: '#F5D66E', title: 'THE BOARD AND THE CHARGE',
    body: 'Pin suspects and exhibits, draw links, and build the chain. When you file, you must name four things: who lied, what they lied about, why, and which single exhibit proves it.',
    points: [
      'Naming the right person is worth the most — but reasoning is scored too.',
      'A false charge costs points. The case can be reopened.',
      'S rank requires all four determinations, a near-complete file, and no false charges.',
    ],
  },
];

export default function AcademyScreen({ navigation }: any) {
  const { profile, markTutorialSeen } = useGame();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const lesson = LESSONS[step];

  const demoFaces = React.useMemo(() => {
    const rng = new RNG(4242);
    return [makeFace(rng, 34), makeFace(rng, 51), makeFace(rng, 27)];
  }, []);

  const startTrainingCase = () => {
    const seed = hashString('ACADEMY::TRAINING::' + profile.badgeSeed);
    markTutorialSeen();
    navigation.replace('Briefing', { seed, difficulty: 'Beginner', resume: true });
  };

  return (
    <Screen gradient={['#080B12', '#0C1119', '#05070B']}>
      <AppHeader
        title="Academy"
        subtitle={`Lesson ${step + 1} of ${LESSONS.length}`}
        accent={lesson.color}
        onBack={() => navigation.goBack()}
        right={<Chip label={`${step + 1}/${LESSONS.length}`} color={lesson.color} small filled />}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 130 }} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <Animated.View entering={FadeIn} style={styles.faces}>
            {demoFaces.map((f, i) => (
              <View key={i} style={styles.faceBox}>
                <LinearGradient colors={['rgba(62,232,255,0.10)', 'transparent']} style={StyleSheet.absoluteFill} />
                <Portrait face={f} emotion={(['nervous', 'confident', 'evasive'] as any)[i]} size={92} quality="High" />
              </View>
            ))}
          </Animated.View>
        )}

        <Animated.View entering={FadeInRight} key={lesson.title}>
          <GlassCard accent={lesson.color} glow style={{ padding: 20 }}>
            <View style={[styles.lessonIcon, { borderColor: lesson.color + '66', backgroundColor: lesson.color + '14' }]}>
              <Ionicons name={lesson.icon as any} size={22} color={lesson.color} />
            </View>
            <Text style={[styles.lessonTitle, { color: lesson.color }]}>{lesson.title}</Text>
            <Text style={styles.lessonBody}>{lesson.body}</Text>
            <View style={{ marginTop: 16 }}>
              {lesson.points.map((p, i) => (
                <View key={i} style={styles.pointRow}>
                  <View style={[styles.pointDot, { backgroundColor: lesson.color }]} />
                  <Text style={styles.pointText}>{p}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        <View style={styles.dots}>
          {LESSONS.map((l, i) => (
            <Touch key={i} onPress={() => setStep(i)} sfx="tap">
              <View style={[styles.dot, { backgroundColor: i === step ? lesson.color : 'rgba(255,255,255,0.15)', width: i === step ? 22 : 7 }]} />
            </Touch>
          ))}
        </View>

        {step === LESSONS.length - 1 && (
          <Animated.View entering={FadeIn}>
            <SectionLabel text="Ready" color={C.green} />
            <GlassCard accent={C.green} style={{ padding: 16 }}>
              <Text style={styles.readyText}>
                That is the whole method. Read the window, break an alibi, ignore the theatre, and name the account
that cannot survive the record.
              </Text>
            </GlassCard>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <LinearGradient colors={['transparent', 'rgba(5,7,11,0.98)']} style={StyleSheet.absoluteFill} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {step > 0 && <PrimaryButton label="BACK" color={C.textDim} small style={{ width: 92 }} onPress={() => setStep(step - 1)} />}
          {step < LESSONS.length - 1 ? (
            <PrimaryButton label="NEXT LESSON" icon="arrow-forward" color={lesson.color} small style={{ flex: 1 }} onPress={() => setStep(step + 1)} />
          ) : (
            <PrimaryButton label="START TRAINING CASE" icon="play" color={C.green} small style={{ flex: 1 }} onPress={startTrainingCase} sublabel="A Beginner case built for your first interrogation" />
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  faces: { flexDirection: 'row', gap: 10, marginBottom: 16, justifyContent: 'center' },
  faceBox: {
    width: (width - 32 - 20) / 3, height: 116, borderRadius: 13, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'flex-end', borderWidth: 1, borderColor: C.hairline,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  lessonIcon: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  lessonTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 2, fontFamily: MONO },
  lessonBody: { color: C.text, fontSize: 13.5, lineHeight: 21, marginTop: 12 },
  pointRow: { flexDirection: 'row', marginBottom: 10 },
  pointDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 7, marginRight: 11 },
  pointText: { color: C.textDim, fontSize: 12, flex: 1, lineHeight: 18 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: 22, alignItems: 'center' },
  dot: { height: 7, borderRadius: 4 },
  readyText: { color: C.text, fontSize: 13, lineHeight: 20 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 24 },
});
