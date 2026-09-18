import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, ViewStyle, TextStyle, ScrollView, StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Pattern, Rect, Line, LinearGradient as SvgLG, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, withSpring, Easing, FadeIn, FadeInDown,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SHADOW } from '../lib/theme';
import { Audio } from '../lib/audio';
import { Haptics } from '../lib/haptics';

export const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
}) as string;

/* ------------------------------------------------------------------ */

export function Grain({ opacity = 0.06, seed = 7 }: { opacity?: number; seed?: number }) {
  const dots = useMemo(() => {
    let s = seed * 9301;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: 160 }).map(() => ({
      x: rnd() * 100, y: rnd() * 100, r: 0.25 + rnd() * 0.85, o: 0.3 + rnd() * 0.7,
    }));
  }, [seed]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <Pattern id="scan" width="100" height="0.6" patternUnits="userSpaceOnUse">
            <Line x1="0" y1="0" x2="100" y2="0" stroke="#9FD8F0" strokeWidth="0.18" opacity="0.5" />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#scan)" />
        {dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#DCE9FF" opacity={d.o} />
        ))}
      </Svg>
    </View>
  );
}

export function Vignette({ intensity = 0.85 }: { intensity?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']}
        locations={[0, 0.42, 1]}
        style={[StyleSheet.absoluteFill, { opacity: intensity }]}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFill, { opacity: intensity * 0.8 }]}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */

export function Screen({
  children, grain = true, gradient, style, scroll = false, contentStyle,
}: {
  children: React.ReactNode;
  grain?: boolean;
  gradient?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const g = gradient ?? (['#05070B', '#0A1018', '#070A10'] as const);
  const Inner = scroll ? ScrollView : View;
  return (
    <View style={[{ flex: 1, backgroundColor: C.void }, style]}>
      <LinearGradient colors={g as any} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['rgba(62,232,255,0.10)', 'transparent']}
          start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 0.7 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {grain && <Grain />}
      <Vignette intensity={0.55} />
      <Inner style={{ flex: 1 }} contentContainerStyle={scroll ? contentStyle : undefined}>
        {children}
      </Inner>
    </View>
  );
}

/* ------------------------------------------------------------------ */

interface TouchProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  sfx?: 'tap' | 'select' | 'back' | 'lock' | 'whoosh' | 'discover' | 'none';
  haptic?: 'light' | 'medium' | 'heavy' | 'select' | 'none';
  disabled?: boolean;
  scaleTo?: number;
}

export function Touch({
  onPress, onLongPress, children, style, sfx = 'tap', haptic = 'light', disabled, scaleTo = 0.965,
}: TouchProps) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={anim}>
      <Pressable
        disabled={disabled}
        onPressIn={() => { s.value = withTiming(scaleTo, { duration: 70 }); }}
        onPressOut={() => { s.value = withSpring(1, { damping: 15, stiffness: 320 }); }}
        onPress={() => {
          if (disabled) return;
          if (sfx !== 'none') Audio.play(sfx);
          if (haptic !== 'none') (Haptics as any)[haptic]?.();
          onPress?.();
        }}
        onLongPress={onLongPress}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */

export function GlassCard({
  children, style, accent, glow = false,
}: { children: React.ReactNode; style?: StyleProp<ViewStyle>; accent?: string; glow?: boolean }) {
  return (
    <View
      style={[
        styles.card,
        accent ? { borderColor: accent + '55' } : null,
        glow && accent ? SHADOW.glow(accent) : SHADOW.card,
        style,
      ]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.055)', 'rgba(255,255,255,0.012)']}
        style={StyleSheet.absoluteFill}
      />
      {accent && <View style={[styles.cardAccent, { backgroundColor: accent }]} />}
      {children}
    </View>
  );
}

