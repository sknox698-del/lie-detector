import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, FadeIn } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../lib/theme';
import { Evidence } from '../lib/types';
import { Chip, MONO, Touch, SectionLabel } from './ui';
import SceneImage from './SceneImage';
import { Audio } from '../lib/audio';
import { Haptics } from '../lib/haptics';

/* ------------------------------------------------------------------ */
/*  Messages                                                           */
/* ------------------------------------------------------------------ */

function MessagesViewer({ ev }: { ev: Evidence }) {
  const [recovered, setRecovered] = useState<number[]>([]);
  const thread = ev.payload.thread ?? [];
  return (
    <View>
      <View style={styles.phoneHead}>
        <Ionicons name="person-circle" size={26} color={C.cyan} />
        <View style={{ marginLeft: 9, flex: 1 }}>
          <Text style={styles.phoneName}>{ev.payload.contact}</Text>
          <Text style={styles.phoneSub}>Extracted from {ev.payload.holder}'s handset</Text>
        </View>
        <Ionicons name="lock-open" size={14} color={C.textFaint} />
      </View>
      {thread.map((m: any, i: number) => {
        const mine = m.from === 'me';
        const hidden = m.deleted && !recovered.includes(i);
        return (
          <Pressable
            key={i}
            disabled={!m.deleted}
            onPress={() => {
              if (!m.deleted) return;
              Audio.play('discover'); Haptics.medium();
              setRecovered((r) => [...r, i]);
            }}
            style={[styles.msgRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}
          >
            <View style={[
              styles.bubble,
              mine ? styles.bubbleMine : styles.bubbleTheirs,
              hidden && styles.bubbleDeleted,
            ]}>
              <Text style={[styles.msgText, hidden && { color: C.textFaint, fontStyle: 'italic' }]}>
                {hidden ? 'Message deleted — tap to recover' : m.text}
              </Text>
              <View style={styles.msgMeta}>
                <Text style={styles.msgTime}>{m.time}</Text>
                {m.deleted && (
                  <Chip small label={recovered.includes(i) ? 'recovered' : 'deleted'} color={recovered.includes(i) ? C.green : C.red} style={{ marginLeft: 6 }} />
                )}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Calls                                                              */
/* ------------------------------------------------------------------ */

function CallsViewer({ ev }: { ev: Evidence }) {
  const rows = ev.payload.rows ?? [];
  return (
    <View>
      <SectionLabel text={`Carrier log · ${ev.payload.holder}`} color={C.green} />
      {rows.map((r: any, i: number) => (
        <View key={i} style={[styles.row, r.flagged && styles.rowFlag]}>
          <View style={[styles.callIcon, { borderColor: r.direction === 'Missed' ? C.red + '66' : C.green + '55' }]}>
            <Ionicons
              name={(r.direction === 'Incoming' ? 'arrow-down' : r.direction === 'Missed' ? 'close' : 'arrow-up') as any}
              size={13}
              color={r.direction === 'Missed' ? C.red : C.green}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{r.name}</Text>
            <Text style={styles.rowSub}>{r.number} · {r.direction}</Text>
            {r.cell ? <Text style={styles.rowCell}>Cell site: {r.cell}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.rowTime, r.flagged && { color: C.amber }]}>{r.time}</Text>
            <Text style={styles.rowSub}>{r.duration}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Photo — pinch, pan, rotate, hotspots, metadata                     */
/* ------------------------------------------------------------------ */

function PhotoViewer({ ev, kindHint }: { ev: Evidence; kindHint: string }) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const stx = useSharedValue(0);
  const sty = useSharedValue(0);
  const rot = useSharedValue(0);
  const srot = useSharedValue(0);
  const [active, setActive] = useState<number | null>(null);
  const [meta, setMeta] = useState(false);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => { scale.value = Math.max(1, Math.min(4, saved.value * e.scale)); })
    .onEnd(() => { saved.value = scale.value; });
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value <= 1.02) return;
      tx.value = stx.value + e.translationX;
      ty.value = sty.value + e.translationY;
    })
    .onEnd(() => { stx.value = tx.value; sty.value = ty.value; });
  const rotate = Gesture.Rotation()
    .onUpdate((e) => { rot.value = srot.value + (e.rotation * 180) / Math.PI; })
    .onEnd(() => { srot.value = rot.value; });
  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    scale.value = withSpring(1); saved.value = 1;
    tx.value = withSpring(0); ty.value = withSpring(0); stx.value = 0; sty.value = 0;
    rot.value = withTiming(0); srot.value = 0;
  });
  const composed = Gesture.Simultaneous(pinch, pan, rotate, doubleTap);

  const imgStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value }, { translateY: ty.value },
      { scale: scale.value }, { rotate: `${rot.value}deg` },
    ],
  }));

  const hotspots = ev.payload.hotspots ?? [];

  return (
    <View>
      <View style={styles.photoFrame}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[{ flex: 1 }, imgStyle]}>
            <SceneImage kind={kindHint} seed={ev.id.length * 977 + ev.title.length * 31} height={230} timestamp={ev.timeLabel} />
            {hotspots.map((h: any, i: number) => (
              <Pressable
                key={i}
                onPress={() => { Audio.play('shutter'); Haptics.light(); setActive(active === i ? null : i); }}
                style={[styles.hotspot, { left: `${h.x * 100}%`, top: `${h.y * 100}%`, borderColor: active === i ? C.amber : C.cyan }]}
              >
                <View style={[styles.hotspotDot, { backgroundColor: active === i ? C.amber : C.cyan }]} />
              </Pressable>
            ))}
          </Animated.View>
        </GestureDetector>
        <View style={styles.photoHud} pointerEvents="none">
          <Text style={styles.photoHudText}>{ev.timeLabel}</Text>
          <Text style={styles.photoHudText}>PINCH · ROTATE · DOUBLE-TAP RESET</Text>
        </View>
      </View>

      {active !== null && hotspots[active] && (
        <Animated.View entering={FadeIn} style={styles.hotspotCard}>
          <Text style={styles.hotspotTitle}>{hotspots[active].label.toUpperCase()}</Text>
          <Text style={styles.hotspotBody}>{hotspots[active].detail}</Text>
        </Animated.View>
      )}

      <Text style={styles.caption}>{ev.payload.caption}</Text>

      <Touch onPress={() => setMeta((m) => !m)} sfx="tap">
        <View style={styles.metaToggle}>
          <Ionicons name="information-circle-outline" size={14} color={C.amber} />
          <Text style={styles.metaToggleText}>{meta ? 'HIDE METADATA' : 'INSPECT METADATA'}</Text>
          <Ionicons name={meta ? 'chevron-up' : 'chevron-down'} size={14} color={C.amber} />
        </View>
      </Touch>
      {meta && (
        <Animated.View entering={FadeIn} style={styles.metaBox}>
          {Object.entries(ev.payload.metadata ?? {}).map(([k, v]) => (
            <View key={k} style={styles.metaRow}>
              <Text style={styles.metaKey}>{k}</Text>
              <Text style={styles.metaVal}>{String(v)}</Text>
            </View>
          ))}
        </Animated.View>
      )}
      {hotspots.length > 0 && (
        <Text style={styles.hint}>{hotspots.length} points of interest detected — tap the markers.</Text>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Footage                                                            */
/* ------------------------------------------------------------------ */

function FootageViewer({ ev, kindHint }: { ev: Evidence; kindHint: string }) {
  const frames = ev.payload.frames ?? [];
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  React.useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setIdx((i) => {
        if (i >= frames.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 1100 / speed);
    return () => clearInterval(iv);
  }, [playing, speed, frames.length]);

  const f = frames[idx] ?? {};

  return (
    <View>
      <View style={styles.cctvFrame}>
        <SceneImage
          kind={kindHint}
          seed={(ev.id.length + idx) * 613 + ev.title.length}
          height={190}
          figure={!f.gap}
          mono
          dim={f.gap ? 0.75 : 0}
        />
        <View style={styles.cctvOverlay} pointerEvents="none">
          <View style={styles.cctvTopRow}>
            <View style={styles.recDot} />
            <Text style={styles.cctvText}>{ev.payload.camera}</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.cctvText}>{ev.payload.resolution}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.cctvTopRow}>
            <Text style={styles.cctvText}>{ev.payload.location}</Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.cctvText, f.gap && { color: C.red }]}>{f.time}</Text>
          </View>
        </View>
        {f.gap && (
          <View style={styles.gapBadge} pointerEvents="none">
            <Text style={styles.gapText}>SIGNAL LOST</Text>
          </View>
        )}
      </View>

      <View style={styles.scrubTrack}>
        {frames.map((fr: any, i: number) => (
          <Pressable
            key={i}
            onPress={() => { Audio.play('tap'); setIdx(i); setPlaying(false); }}
            style={[
              styles.scrubSeg,
              { backgroundColor: fr.gap ? C.red + '55' : i <= idx ? C.violet : 'rgba(255,255,255,0.08)' },
            ]}
          />
        ))}
      </View>

      <View style={styles.transport}>
        <Touch onPress={() => { setIdx(0); setPlaying(false); }} sfx="tap"><View style={styles.tBtn}><Ionicons name="play-skip-back" size={15} color={C.text} /></View></Touch>
        <Touch onPress={() => { setIdx((i) => Math.max(0, i - 1)); setPlaying(false); }} sfx="tap"><View style={styles.tBtn}><Ionicons name="play-back" size={15} color={C.text} /></View></Touch>
        <Touch onPress={() => setPlaying((p) => !p)} sfx="select" haptic="medium">
          <View style={[styles.tBtn, styles.tBtnMain]}><Ionicons name={playing ? 'pause' : 'play'} size={18} color={C.violet} /></View>
        </Touch>
        <Touch onPress={() => { setIdx((i) => Math.min(frames.length - 1, i + 1)); setPlaying(false); }} sfx="tap"><View style={styles.tBtn}><Ionicons name="play-forward" size={15} color={C.text} /></View></Touch>
        <Touch onPress={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))} sfx="tap">
          <View style={styles.tBtn}><Text style={styles.speedText}>{speed}x</Text></View>
        </Touch>
      </View>

      <View style={[styles.frameNote, f.gap && { borderColor: C.red + '55' }]}>
        <Text style={styles.frameTime}>{f.time}</Text>
        <Text style={[styles.frameDesc, f.gap && { color: C.red }]}>{f.desc}</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Financial                                                          */
