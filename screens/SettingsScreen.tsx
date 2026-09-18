import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Modal } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../lib/theme';
import { AppHeader, Chip, GlassCard, MONO, PrimaryButton, Screen, SectionLabel, Touch } from '../components/ui';
import { useGame } from '../lib/store';
import { LANGUAGES } from '../lib/i18n';
import { Audio } from '../lib/audio';
import { Haptics } from '../lib/haptics';

export default function SettingsScreen({ navigation }: any) {
  const { profile, updateSettings, resetAll, showToast } = useGame();
  const insets = useSafeAreaInsets();
  const s = profile.settings;
  const [confirmReset, setConfirmReset] = useState(false);

  const Toggle = ({ label, desc, value, onChange, icon, color = C.cyan }: any) => (
    <View style={styles.row}>
      <Ionicons name={icon} size={17} color={color} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, marginLeft: 13 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { onChange(v); Audio.play('tap'); Haptics.select(); }}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: color + '66' }}
        thumbColor={value ? color : '#7A8699'}
      />
    </View>
  );

  const Segmented = ({ label, desc, options, value, onChange, icon, color = C.cyan }: any) => (
    <View style={[styles.row, { flexDirection: 'column', alignItems: 'stretch' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={icon} size={17} color={color} />
        <View style={{ flex: 1, marginLeft: 13 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowDesc}>{desc}</Text>
        </View>
      </View>
      <View style={styles.segRow}>
        {options.map((o: any) => {
          const on = value === o.value;
          return (
            <Touch key={o.value} onPress={() => { onChange(o.value); }} sfx="tap" style={{ flex: 1 }}>
              <View style={[styles.seg, { borderColor: on ? color : C.hairline, backgroundColor: on ? color + '1E' : 'transparent' }]}>
                <Text style={[styles.segText, { color: on ? color : C.textDim }]}>{o.label}</Text>
              </View>
            </Touch>
          );
        })}
      </View>
    </View>
  );

  return (
    <Screen>
      <AppHeader title="Settings" subtitle="Audio, graphics, accessibility, data" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>

        <SectionLabel text="Audio" color={C.green} />
        <GlassCard style={{ padding: 6 }}>
          <Toggle icon="volume-high" color={C.green} label="Sound effects" desc="Interface, evidence and interrogation cues." value={s.sfx} onChange={(v: boolean) => updateSettings({ sfx: v })} />
          <Toggle icon="musical-notes" color={C.green} label="Adaptive score" desc="Music intensifies on discoveries and contradictions." value={s.music} onChange={(v: boolean) => updateSettings({ music: v })} />
          <Toggle icon="phone-portrait" color={C.green} label="Haptics" desc="Physical feedback on key moments." value={s.haptics} onChange={(v: boolean) => updateSettings({ haptics: v })} />
        </GlassCard>

        <SectionLabel text="Graphics" color={C.violet} />
        <GlassCard style={{ padding: 6 }}>
          <Segmented
            icon="sparkles" color={C.violet}
            label="Graphics quality"
            desc="Lower settings disable facial micro-animation and shading passes to save battery."
            value={s.graphics}
            onChange={(v: any) => updateSettings({ graphics: v })}
            options={[{ label: 'LOW', value: 'Low' }, { label: 'MED', value: 'Medium' }, { label: 'HIGH', value: 'High' }, { label: 'ULTRA', value: 'Ultra' }]}
          />
          <Toggle icon="film" color={C.violet} label="Film grain" desc="Cinematic grain and scanline overlay." value={s.grain} onChange={(v: boolean) => updateSettings({ grain: v })} />
          <Toggle icon="accessibility" color={C.violet} label="Reduce motion" desc="Disables idle sway, breathing and parallax." value={s.reduceMotion} onChange={(v: boolean) => updateSettings({ reduceMotion: v })} />
        </GlassCard>

        <SectionLabel text="Gameplay" color={C.cyan} />
        <GlassCard style={{ padding: 6 }}>
          <Segmented
            icon="text" color={C.cyan}
            label="Dialogue speed"
            desc="How quickly interview responses are typed out."
            value={s.textSpeed}
            onChange={(v: any) => updateSettings({ textSpeed: v })}
            options={[{ label: 'SLOW', value: 'slow' }, { label: 'NORMAL', value: 'normal' }, { label: 'FAST', value: 'fast' }, { label: 'INSTANT', value: 'instant' }]}
          />
          <Toggle icon="eye" color={C.cyan} label="Body language readout" desc="Show observation notes during interviews. Tells are clues, never proof." value={s.showTells} onChange={(v: boolean) => updateSettings({ showTells: v })} />
          <Toggle icon="chatbox" color={C.cyan} label="Emotion subtitles" desc="Label the emotional read under each response." value={s.subtitles} onChange={(v: boolean) => updateSettings({ subtitles: v })} />
          <Toggle icon="contrast" color={C.cyan} label="High contrast" desc="Stronger separation between text and surfaces." value={s.highContrast} onChange={(v: boolean) => updateSettings({ highContrast: v })} />
        </GlassCard>

        <SectionLabel text="Language" color={C.amber} />
        <GlassCard style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LANGUAGES.map((l) => (
              <Touch key={l.code} onPress={() => { updateSettings({ language: l.code }); showToast('Language preference saved.', 'good'); }} sfx="tap">
                <View style={[styles.lang, s.language === l.code && { borderColor: C.amber, backgroundColor: C.amber + '1A' }]}>
                  <Text style={[styles.langText, s.language === l.code && { color: C.amber }]}>{l.label}</Text>
                </View>
              </Touch>
            ))}
          </View>
          <Text style={styles.langNote}>
            Interface strings resolve through a locale layer. Case narration is generated in English at present;
            additional narration locales can be added without code changes.
          </Text>
        </GlassCard>

        <SectionLabel text="Data" color={C.red} />
        <GlassCard style={{ padding: 14 }}>
          <Text style={styles.dataText}>
            All progress is stored on this device and works offline. The save format is a single versioned
            document, ready to be synchronised to a cloud profile.
          </Text>
          <PrimaryButton label="RESET ALL PROGRESS" icon="trash" color={C.red} small style={{ marginTop: 14 }} onPress={() => setConfirmReset(true)} />
        </GlassCard>

        <View style={styles.about}>
          <Text style={styles.aboutTitle}>LIE DETECTOR</Text>
          <Text style={styles.aboutText}>Everyone has a story. Only one version survives the evidence.</Text>
          <Text style={styles.aboutVersion}>v1.0.0 · procedural case engine · offline capable</Text>
        </View>
      </ScrollView>

      <Modal visible={confirmReset} transparent animationType="fade" onRequestClose={() => setConfirmReset(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <Ionicons name="warning" size={30} color={C.red} />
            <Text style={styles.modalTitle}>ERASE EVERYTHING?</Text>
            <Text style={styles.modalBody}>
              This deletes your rank, statistics, commendations, archive and all case progress. It cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' }}>
              <PrimaryButton label="CANCEL" color={C.textDim} small style={{ flex: 1 }} onPress={() => setConfirmReset(false)} />
              <PrimaryButton label="ERASE" color={C.red} small style={{ flex: 1 }} onPress={() => { resetAll(); setConfirmReset(false); showToast('All progress erased.', 'bad'); navigation.navigate('Menu'); }} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', padding: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(140,170,210,0.07)' },
  rowLabel: { color: C.text, fontSize: 13, fontWeight: '700' },
  rowDesc: { color: C.textFaint, fontSize: 10.5, marginTop: 3, lineHeight: 15 },
  segRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  seg: { paddingVertical: 9, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  segText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1, fontFamily: MONO },
  lang: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 9, borderWidth: 1, borderColor: C.hairline },
  langText: { color: C.textDim, fontSize: 11.5, fontWeight: '700' },
  langNote: { color: C.textFaint, fontSize: 10.5, marginTop: 12, lineHeight: 16 },
  dataText: { color: C.textDim, fontSize: 11.5, lineHeight: 17 },
  about: { alignItems: 'center', marginTop: 30 },
  aboutTitle: { color: C.text, fontSize: 15, fontWeight: '900', letterSpacing: 3.4, fontFamily: MONO },
  aboutText: { color: C.textFaint, fontSize: 11, marginTop: 7, fontStyle: 'italic', textAlign: 'center' },
  aboutVersion: { color: C.textFaint, fontSize: 9, marginTop: 10, letterSpacing: 1.2, fontFamily: MONO },
  modalRoot: { flex: 1, backgroundColor: 'rgba(3,5,9,0.92)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  modalCard: {
    width: '100%', maxWidth: 360, alignItems: 'center', padding: 26, borderRadius: 18,
    borderWidth: 1, borderColor: C.red + '55', backgroundColor: '#10070A',
  },
  modalTitle: { color: C.red, fontSize: 13, fontWeight: '900', letterSpacing: 2, marginTop: 14, fontFamily: MONO },
  modalBody: { color: C.textDim, fontSize: 12.5, textAlign: 'center', marginTop: 12, lineHeight: 19 },
});