export function PrimaryButton({
  label, onPress, icon, color = C.cyan, disabled, style, small, sublabel,
}: {
  label: string; onPress: () => void; icon?: any; color?: string; disabled?: boolean;
  style?: StyleProp<ViewStyle>; small?: boolean; sublabel?: string;
}) {
  return (
    <Touch onPress={onPress} disabled={disabled} sfx="select" haptic="medium" style={style}>
      <View style={[
        styles.btn,
        small && { paddingVertical: 11, paddingHorizontal: 16 },
        { borderColor: disabled ? C.hairline : color + '88' },
        disabled ? { opacity: 0.4 } : SHADOW.glow(color),
      ]}>
        <LinearGradient
          colors={[color + '2E', color + '0A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {icon && <Ionicons name={icon} size={small ? 15 : 18} color={color} style={{ marginRight: 9 }} />}
        <View>
          <Text style={[styles.btnText, { color, fontSize: small ? 12 : 13.5 }]}>{label}</Text>
          {sublabel && <Text style={styles.btnSub}>{sublabel}</Text>}
        </View>
      </View>
    </Touch>
  );
}

export function GhostButton({
  label, onPress, icon, style, color = C.textDim,
}: { label: string; onPress: () => void; icon?: any; style?: StyleProp<ViewStyle>; color?: string }) {
  return (
    <Touch onPress={onPress} sfx="tap" style={style}>
      <View style={styles.ghostBtn}>
        {icon && <Ionicons name={icon} size={15} color={color} style={{ marginRight: 7 }} />}
        <Text style={[styles.ghostText, { color }]}>{label}</Text>
      </View>
    </Touch>
  );
}

export function IconButton({
  icon, onPress, color = C.text, size = 20, bg = 'rgba(255,255,255,0.05)', style,
}: { icon: any; onPress: () => void; color?: string; size?: number; bg?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Touch onPress={onPress} sfx="tap" style={style}>
      <View style={[styles.iconBtn, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={size} color={color} />
      </View>
    </Touch>
  );
}

export function Chip({
  label, color = C.textDim, filled = false, icon, small = false, style,
}: { label: string; color?: string; filled?: boolean; icon?: any; small?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[
      styles.chip,
      { borderColor: color + (filled ? 'FF' : '55'), backgroundColor: filled ? color + '22' : 'transparent' },
      small && { paddingVertical: 2, paddingHorizontal: 7 },
      style,
    ]}>
      {icon && <Ionicons name={icon} size={small ? 9 : 11} color={color} style={{ marginRight: 4 }} />}
      <Text style={[styles.chipText, { color, fontSize: small ? 8.5 : 9.5 }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function Meter({
  label, value, color, icon,
}: { label: string; value: number; color: string; icon?: any }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(Math.max(0, Math.min(100, value)), { duration: 480, easing: Easing.out(Easing.cubic) }); }, [value]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        {icon && <Ionicons name={icon} size={10} color={color} style={{ marginRight: 4 }} />}
        <Text style={[styles.meterLabel, { color }]}>{label}</Text>
        <Text style={[styles.meterVal, { color }]}>{Math.round(value)}</Text>
      </View>
      <View style={styles.meterTrack}>
        <Animated.View style={[styles.meterFill, { backgroundColor: color }, anim]} />
      </View>
    </View>
  );
}

export function SectionLabel({ text, right, color = C.textFaint }: { text: string; right?: React.ReactNode; color?: string }) {
  return (
    <View style={styles.sectionRow}>
      <View style={[styles.sectionTick, { backgroundColor: color }]} />
      <Text style={[styles.sectionText, { color }]}>{text.toUpperCase()}</Text>
      <View style={[styles.sectionLine, { backgroundColor: color + '30' }]} />
      {right}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: C.hairline, marginVertical: 12 }, style]} />;
}

export function EmptyState({ icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={C.textFaint} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function AppHeader({
  title, subtitle, onBack, right, accent = C.cyan,
}: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode; accent?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      {onBack && (
        <Touch onPress={onBack} sfx="back" style={{ marginRight: 12 }}>
          <View style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </View>
        </Touch>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: accent }]} numberOfLines={1}>{title.toUpperCase()}</Text>
        {subtitle ? <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/* ------------------------------------------------------------------ */

export function Typewriter({
  text, speed = 18, style, onDone, instant = false, blip = false,
}: { text: string; speed?: number; style?: StyleProp<TextStyle>; onDone?: () => void; instant?: boolean; blip?: boolean }) {
  const [shown, setShown] = useState(instant ? text : '');
  const idx = useRef(0);
  const done = useRef(false);

  useEffect(() => {
    if (instant || speed <= 0) { setShown(text); onDone?.(); return; }
    setShown('');
    idx.current = 0;
    done.current = false;
    const iv = setInterval(() => {
      idx.current += Math.max(1, Math.round(2 + speed / 22));
      if (idx.current >= text.length) {
        setShown(text);
        clearInterval(iv);
        if (!done.current) { done.current = true; onDone?.(); }
      } else {
        setShown(text.slice(0, idx.current));
        if (blip && idx.current % 6 === 0) Audio.play('blip');
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, instant]);

  return <Text style={style}>{shown}</Text>;
}

export function Pulse({ children, active = true, style }: { children: React.ReactNode; active?: boolean; style?: StyleProp<ViewStyle> }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (active) {
      v.value = withRepeat(withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ), -1, false);
    } else v.value = withTiming(0);
  }, [active]);
  const a = useAnimatedStyle(() => ({ opacity: 0.55 + v.value * 0.45, transform: [{ scale: 1 + v.value * 0.03 }] }));
  return <Animated.View style={[a, style]}>{children}</Animated.View>;
}

export function Toast({ text, kind }: { text: string; kind: 'info' | 'good' | 'bad' }) {
  const insets = useSafeAreaInsets();
  const color = kind === 'good' ? C.green : kind === 'bad' ? C.red : C.cyan;
  const icon = kind === 'good' ? 'checkmark-circle' : kind === 'bad' ? 'alert-circle' : 'information-circle';
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      pointerEvents="none"
      style={[styles.toast, { bottom: insets.bottom + 26, borderColor: color + '77' }]}
    >
      <LinearGradient colors={[color + '26', 'rgba(10,13,20,0.96)']} style={StyleSheet.absoluteFill} />
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={styles.toastText}>{text}</Text>
    </Animated.View>
  );
}

export function ScanLine({ color = C.cyan }: { color?: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.linear }), -1, false);
  }, []);
  const a = useAnimatedStyle(() => ({ top: `${v.value * 100}%`, opacity: 0.5 - Math.abs(v.value - 0.5) * 0.6 }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, height: 2 }, a]}>
      <LinearGradient colors={['transparent', color, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
    </Animated.View>
  );
}

export function ProgressRing({ value, size = 54, stroke = 4, color = C.cyan, label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(1, value)));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLG id="ringG" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={color} stopOpacity="0.35" />
          </SvgLG>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke="url(#ringG)" strokeWidth={stroke} fill="none"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {label ? <Text style={{ color, fontSize: 11, fontFamily: MONO, fontWeight: '700' }}>{label}</Text> : null}
    </View>
  );
}

