import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Circle, RadialGradient, Line, Polygon } from 'react-native-svg';
import { RNG } from '../lib/rng';
import { Grain } from './ui';

/**
 * Procedurally composed noir scene plate. Used for photographs and CCTV stills.
 * Deterministic from (kind, seed) so the same exhibit always renders identically.
 */

export default function SceneImage({
  kind, seed, figure = true, timestamp, camera, height = 190, mono = false, dim = 0,
}: {
  kind: string; seed: number; figure?: boolean; timestamp?: string; camera?: string;
  height?: number; mono?: boolean; dim?: number;
}) {
  const rng = useMemo(() => new RNG(seed ^ 0x2c9f), [seed]);
  const p = useMemo(() => {
    const r = new RNG(seed ^ 0x2c9f);
    return {
      figX: 90 + r.next() * 130,
      figScale: 0.85 + r.next() * 0.4,
      lightX: 40 + r.next() * 220,
      extra: r.int(0, 3),
      tone: r.int(0, 2),
    };
  }, [seed]);

  const palettes = mono
    ? [['#141821', '#232A36', '#39424F'], ['#101319', '#1D232C', '#333B47'], ['#0E1116', '#1A2028', '#2E3742']]
    : [
      ['#0B1018', '#16202E', '#2A3A4E'],
      ['#120E14', '#241A22', '#3A2A34'],
      ['#0A1412', '#152420', '#263B34'],
    ];
  const pal = palettes[p.tone];

  const Figure = ({ x, s }: { x: number; s: number }) => (
    <G opacity={0.92}>
      <Ellipse cx={x} cy={150 * s + (1 - s) * 150} rx={16 * s} ry={5} fill="#000" opacity={0.5} />
      <Path
        d={`M${x},${88 - 30 * s} c-8,0 -13,6 -13,13 c0,6 3,9 6,11 c-9,4 -14,12 -15,24 l-2,26 l6,0 l2,-22 l2,32 l6,0 l3,-30 l3,30 l6,0 l2,-32 l2,22 l6,0 l-2,-26 c-1,-12 -6,-20 -15,-24 c3,-2 6,-5 6,-11 c0,-7 -5,-13 -13,-13 Z`}
        fill="#05070A"
        transform={`translate(${x * (1 - s)},${(1 - s) * 40}) scale(${s})`}
        opacity={0.95}
      />
    </G>
  );

  return (
    <View style={{ height, borderRadius: 12, overflow: 'hidden', backgroundColor: pal[0] }}>
      <Svg width="100%" height="100%" viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={pal[1]} />
            <Stop offset="55%" stopColor={pal[0]} />
            <Stop offset="100%" stopColor="#04060A" />
          </LinearGradient>
          <RadialGradient id="lamp" cx="50%" cy="0%" r="80%">
            <Stop offset="0%" stopColor="#FFE7BF" stopOpacity="0.42" />
            <Stop offset="60%" stopColor="#FFE7BF" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#FFE7BF" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={pal[2]} stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#05070A" />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width="320" height="190" fill="url(#bg)" />
        <Rect x="0" y="118" width="320" height="72" fill="url(#floor)" />

        {/* location furniture */}
        {kind === 'garage' && (
          <G>
            {[30, 120, 210, 300].map((x, i) => (
              <Rect key={i} x={x} y={40} width={16} height={82} fill="#05070A" opacity={0.85} />
            ))}
            <Rect x="180" y="86" width="112" height="36" rx="7" fill="#0C1219" />
            <Rect x="192" y="74" width="72" height="18" rx="6" fill="#101822" />
            <Circle cx="200" cy="124" r="9" fill="#05070A" />
            <Circle cx="272" cy="124" r="9" fill="#05070A" />
            <Rect x="0" y="112" width="320" height="3" fill="#F2C14E" opacity="0.25" />
          </G>
        )}
        {kind === 'apartment' || kind === 'home' ? (
          <G>
            <Rect x="24" y="34" width="76" height="70" rx="3" fill="#0A0F16" stroke="#26313E" strokeWidth="1.5" />
            <Line x1="62" y1="34" x2="62" y2="104" stroke="#26313E" strokeWidth="1.2" />
            <Rect x="200" y="52" width="58" height="72" rx="3" fill="#0B1119" stroke="#2A3543" strokeWidth="1.4" />
            <Rect x="120" y="100" width="80" height="9" rx="2" fill="#1A222D" />
            <Rect x="128" y="109" width="6" height="16" fill="#141A24" />
            <Rect x="186" y="109" width="6" height="16" fill="#141A24" />
          </G>
        ) : null}
        {(kind === 'office' || kind === 'lab') && (
          <G>
            <Rect x="16" y="42" width="108" height="60" rx="2" fill="#08111A" stroke="#22303F" strokeWidth="1.2" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Rect key={i} x={22 + i * 21} y={48} width="14" height="48" fill="#0E1D2A" opacity={0.7} />
            ))}
            <Rect x="150" y="96" width="140" height="8" rx="2" fill="#1B242F" />
            <Rect x="196" y="76" width="42" height="22" rx="2" fill="#0B1219" stroke="#2C3947" strokeWidth="1" />
            <Rect x="212" y="98" width="10" height="6" fill="#151D27" />
          </G>
        )}
        {(kind === 'restaurant' || kind === 'club' || kind === 'shop') && (
          <G>
            <Rect x="0" y="96" width="320" height="12" fill="#1A1218" />
            <Rect x="0" y="108" width="320" height="6" fill="#0E0A0E" />
            {[40, 90, 140, 190, 240, 290].map((x, i) => (
              <Circle key={i} cx={x} cy={30 + (i % 2) * 10} r="4" fill="#FFCE7A" opacity={0.55} />
            ))}
            <Rect x="230" y="40" width="70" height="52" rx="3" fill="#0A0810" stroke="#2A2030" strokeWidth="1" />
          </G>
        )}
        {(kind === 'street' || kind === 'station') && (
          <G>
            <Rect x="0" y="104" width="320" height="4" fill="#20262E" />
            {[20, 80, 140, 200, 260].map((x, i) => (
              <Rect key={i} x={x} y={130 + i * 2} width="34" height="3" fill="#3A4553" opacity="0.5" />
            ))}
            <Rect x="26" y="20" width="6" height="90" fill="#141A22" />
            <Ellipse cx="29" cy="20" rx="14" ry="6" fill="#FFD9A0" opacity="0.35" />
            <Path d="M15,20 L43,20 L70,120 L-12,120 Z" fill="#FFD9A0" opacity="0.06" />
          </G>
        )}
        {(kind === 'warehouse' || kind === 'gallery') && (
          <G>
            {[16, 106, 196, 286].map((x, i) => (
              <Rect key={i} x={x} y={30} width="4" height="92" fill="#161D26" />
            ))}
            <Rect x="34" y="52" width="56" height="44" rx="1" fill="#0A0F16" stroke="#3B4756" strokeWidth="2" />
            <Rect x="214" y="60" width="48" height="36" rx="1" fill="#0A0F16" stroke="#3B4756" strokeWidth="2" />
            <Rect x="118" y="88" width="70" height="34" fill="#121922" />
          </G>
        )}
        {(kind === 'hotel' || kind === 'hospital') && (
          <G>
            <Rect x="0" y="28" width="320" height="8" fill="#131A24" />
            {[36, 116, 196, 276].map((x, i) => (
              <Rect key={i} x={x} y={40} width="52" height="76" rx="2" fill="#0A0F17" stroke="#28323F" strokeWidth="1.2" />
            ))}
            {[62, 142, 222, 302].map((x, i) => (
              <Circle key={i} cx={x} cy={82} r="2" fill="#7FE7FF" opacity="0.5" />
            ))}
          </G>
        )}

        {/* overhead light */}
        <Ellipse cx={p.lightX} cy={-10} rx={130} ry={110} fill="url(#lamp)" />
        <Polygon points={`${p.lightX - 8},0 ${p.lightX + 8},0 ${p.lightX + 76},190 ${p.lightX - 76},190`} fill="#FFE7BF" opacity={0.05} />

        {figure && <Figure x={p.figX} s={p.figScale} />}

        {/* reflections on floor */}
        <Rect x="0" y="118" width="320" height="72" fill="#7FE7FF" opacity={0.03} />
        <Rect x="0" y="0" width="320" height="190" fill="#000" opacity={dim} />
      </Svg>
      <Grain opacity={0.16} seed={seed % 97} />
      {timestamp ? (
        <View style={styles.tsWrap}>
          <View style={styles.tsBox}>
            <Svg width={7} height={7}><Circle cx={3.5} cy={3.5} r={3} fill="#FF4D5E" /></Svg>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tsWrap: { position: 'absolute', top: 8, right: 10, flexDirection: 'row', alignItems: 'center' },
  tsBox: { flexDirection: 'row', alignItems: 'center' },
});
