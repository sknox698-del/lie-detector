import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, DIFFICULTY_META } from '../lib/theme';
import { AppHeader, Chip, GlassCard, MONO, PrimaryButton, ScanLine, Screen, SectionLabel, Touch } from '../components/ui';
import Portrait from '../components/Portrait';
import { useGame } from '../lib/store';
import { Audio } from '../lib/audio';

export default function BriefingScreen({ navigation, route }: any) {
  const { active, profile, resumeCase } = useGame();
  const insets = useSafeAreaInsets();
  const { seed, difficulty, mode } = route.params ?? {};

  useEffect(() => {
    if (!active || active.cf.seed !== seed || active.progress.completed) {
      resumeCase(seed, difficulty, mode ?? 'standard');
    }
  }, [seed, active?.cf.seed, active?.progress.completed]);

  useEffect(() => { Audio.play('whoosh'); }, []);

  const cf = active?.cf;
  const meta = useMemo(() => DIFFICULTY_META[(difficulty ?? 'Beginner') as keyof typeof DIFFICULTY_META], [difficulty]);

  if (!cf) {
    return (
      <Screen>
        <AppHeader title="Loading case" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.textFaint, fontFamily: MONO, fontSize: 11, letterSpacing: 2 }}>COMPILING CASE FILE…</Text>
        </View>
      </Screen>
    );
  }

  const quality = profile.settings.graphics;

  return (
    <Screen gradient={['#05070B', '#0C1119', '#06080D']}>
      <AppHeader
        title={`Case ${cf.code}`}
        subtitle={cf.caseType}
        onBack={() => navigation.goBack()}
        accent={meta.color}
        right={<Chip label={cf.difficulty} color={meta.color} filled small />}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(500)}>
          <View style={styles.hero}>
            <LinearGradient colors={[meta.color + '22', 'transparent']} style={StyleSheet.absoluteFill} />
            <ScanLine color={meta.color} />
            <Text style={styles.heroKicker}>{cf.subtitle}</Text>
            <Text style={styles.heroTitle}>{cf.title}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="location" size={12} color={C.textDim} />
              <Text style={styles.heroMeta}>{cf.locationName}</Text>
            </View>
            <View style={styles.heroMetaRow}>
              <Ionicons name="calendar" size={12} color={C.textDim} />
              <Text style={styles.heroMeta}>{cf.dateLabel}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120)}>
          <SectionLabel text="Incident report" color={meta.color} />
          <GlassCard style={{ padding: 16 }}>
            <Text style={styles.briefText}>{cf.briefing}</Text>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180)}>
          <SectionLabel text="Victim" color={C.red} />
          <GlassCard accent={C.red} style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.victimIcon}>
              <Ionicons name="alert" size={18} color={C.red} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.victimName}>{cf.victimName}</Text>
              <Text style={styles.victimDetail}>{cf.victimDetail}</Text>
            </View>
            <Text style={styles.crimeTime}>{cf.slots[cf.crimeSlotIndex].label}</Text>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240)}>
          <SectionLabel text={`Persons of interest · ${cf.suspects.length}`} color={C.cyan} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
            {cf.suspects.map((s) => (
              <View key={s.id} style={styles.suspectCard}>
                <View style={styles.portraitWrap}>
                  <LinearGradient colors={['rgba(62,232,255,0.10)', 'transparent']} style={StyleSheet.absoluteFill} />
                  <Portrait face={s.face} emotion="calm" size={110} quality={quality} animated={quality !== 'Low'} />
                </View>
                <Text style={styles.suspectName} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.suspectRole} numberOfLines={1}>{s.occupation}</Text>
                <Text style={styles.suspectRel} numberOfLines={1}>{s.relationToVictim}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)}>
          <SectionLabel text="Objectives" color={C.amber} />
          <GlassCard style={{ padding: 14 }}>
            {cf.objectives.map((o, i) => (
              <View key={o.id} style={styles.objRow}>
                <View style={styles.objNum}><Text style={styles.objNumText}>{i + 1}</Text></View>
                <Text style={styles.objText}>{o.label}</Text>
              </View>
            ))}
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(360)}>
          <SectionLabel text="Standing orders" color={C.textFaint} />
          <View style={styles.orders}>
            <Order text="Body language is a clue, never a verdict. Nervous people are not automatically liars." />
            <Order text="An unverified exhibit proves nothing. Run forensic analysis before you rely on it." />
            <Order text="Presence at a scene is not presence at the offence. Check the timestamp against the crime window." />
            <Order text="One account will fail against the record. Find it." />
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <LinearGradient colors={['transparent', 'rgba(5,7,11,0.96)']} style={StyleSheet.absoluteFill} />
        <PrimaryButton
          label="OPEN INVESTIGATION"
          icon="search"
          color={meta.color}
          onPress={() => navigation.navigate('Investigation')}
          sublabel={`${cf.evidence.length} exhibits · ${cf.suspects.length} suspects · crime window ${cf.slots[cf.crimeSlotIndex].label}`}
        />
      </View>
    </Screen>
  );
}

function Order({ text }: { text: string }) {
  return (
    <View style={styles.orderRow}>
      <View style={styles.orderDot} />
      <Text style={styles.orderText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 16, borderWidth: 1, borderColor: C.hairlineStrong, padding: 20, overflow: 'hidden',
    backgroundColor: 'rgba(10,14,22,0.7)',
  },
  heroKicker: { color: C.textFaint, fontSize: 9.5, letterSpacing: 3, fontWeight: '800', fontFamily: MONO },
  heroTitle: { color: C.text, fontSize: 26, fontWeight: '900', marginTop: 8, letterSpacing: -0.4, lineHeight: 30 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  heroMeta: { color: C.textDim, fontSize: 11.5, marginLeft: 7 },
  briefText: { color: C.text, fontSize: 13.5, lineHeight: 22 },
  victimIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,77,94,0.12)', borderWidth: 1, borderColor: C.red + '55',
  },
  victimName: { color: C.text, fontSize: 15, fontWeight: '800' },
  victimDetail: { color: C.textFaint, fontSize: 11, marginTop: 2 },
  crimeTime: { color: C.red, fontSize: 15, fontWeight: '900', fontFamily: MONO },
  suspectCard: {
    width: 128, borderRadius: 14, borderWidth: 1, borderColor: C.hairline, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)', paddingBottom: 11,
  },
  portraitWrap: { height: 132, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  suspectName: { color: C.text, fontSize: 12, fontWeight: '800', paddingHorizontal: 10, marginTop: 6 },
  suspectRole: { color: C.cyan, fontSize: 9.5, paddingHorizontal: 10, marginTop: 2, fontFamily: MONO },
  suspectRel: { color: C.textFaint, fontSize: 9.5, paddingHorizontal: 10, marginTop: 2, textTransform: 'capitalize' },
  objRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  objNum: {
    width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.amber + '55', backgroundColor: 'rgba(255,177,60,0.1)', marginRight: 11,
  },
  objNumText: { color: C.amber, fontSize: 10, fontWeight: '900', fontFamily: MONO },
  objText: { color: C.text, fontSize: 12.5, flex: 1 },
  orders: { paddingHorizontal: 4 },
  orderRow: { flexDirection: 'row', marginBottom: 10 },
  orderDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.textFaint, marginTop: 7, marginRight: 10 },
  orderText: { color: C.textDim, fontSize: 11.5, flex: 1, lineHeight: 18 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 26 },
});