export { FadeIn, FadeInDown, Animated };

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: C.panel,
    overflow: 'hidden',
    padding: 16,
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: 13,
    borderWidth: 1,
    backgroundColor: 'rgba(10,14,22,0.7)',
    overflow: 'hidden',
  },
  btnText: { fontWeight: '800', letterSpacing: 1.6, fontFamily: MONO },
  btnSub: { color: C.textFaint, fontSize: 9, letterSpacing: 0.6, marginTop: 2, fontFamily: MONO },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, paddingHorizontal: 15,
  },
  ghostText: { fontSize: 11.5, letterSpacing: 1.1, fontWeight: '700', fontFamily: MONO },
  iconBtn: {
    width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.hairline,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 3.5, paddingHorizontal: 9, borderRadius: 6, borderWidth: 1,
  },
  chipText: { fontWeight: '800', letterSpacing: 1, fontFamily: MONO },
  meterLabel: { fontSize: 8.5, letterSpacing: 1.4, fontWeight: '800', flex: 1, fontFamily: MONO },
  meterVal: { fontSize: 9, fontWeight: '800', fontFamily: MONO },
  meterTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 2 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTick: { width: 3, height: 11, borderRadius: 1, marginRight: 7 },
  sectionText: { fontSize: 9.5, letterSpacing: 2, fontWeight: '800', fontFamily: MONO },
  sectionLine: { flex: 1, height: 1, marginLeft: 10, marginRight: 6 },
  empty: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 30 },
  emptyIcon: {
    width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.hairline, backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 14,
  },
  emptyTitle: { color: C.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6, fontFamily: MONO },
  emptyBody: { color: C.textFaint, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.hairline,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.hairline, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2.2, fontFamily: MONO },
  headerSub: { color: C.textFaint, fontSize: 10, marginTop: 2, letterSpacing: 0.6 },
  toast: {
    position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16, borderRadius: 13, borderWidth: 1, overflow: 'hidden',
    zIndex: 999,
  },
  toastText: { color: C.text, fontSize: 12.5, marginLeft: 10, flex: 1, lineHeight: 17 },
});
