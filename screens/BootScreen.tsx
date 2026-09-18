import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, Easing, withRepeat,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { C } from '../lib/theme';
import { Grain, MONO, Vignette } from '../components/ui';
import { Audio } from '../lib/audio';
import { useGame } from '../lib/store';

const { width } = Dimensions.get('window');

export default function BootScreen({ navigation }: any) {
  const { ready } = useGame();
  const logo = useSharedValue(0);
  const line = useSharedValue(0);
  const tag = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    logo.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    line.value = withDelay(500, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    tag.value = withDelay(950, withTiming(1, { duration: 900 }));
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 1100 })), -1, false);
    const t = setTimeout(() => Audio.play('radio'), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => navigation.replace('Menu'), 2100);
    return () => clearTimeout(t);
  }, [ready]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logo.value,
    transform: [{ scale: 0.94 + logo.value * 0.06 }, { translateY: (1 - logo.value) * 14 }],
  }));
  const lineStyle = useAnimatedStyle(() => ({ width: `${line.value * 74}%`, opacity: line.value }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value, transform: [{ translateY: (1 - tag.value) * 8 }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: 0.25 + pulse.value * 0.6 }));

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#05070B', '#0B1520', '#05070B']} style={StyleSheet.absoluteFill} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 400 800">
          {Array.from({ length: 26 }).map((_, i) => (
            <Line key={i} x1={0} y1={i * 32} x2={400} y2={i * 32} stroke={C.cyan} strokeWidth={0.3} opacity={0.07} />
          ))}
          {Array.from({ length: 14 }).map((_, i) => (
            <Line key={'v' + i} x1={i * 32} y1={0} x2={i * 32} y2={800} stroke={C.cyan} strokeWidth={0.3} opacity={0.05} />
          ))}
        </Svg>
      </View>

      <View style={styles.center}>
        <Animated.View style={[styles.badge, logoStyle]}>
          <Svg width={78} height={78} viewBox="0 0 100 100">
            <Circle cx={50} cy={50} r={44} stroke={C.cyan} strokeWidth={1.4} fill="rgba(62,232,255,0.05)" />
            <Circle cx={50} cy={50} r={34} stroke={C.cyan} strokeWidth={0.7} opacity={0.5} fill="none" />
            <Path d="M20 62 L32 62 L38 42 L46 76 L54 30 L62 62 L80 62" stroke={C.cyan} strokeWidth={2.6} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <Circle cx={50} cy={50} r={48} stroke={C.cyan} strokeWidth={0.4} opacity={0.3} fill="none" />
          </Svg>
        </Animated.View>

        <Animated.View style={logoStyle}>
          <Text style={styles.title}>LIE</Text>
          <Text style={styles.title2}>DETECTOR</Text>
        </Animated.View>

        <Animated.View style={[styles.rule, lineStyle]}>
          <LinearGradient colors={['transparent', C.cyan, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>

        <Animated.Text style={[styles.tagline, tagStyle]}>
          Everyone has a story.{'\n'}Only one version survives the evidence.
        </Animated.Text>
      </View>

      <Animated.View style={[styles.footer, pulseStyle]}>
        <Text style={styles.footerText}>
          {ready ? 'CASE SYSTEM ONLINE' : 'INITIALISING CASE SYSTEM…'}
        </Text>
      </Animated.View>

      <Grain opacity={0.08} />
      <Vignette />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.void },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  badge: { marginBottom: 26 },
  title: { color: C.text, fontSize: width * 0.13, fontWeight: '200', letterSpacing: width * 0.055, textAlign: 'center', marginLeft: width * 0.055 },
  title2: { color: C.cyan, fontSize: width * 0.105, fontWeight: '900', letterSpacing: width * 0.017, textAlign: 'center', marginTop: -4, marginLeft: width * 0.017, textShadowColor: C.cyan, textShadowRadius: 22 },
  rule: { height: 1.4, marginTop: 22, marginBottom: 22 },
  tagline: { color: C.textDim, fontSize: 12, textAlign: 'center', lineHeight: 20, letterSpacing: 1.2, fontStyle: 'italic' },
  footer: { position: 'absolute', bottom: 54, left: 0, right: 0, alignItems: 'center' },
  footerText: { color: C.cyan, fontSize: 9.5, letterSpacing: 3, fontFamily: MONO, fontWeight: '700' },
});
