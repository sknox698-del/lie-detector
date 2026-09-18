import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS, FadeIn } from 'react-native-reanimated';
import Svg, { Line, Circle, Defs, LinearGradient as SvgLG, Stop, Path } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { C, EVIDENCE_META } from '../lib/theme';
import { BoardLink, BoardNode, CaseFile } from '../lib/types';
import { Chip, MONO, Touch, SectionLabel, EmptyState, PrimaryButton } from './ui';
import { Audio } from '../lib/audio';
import { Haptics } from '../lib/haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const BOARD_W = SCREEN_W - 32;
const BOARD_H = 520;
const NODE_W = 118;
const NODE_H = 58;

const LINK_COLORS = {
  connect: C.cyan,
  contradict: C.red,
  confirm: C.green,
};

export default function EvidenceBoard({
  cf, nodes, links, discovered, onChange,
}: {
  cf: CaseFile;
  nodes: BoardNode[];
  links: BoardLink[];
  discovered: string[];
  onChange: (nodes: BoardNode[], links: BoardLink[]) => void;
}) {
  const [picker, setPicker] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<BoardLink['type']>('connect');
  const [selected, setSelected] = useState<string | null>(null);

  const label = (n: BoardNode) => {
    if (n.kind === 'suspect') return cf.suspects.find((s) => s.id === n.refId)?.name ?? '?';
    if (n.kind === 'evidence') return cf.evidence.find((e) => e.id === n.refId)?.title ?? '?';
    return n.text ?? 'Note';
  };
  const color = (n: BoardNode) => {
    if (n.kind === 'suspect') return C.cyan;
    if (n.kind === 'evidence') {
      const e = cf.evidence.find((x) => x.id === n.refId);
      return e ? EVIDENCE_META[e.kind]?.color ?? C.amber : C.amber;
    }
    return C.violet;
  };

  const addNode = (kind: BoardNode['kind'], refId: string) => {
    if (nodes.some((n) => n.refId === refId && n.kind === kind)) return;
    const i = nodes.length;
    const cols = 2;
    const x = 18 + (i % cols) * (BOARD_W - NODE_W - 36) / Math.max(1, cols - 1);
    const y = 20 + Math.floor(i / cols) * 78 + (i % 2) * 14;
    const node: BoardNode = {
      id: `n${Date.now()}_${i}`,
      kind, refId,
      x: Math.min(BOARD_W - NODE_W - 8, Math.max(8, x)),
      y: Math.min(BOARD_H - NODE_H - 8, Math.max(8, y)),
    };
    Audio.play('select'); Haptics.medium();
    onChange([...nodes, node], links);
  };

  const moveNode = (id: string, x: number, y: number) => {
    onChange(nodes.map((n) => (n.id === id ? { ...n, x, y } : n)), links);
  };

  const tapNode = (id: string) => {
    if (linkFrom === null) {
      setSelected(selected === id ? null : id);
      return;
    }
    if (linkFrom === id) { setLinkFrom(null); return; }
    const exists = links.some((l) =>
      (l.from === linkFrom && l.to === id) || (l.from === id && l.to === linkFrom));
    if (!exists) {
      Audio.play(linkType === 'contradict' ? 'sting' : 'discover');
      Haptics.success();
      onChange(nodes, [...links, { id: `l${Date.now()}`, from: linkFrom, to: id, type: linkType }]);
    }
    setLinkFrom(null);
  };

  const removeNode = (id: string) => {
    Audio.play('back');
    onChange(nodes.filter((n) => n.id !== id), links.filter((l) => l.from !== id && l.to !== id));
    setSelected(null);
  };

  const removeLinksOf = (id: string) => {
    Audio.play('back');
    onChange(nodes, links.filter((l) => l.from !== id && l.to !== id));
  };

  const nodeById = useMemo(() => {
    const m: Record<string, BoardNode> = {};
    nodes.forEach((n) => (m[n.id] = n));
    return m;
  }, [nodes]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <Touch onPress={() => { setPicker(true); }} sfx="select">
          <View style={[styles.tool, { borderColor: C.cyan + '66' }]}>
            <Ionicons name="add" size={15} color={C.cyan} />
            <Text style={[styles.toolText, { color: C.cyan }]}>PIN</Text>
          </View>
        </Touch>
        {(['connect', 'confirm', 'contradict'] as const).map((k) => (
          <Touch key={k} onPress={() => { setLinkType(k); setLinkFrom(null); }} sfx="tap">
            <View style={[styles.tool, {
              borderColor: linkType === k ? LINK_COLORS[k] : C.hairline,
              backgroundColor: linkType === k ? LINK_COLORS[k] + '1A' : 'transparent',
            }]}>
              <Ionicons
                name={k === 'connect' ? 'git-network' : k === 'confirm' ? 'checkmark-circle' : 'flash'}
                size={13}
                color={linkType === k ? LINK_COLORS[k] : C.textFaint}
              />
              <Text style={[styles.toolText, { color: linkType === k ? LINK_COLORS[k] : C.textFaint }]}>
                {k.toUpperCase()}
              </Text>
            </View>
          </Touch>
        ))}
      </View>

      <Text style={styles.hint}>
        {linkFrom
          ? `Select the second card to draw a ${linkType.toUpperCase()} link.`
          : 'Drag cards to arrange. Tap a card to select, then LINK.'}
      </Text>

      <View style={styles.board}>
        <LinearGradient colors={['rgba(20,26,38,0.9)', 'rgba(8,11,17,0.95)']} style={StyleSheet.absoluteFill} />
        <Svg width={BOARD_W} height={BOARD_H} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgLG id="thread" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={C.cyan} stopOpacity="0.9" />
              <Stop offset="100%" stopColor={C.cyan} stopOpacity="0.35" />
            </SvgLG>
          </Defs>
          {/* cork grid */}
          {Array.from({ length: 14 }).map((_, i) => (
            <Line key={'h' + i} x1={0} y1={i * 40} x2={BOARD_W} y2={i * 40} stroke="#5A6E8A" strokeWidth={0.4} opacity={0.12} />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <Line key={'v' + i} x1={i * 40} y1={0} x2={i * 40} y2={BOARD_H} stroke="#5A6E8A" strokeWidth={0.4} opacity={0.12} />
          ))}
          {links.map((l) => {
            const a = nodeById[l.from], b = nodeById[l.to];
            if (!a || !b) return null;
            const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H / 2;
            const x2 = b.x + NODE_W / 2, y2 = b.y + NODE_H / 2;
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 16;
            return (
              <Path
                key={l.id}
                d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
                stroke={LINK_COLORS[l.type]}
                strokeWidth={1.8}
                fill="none"
                strokeDasharray={l.type === 'contradict' ? '6 4' : undefined}
                opacity={0.85}
              />
            );
          })}
          {links.map((l) => {
            const a = nodeById[l.from], b = nodeById[l.to];
            if (!a || !b) return null;
            return (
              <React.Fragment key={l.id + 'p'}>
                <Circle cx={a.x + NODE_W / 2} cy={a.y + NODE_H / 2} r={3.2} fill={LINK_COLORS[l.type]} />
                <Circle cx={b.x + NODE_W / 2} cy={b.y + NODE_H / 2} r={3.2} fill={LINK_COLORS[l.type]} />
              </React.Fragment>
            );
          })}
        </Svg>

        {nodes.map((n) => (
          <DraggableNode
            key={n.id}
            node={n}
            label={label(n)}
            color={color(n)}
            selected={selected === n.id || linkFrom === n.id}
            onMove={moveNode}
            onTap={tapNode}
          />
        ))}

        {nodes.length === 0 && (
          <View style={styles.boardEmpty} pointerEvents="none">
            <Ionicons name="git-network-outline" size={30} color={C.textFaint} />
            <Text style={styles.boardEmptyText}>PIN SUSPECTS AND EXHIBITS{'\n'}TO BUILD YOUR THEORY</Text>
          </View>
        )}
      </View>

      {selected && (
        <Animated.View entering={FadeIn} style={styles.selBar}>
          <Text style={styles.selText} numberOfLines={1}>
            {label(nodeById[selected] ?? ({} as any))}
          </Text>
          <Touch onPress={() => { setLinkFrom(selected); setSelected(null); }} sfx="select">
            <View style={[styles.selBtn, { borderColor: LINK_COLORS[linkType] + '77' }]}>
              <Ionicons name="git-network" size={13} color={LINK_COLORS[linkType]} />
              <Text style={[styles.selBtnText, { color: LINK_COLORS[linkType] }]}>LINK</Text>
            </View>
          </Touch>
          <Touch onPress={() => removeLinksOf(selected)} sfx="back">
            <View style={styles.selBtn}><Ionicons name="cut" size={13} color={C.textDim} /></View>
          </Touch>
          <Touch onPress={() => removeNode(selected)} sfx="back">
            <View style={[styles.selBtn, { borderColor: C.red + '66' }]}><Ionicons name="trash" size={13} color={C.red} /></View>
          </Touch>
        </Animated.View>
      )}

      <View style={styles.legend}>
        <LegendItem color={C.cyan} label="CONNECTED" count={links.filter((l) => l.type === 'connect').length} />
        <LegendItem color={C.green} label="CONFIRMS" count={links.filter((l) => l.type === 'confirm').length} />
        <LegendItem color={C.red} label="CONTRADICTS" count={links.filter((l) => l.type === 'contradict').length} />
      </View>

      <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>PIN TO BOARD</Text>
              <Touch onPress={() => setPicker(false)} sfx="back">
                <Ionicons name="close" size={22} color={C.textDim} />
              </Touch>
            </View>
            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <SectionLabel text="Suspects" color={C.cyan} />
              {cf.suspects.map((s) => (
                <Touch key={s.id} onPress={() => { addNode('suspect', s.id); setPicker(false); }} sfx="select">
                  <View style={styles.pickRow}>
                    <Ionicons name="person" size={15} color={C.cyan} />
                    <Text style={styles.pickText}>{s.name}</Text>
                    {nodes.some((n) => n.refId === s.id) && <Chip label="pinned" color={C.green} small />}
                  </View>
                </Touch>
              ))}
              <SectionLabel text={`Recovered exhibits · ${discovered.length}`} color={C.amber} />
              {discovered.length === 0 && (
                <EmptyState icon="file-tray" title="NOTHING RECOVERED" body="Search your sources in the Evidence tab first." />
              )}
              {cf.evidence.filter((e) => discovered.includes(e.id)).map((e) => (
                <Touch key={e.id} onPress={() => { addNode('evidence', e.id); setPicker(false); }} sfx="select">
                  <View style={styles.pickRow}>
                    <Ionicons name={EVIDENCE_META[e.kind]?.icon as any} size={15} color={EVIDENCE_META[e.kind]?.color} />
                    <Text style={styles.pickText} numberOfLines={1}>{e.title}</Text>
                    {nodes.some((n) => n.refId === e.id) && <Chip label="pinned" color={C.green} small />}
                  </View>
                </Touch>
              ))}
            </ScrollView>
            <PrimaryButton label="DONE" onPress={() => setPicker(false)} color={C.cyan} small style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DraggableNode({
  node, label, color, selected, onMove, onTap,
}: {
  node: BoardNode; label: string; color: string; selected: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onTap: (id: string) => void;
}) {
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const z = useSharedValue(1);

  const pan = Gesture.Pan()
    .onBegin(() => { z.value = withSpring(1.06); })
    .onUpdate((e) => { dx.value = e.translationX; dy.value = e.translationY; })
    .onEnd(() => {
      const nx = Math.max(4, Math.min(BOARD_W - NODE_W - 4, node.x + dx.value));
      const ny = Math.max(4, Math.min(BOARD_H - NODE_H - 4, node.y + dy.value));
      dx.value = 0; dy.value = 0; z.value = withSpring(1);
      runOnJS(onMove)(node.id, nx, ny);
    });

  const tap = Gesture.Tap().maxDuration(220).onEnd(() => { runOnJS(onTap)(node.id); });
  const composed = Gesture.Exclusive(pan, tap);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { translateY: dy.value }, { scale: z.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[
        styles.node,
        { left: node.x, top: node.y, borderColor: selected ? color : color + '55' },
        selected && { shadowColor: color, shadowOpacity: 0.8, shadowRadius: 12, elevation: 12 },
        style,
      ]}>
        <LinearGradient colors={[color + '26', 'rgba(10,14,22,0.94)']} style={StyleSheet.absoluteFill} />
        <View style={[styles.pin, { backgroundColor: color }]} />
        <Text style={[styles.nodeLabel, { color }]} numberOfLines={3}>{label}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14 }}>
      <View style={{ width: 14, height: 2, backgroundColor: color, marginRight: 6 }} />
      <Text style={[styles.legendText, { color: C.textFaint }]}>{label} {count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 7, marginBottom: 9, flexWrap: 'wrap' },
  tool: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1 },
  toolText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1.2, marginLeft: 5, fontFamily: MONO },
  hint: { color: C.textFaint, fontSize: 10.5, marginBottom: 10, fontStyle: 'italic' },
  board: {
    width: BOARD_W, height: BOARD_H, borderRadius: 14, borderWidth: 1, borderColor: C.hairlineStrong,
    overflow: 'hidden',
  },
  boardEmpty: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  boardEmptyText: { color: C.textFaint, fontSize: 9.5, letterSpacing: 1.8, textAlign: 'center', marginTop: 12, lineHeight: 16, fontFamily: MONO },
  node: {
    position: 'absolute', width: NODE_W, minHeight: NODE_H, borderRadius: 9, borderWidth: 1,
    padding: 8, paddingTop: 12, overflow: 'hidden', backgroundColor: 'rgba(10,14,22,0.9)',
  },
  pin: { position: 'absolute', top: 5, left: NODE_W / 2 - 3, width: 6, height: 6, borderRadius: 3 },
  nodeLabel: { fontSize: 9, fontWeight: '700', lineHeight: 12, fontFamily: MONO },
  selBar: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, padding: 9,
    borderRadius: 10, borderWidth: 1, borderColor: C.hairline, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  selText: { color: C.text, fontSize: 11, flex: 1, fontFamily: MONO },
  selBtn: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 10,
    borderRadius: 8, borderWidth: 1, borderColor: C.hairline,
  },
  selBtnText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1.1, marginLeft: 5, fontFamily: MONO },
  legend: { flexDirection: 'row', marginTop: 12, flexWrap: 'wrap' },
  legendText: { fontSize: 8.5, letterSpacing: 1.1, fontFamily: MONO },
  modalRoot: { flex: 1, backgroundColor: 'rgba(3,5,9,0.9)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0D121B', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderTopWidth: 1, borderColor: C.hairlineStrong, padding: 20, paddingBottom: 34,
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: C.text, fontSize: 12, fontWeight: '900', letterSpacing: 2, fontFamily: MONO },
  pickRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 9, borderWidth: 1, borderColor: C.hairline, marginBottom: 7, gap: 10,
  },
  pickText: { color: C.text, fontSize: 12, flex: 1 },
});