/* ------------------------------------------------------------------ */

function FinancialViewer({ ev }: { ev: Evidence }) {
  const rows = ev.payload.rows ?? [];
  return (
    <View>
      <View style={styles.bankHead}>
        <View>
          <Text style={styles.bankName}>{ev.payload.holder}</Text>
          <Text style={styles.bankAcct}>{ev.payload.account}</Text>
        </View>
        <Ionicons name="card" size={22} color={C.gold} />
      </View>
      {ev.payload.note ? <Text style={styles.bankNote}>{ev.payload.note}</Text> : null}
      <View style={styles.tableHead}>
        <Text style={[styles.th, { width: 54 }]}>TIME</Text>
        <Text style={[styles.th, { flex: 1 }]}>MERCHANT</Text>
        <Text style={[styles.th, { width: 74, textAlign: 'right' }]}>AMOUNT</Text>
      </View>
      {rows.map((r: any, i: number) => (
        <View key={i} style={[styles.trow, r.flagged && styles.rowFlag]}>
          <Text style={[styles.td, { width: 54, color: r.flagged ? C.amber : C.textDim }]}>{r.time}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.td, { color: C.text }]}>{r.merchant}</Text>
            <Text style={styles.tdSub}>{r.method}</Text>
          </View>
          <Text style={[styles.td, { width: 74, textAlign: 'right', color: String(r.amount).startsWith('-') ? C.red : C.text }]}>
            {String(r.amount).startsWith('-') ? '' : '−'}{r.amount}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Social                                                             */
/* ------------------------------------------------------------------ */

function SocialViewer({ ev }: { ev: Evidence }) {
  return (
    <View>
      <View style={styles.socialHead}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(ev.payload.author ?? '@').slice(1, 3).toUpperCase()}</Text></View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.socialAuthor}>{ev.payload.author}</Text>
          <Text style={styles.socialMeta}>{ev.payload.platform} · {ev.payload.time}{ev.payload.geo ? ` · ${ev.payload.geo}` : ''}</Text>
        </View>
      </View>
      <Text style={styles.socialText}>{ev.payload.text}</Text>
      {ev.payload.geo ? (
        <View style={styles.geoTag}>
          <Ionicons name="location" size={12} color="#FF7AC8" />
          <Text style={styles.geoText}>{ev.payload.geo}</Text>
        </View>
      ) : null}
      {ev.payload.deletedAfter ? (
        <View style={styles.deletedTag}>
          <Ionicons name="trash" size={11} color={C.red} />
          <Text style={styles.deletedText}>{ev.payload.deletedAfter}</Text>
        </View>
      ) : null}
      <SectionLabel text="Replies" color={C.textFaint} />
      {(ev.payload.comments ?? []).map((c: any, i: number) => (
        <View key={i} style={styles.comment}>
          <Text style={styles.commentAuthor}>{c.author}</Text>
          <Text style={styles.commentText}>{c.text}</Text>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Witness / Physical / Document                                      */
/* ------------------------------------------------------------------ */

function WitnessViewer({ ev }: { ev: Evidence }) {
  return (
    <View>
      <View style={styles.witnessHead}>
        <Ionicons name="ear" size={18} color="#7FE3B0" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.witnessName}>{ev.payload.witness}</Text>
          <Text style={styles.witnessRole}>{ev.payload.role}</Text>
        </View>
      </View>
      <Text style={styles.quote}>{ev.payload.text}</Text>
      {(ev.payload.caveats ?? []).length > 0 && (
        <>
          <SectionLabel text="Reliability notes" color={C.amber} />
          {ev.payload.caveats.map((c: string, i: number) => (
            <View key={i} style={styles.caveat}>
              <Ionicons name="alert-circle-outline" size={13} color={C.amber} />
              <Text style={styles.caveatText}>{c}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function PhysicalViewer({ ev }: { ev: Evidence }) {
  return (
    <View>
      <View style={styles.exhibitHead}>
        <Ionicons name="finger-print" size={22} color={C.red} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.exhibitItem}>{ev.payload.item}</Text>
          <Text style={styles.exhibitLoc}>Recovered at {ev.payload.recoveredAt}</Text>
        </View>
      </View>
      <SectionLabel text="Findings" color={C.red} />
      {(ev.payload.findings ?? []).map((f: string, i: number) => (
        <View key={i} style={styles.finding}>
          <Text style={styles.findingNum}>{String(i + 1).padStart(2, '0')}</Text>
          <Text style={styles.findingText}>{f}</Text>
        </View>
      ))}
      <SectionLabel text="Chain of custody" color={C.textFaint} />
      <View style={styles.chain}>
        {(ev.payload.chain ?? []).map((c: string, i: number) => (
          <View key={i} style={styles.chainItem}>
            <View style={styles.chainDot} />
            <Text style={styles.chainText}>{c}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DocumentViewer({ ev }: { ev: Evidence }) {
  return (
    <View style={styles.doc}>
      <View style={styles.docHead}>
        <Text style={styles.docType}>{ev.payload.docType ?? 'DOCUMENT'}</Text>
        <Text style={styles.docRef}>REF {ev.id.toUpperCase()}</Text>
      </View>
      {(ev.payload.lines ?? []).map((l: string, i: number) => (
        <Text key={i} style={styles.docLine}>{l}</Text>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */

export default function EvidenceBody({ ev, locationKind }: { ev: Evidence; locationKind: string }) {
  switch (ev.kind) {
    case 'messages': return <MessagesViewer ev={ev} />;
    case 'calls': return <CallsViewer ev={ev} />;
    case 'photo': return <PhotoViewer ev={ev} kindHint={locationKind} />;
    case 'footage': return <FootageViewer ev={ev} kindHint={locationKind} />;
    case 'financial': return <FinancialViewer ev={ev} />;
    case 'social': return <SocialViewer ev={ev} />;
    case 'witness': return <WitnessViewer ev={ev} />;
    case 'physical': return <PhysicalViewer ev={ev} />;
    default: return <DocumentViewer ev={ev} />;
  }
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  phoneHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.hairline, marginBottom: 12 },
  phoneName: { color: C.text, fontSize: 13, fontWeight: '700' },
  phoneSub: { color: C.textFaint, fontSize: 10, marginTop: 1 },
  msgRow: { flexDirection: 'row', marginBottom: 8 },
  bubble: { maxWidth: '82%', paddingVertical: 9, paddingHorizontal: 13, borderRadius: 15, borderWidth: 1 },
  bubbleMine: { backgroundColor: 'rgba(62,232,255,0.13)', borderColor: 'rgba(62,232,255,0.3)', borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: C.hairline, borderBottomLeftRadius: 4 },
  bubbleDeleted: { borderStyle: 'dashed', borderColor: C.red + '77', backgroundColor: 'rgba(255,77,94,0.06)' },
  msgText: { color: C.text, fontSize: 13, lineHeight: 18 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  msgTime: { color: C.textFaint, fontSize: 9, fontFamily: MONO },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.hairline },
  rowFlag: { backgroundColor: 'rgba(255,177,60,0.07)', borderRadius: 8, paddingHorizontal: 8, borderBottomColor: 'transparent' },
  callIcon: { width: 30, height: 30, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  rowTitle: { color: C.text, fontSize: 12.5, fontWeight: '600' },
  rowSub: { color: C.textFaint, fontSize: 10, marginTop: 1 },
  rowCell: { color: C.cyan, fontSize: 9.5, marginTop: 2, fontFamily: MONO },
  rowTime: { color: C.textDim, fontSize: 12, fontFamily: MONO, fontWeight: '700' },

  photoFrame: { height: 230, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.hairlineStrong, backgroundColor: '#05070A' },
  photoHud: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', padding: 8, backgroundColor: 'rgba(0,0,0,0.45)' },
  photoHudText: { color: C.textDim, fontSize: 8.5, fontFamily: MONO, letterSpacing: 1 },
  hotspot: { position: 'absolute', width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginLeft: -13, marginTop: -13 },
  hotspotDot: { width: 6, height: 6, borderRadius: 3 },
  hotspotCard: { marginTop: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.amber + '55', backgroundColor: 'rgba(255,177,60,0.08)' },
  hotspotTitle: { color: C.amber, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4, fontFamily: MONO },
  hotspotBody: { color: C.text, fontSize: 12.5, lineHeight: 18 },
  caption: { color: C.textDim, fontSize: 12, fontStyle: 'italic', marginTop: 12, lineHeight: 18 },
  metaToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginTop: 8, borderRadius: 9, borderWidth: 1, borderColor: C.amber + '44' },
  metaToggleText: { color: C.amber, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginHorizontal: 8, fontFamily: MONO },
  metaBox: { marginTop: 8, padding: 12, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: C.hairline },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaKey: { color: C.textFaint, fontSize: 10.5, fontFamily: MONO, letterSpacing: 0.8 },
  metaVal: { color: C.text, fontSize: 10.5, fontFamily: MONO },
  hint: { color: C.textFaint, fontSize: 10.5, marginTop: 10, textAlign: 'center' },

  cctvFrame: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.violet + '44' },
  cctvOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, padding: 9 },
  cctvTopRow: { flexDirection: 'row', alignItems: 'center' },
  cctvText: { color: '#B8C8DC', fontSize: 9, fontFamily: MONO, letterSpacing: 1, textShadowColor: '#000', textShadowRadius: 3 },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red, marginRight: 6 },
  gapBadge: { position: 'absolute', top: '44%', left: 0, right: 0, alignItems: 'center' },
  gapText: { color: C.red, fontSize: 13, fontWeight: '900', letterSpacing: 3, fontFamily: MONO },
  scrubTrack: { flexDirection: 'row', marginTop: 10, gap: 3 },
  scrubSeg: { flex: 1, height: 6, borderRadius: 3 },
  transport: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, marginTop: 12 },
  tBtn: { width: 40, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.hairline, backgroundColor: 'rgba(255,255,255,0.04)' },
  tBtnMain: { width: 52, height: 40, borderColor: C.violet + '66', backgroundColor: 'rgba(164,123,255,0.12)' },
  speedText: { color: C.text, fontSize: 11, fontFamily: MONO, fontWeight: '700' },
  frameNote: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.hairline, backgroundColor: 'rgba(0,0,0,0.3)' },
  frameTime: { color: C.violet, fontSize: 10, fontFamily: MONO, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  frameDesc: { color: C.text, fontSize: 12.5, lineHeight: 18 },

  bankHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.hairline },
  bankName: { color: C.text, fontSize: 13, fontWeight: '700' },
  bankAcct: { color: C.textFaint, fontSize: 11, fontFamily: MONO, marginTop: 2 },
  bankNote: { color: C.amber, fontSize: 11.5, marginTop: 10, lineHeight: 17, fontStyle: 'italic' },
  tableHead: { flexDirection: 'row', paddingVertical: 9, marginTop: 6, borderBottomWidth: 1, borderBottomColor: C.hairline },
  th: { color: C.textFaint, fontSize: 8.5, letterSpacing: 1.4, fontWeight: '800', fontFamily: MONO },
  trow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(140,170,210,0.07)' },
  td: { fontSize: 11.5, fontFamily: MONO },
  tdSub: { color: C.textFaint, fontSize: 9.5, marginTop: 1 },

  socialHead: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,122,200,0.15)', borderWidth: 1, borderColor: '#FF7AC855', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FF7AC8', fontSize: 12, fontWeight: '800', fontFamily: MONO },
  socialAuthor: { color: C.text, fontSize: 13, fontWeight: '700' },
  socialMeta: { color: C.textFaint, fontSize: 10, marginTop: 1 },
  socialText: { color: C.text, fontSize: 14, lineHeight: 21, marginTop: 12 },
  geoTag: { flexDirection: 'row', alignItems: 'center', marginTop: 10, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 6, backgroundColor: 'rgba(255,122,200,0.1)' },
  geoText: { color: '#FF7AC8', fontSize: 10.5, marginLeft: 5, fontFamily: MONO },
  deletedTag: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  deletedText: { color: C.red, fontSize: 10.5, marginLeft: 5 },
  comment: { paddingVertical: 7, borderTopWidth: 1, borderTopColor: 'rgba(140,170,210,0.07)' },
  commentAuthor: { color: C.textDim, fontSize: 10.5, fontWeight: '700' },
  commentText: { color: C.text, fontSize: 12, marginTop: 2 },

  witnessHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.hairline },
  witnessName: { color: C.text, fontSize: 13, fontWeight: '700' },
  witnessRole: { color: C.textFaint, fontSize: 10.5, marginTop: 1, textTransform: 'capitalize' },
  quote: { color: C.text, fontSize: 14, lineHeight: 22, marginVertical: 14, fontStyle: 'italic', paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#7FE3B0' },
  caveat: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
  caveatText: { color: C.textDim, fontSize: 11.5, marginLeft: 7, flex: 1, lineHeight: 17 },

  exhibitHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.hairline, marginBottom: 4 },
  exhibitItem: { color: C.text, fontSize: 13.5, fontWeight: '700', textTransform: 'capitalize' },
  exhibitLoc: { color: C.textFaint, fontSize: 10.5, marginTop: 2 },
  finding: { flexDirection: 'row', marginBottom: 9 },
  findingNum: { color: C.red, fontSize: 10, fontFamily: MONO, fontWeight: '800', width: 22, marginTop: 1 },
  findingText: { color: C.text, fontSize: 12.5, flex: 1, lineHeight: 18 },
  chain: { paddingLeft: 4 },
  chainItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  chainDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.textFaint, marginRight: 9 },
  chainText: { color: C.textDim, fontSize: 11.5 },

  doc: { padding: 14, borderRadius: 10, backgroundColor: 'rgba(159,182,214,0.06)', borderWidth: 1, borderColor: C.hairline },
  docHead: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.hairline, marginBottom: 12 },
  docType: { color: '#9FB6D6', fontSize: 9.5, fontWeight: '800', letterSpacing: 2, fontFamily: MONO },
  docRef: { color: C.textFaint, fontSize: 9.5, fontFamily: MONO },
  docLine: { color: C.text, fontSize: 12.5, lineHeight: 21, marginBottom: 6, fontFamily: MONO },
});
