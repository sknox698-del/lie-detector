import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop, ClipPath, Line,
} from 'react-native-svg';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, Easing, withSpring,
} from 'react-native-reanimated';
import { Emotion, FaceDNA } from '../lib/types';

/* ------------------------------------------------------------------ */
/*  Expression table                                                   */
/* ------------------------------------------------------------------ */

interface Expr {
  browY: number;
  browAngle: number;
  browInner: number;
  eyeOpen: number;
  squint: number;
  mouth: string;
  sweat: number;
  blush: number;
  gazeBias: [number, number];
  tension: number;
}

const EXPR: Record<Emotion, Expr> = {
  calm:       { browY: 0,    browAngle: 0,    browInner: 0,   eyeOpen: 1,    squint: 0,    mouth: 'neutral',  sweat: 0, blush: 0,    gazeBias: [0, 0],     tension: 0 },
  confident:  { browY: -1.5, browAngle: -2,   browInner: 0,   eyeOpen: 0.95, squint: 0.1,  mouth: 'smile',    sweat: 0, blush: 0.05, gazeBias: [0, 0],     tension: 0 },
  nervous:    { browY: -2.5, browAngle: 3,    browInner: 3,   eyeOpen: 1.14, squint: 0,    mouth: 'tight',    sweat: 3, blush: 0.18, gazeBias: [-1.6, 1],  tension: 0.5 },
  angry:      { browY: 3.5,  browAngle: 10,   browInner: -4,  eyeOpen: 0.82, squint: 0.35, mouth: 'frown',    sweat: 1, blush: 0.3,  gazeBias: [0, 0],     tension: 0.9 },
  defensive:  { browY: 1.5,  browAngle: 5,    browInner: -1,  eyeOpen: 0.88, squint: 0.2,  mouth: 'pressed',  sweat: 1, blush: 0.1,  gazeBias: [1.4, 0],   tension: 0.6 },
  confused:   { browY: -2,   browAngle: -7,   browInner: 2,   eyeOpen: 1.05, squint: 0,    mouth: 'skew',     sweat: 0, blush: 0,    gazeBias: [-2, -1.6], tension: 0.2 },
  evasive:    { browY: 0.5,  browAngle: 2,    browInner: 1,   eyeOpen: 0.92, squint: 0.15, mouth: 'pursed',   sweat: 2, blush: 0.12, gazeBias: [2.4, 1.4], tension: 0.5 },
  shocked:    { browY: -6,   browAngle: -4,   browInner: 4,   eyeOpen: 1.3,  squint: 0,    mouth: 'open',     sweat: 2, blush: 0,    gazeBias: [0, -0.6],  tension: 0.7 },
  emotional:  { browY: -3,   browAngle: -9,   browInner: 5,   eyeOpen: 0.8,  squint: 0.25, mouth: 'sob',      sweat: 0, blush: 0.4,  gazeBias: [0, 1.8],   tension: 0.4 },
  suspicious: { browY: 1,    browAngle: 6,    browInner: -2,  eyeOpen: 0.78, squint: 0.4,  mouth: 'smirk',    sweat: 0, blush: 0,    gazeBias: [1.8, 0],   tension: 0.4 },
  broken:     { browY: -1,   browAngle: -6,   browInner: 3,   eyeOpen: 0.62, squint: 0.3,  mouth: 'slack',    sweat: 2, blush: 0.25, gazeBias: [-0.6, 2.4],tension: 0.15 },
};

function mouthPath(kind: string, cx: number, my: number, mw: number, full: number): string {
  const w = mw;
  const f = 2.4 * full;
  switch (kind) {
    case 'smile':
      return `M${cx - w},${my} Q${cx},${my + 7 + f} ${cx + w},${my} Q${cx},${my + 3 + f} ${cx - w},${my} Z`;
    case 'frown':
      return `M${cx - w},${my + 4} Q${cx},${my - 4} ${cx + w},${my + 4} Q${cx},${my + 1} ${cx - w},${my + 4} Z`;
    case 'tight':
      return `M${cx - w * 0.82},${my} Q${cx},${my + 1.5} ${cx + w * 0.82},${my - 1} Q${cx},${my + 3} ${cx - w * 0.82},${my} Z`;
    case 'pressed':
      return `M${cx - w * 0.9},${my} L${cx + w * 0.9},${my} Q${cx},${my + 2.6} ${cx - w * 0.9},${my} Z`;
    case 'skew':
      return `M${cx - w * 0.8},${my + 2} Q${cx - w * 0.1},${my - 3} ${cx + w * 0.75},${my + 1} Q${cx},${my + 4} ${cx - w * 0.8},${my + 2} Z`;
    case 'pursed':
      return `M${cx - w * 0.55},${my} Q${cx},${my - 2.5} ${cx + w * 0.55},${my} Q${cx},${my + 4 + f} ${cx - w * 0.55},${my} Z`;
    case 'open':
      return `M${cx - w * 0.62},${my - 1} Q${cx},${my - 6} ${cx + w * 0.62},${my - 1} Q${cx},${my + 12 + f} ${cx - w * 0.62},${my - 1} Z`;
    case 'sob':
      return `M${cx - w * 0.8},${my + 3} Q${cx},${my - 6} ${cx + w * 0.8},${my + 3} Q${cx},${my + 9 + f} ${cx - w * 0.8},${my + 3} Z`;
    case 'smirk':
      return `M${cx - w * 0.85},${my + 2.5} Q${cx},${my + 1} ${cx + w * 0.85},${my - 3} Q${cx},${my + 4} ${cx - w * 0.85},${my + 2.5} Z`;
    case 'slack':
      return `M${cx - w * 0.6},${my} Q${cx},${my + 1} ${cx + w * 0.6},${my} Q${cx},${my + 8 + f} ${cx - w * 0.6},${my} Z`;
    default:
      return `M${cx - w * 0.85},${my} Q${cx},${my + 2.2} ${cx + w * 0.85},${my} Q${cx},${my + 4 + f} ${cx - w * 0.85},${my} Z`;
  }
}

function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + amt)));
  g = Math.max(0, Math.min(255, Math.round(g + amt)));
  b = Math.max(0, Math.min(255, Math.round(b + amt)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/* ------------------------------------------------------------------ */
/*  Hair                                                               */
/* ------------------------------------------------------------------ */

function Hair({ style, color, cx, cy, rw, rh }: { style: number; color: string; cx: number; cy: number; rw: number; rh: number }) {
  const dark = shade(color, -26);
  const light = shade(color, 30);
  const top = cy - rh * 1.28;
  switch (style) {
    case 0: // short crop
      return (
        <G>
          <Path d={`M${cx - rw * 1.02},${cy - rh * 0.28} C${cx - rw * 1.08},${cy - rh * 1.1} ${cx - rw * 0.5},${top - 6} ${cx},${top - 5} C${cx + rw * 0.5},${top - 6} ${cx + rw * 1.08},${cy - rh * 1.1} ${cx + rw * 1.02},${cy - rh * 0.28} C${cx + rw * 0.9},${cy - rh * 0.72} ${cx + rw * 0.5},${cy - rh * 0.95} ${cx},${cy - rh * 0.92} C${cx - rw * 0.5},${cy - rh * 0.95} ${cx - rw * 0.9},${cy - rh * 0.72} ${cx - rw * 1.02},${cy - rh * 0.28} Z`} fill={color} />
          <Path d={`M${cx - rw * 0.6},${top + 4} Q${cx - rw * 0.1},${top - 3} ${cx + rw * 0.35},${top + 8}`} stroke={light} strokeWidth={3} fill="none" opacity={0.5} />
        </G>
      );
    case 1: // buzz
      return <Path d={`M${cx - rw * 0.98},${cy - rh * 0.45} C${cx - rw},${cy - rh * 1.12} ${cx - rw * 0.5},${top - 1} ${cx},${top - 1} C${cx + rw * 0.5},${top - 1} ${cx + rw},${cy - rh * 1.12} ${cx + rw * 0.98},${cy - rh * 0.45} C${cx + rw * 0.8},${cy - rh * 0.9} ${cx - rw * 0.8},${cy - rh * 0.9} ${cx - rw * 0.98},${cy - rh * 0.45} Z`} fill={color} opacity={0.92} />;
    case 2: // side part
      return (
        <G>
          <Path d={`M${cx - rw * 1.05},${cy - rh * 0.2} C${cx - rw * 1.12},${cy - rh * 1.15} ${cx - rw * 0.55},${top - 9} ${cx + rw * 0.1},${top - 7} C${cx + rw * 0.72},${top - 5} ${cx + rw * 1.12},${cy - rh * 0.95} ${cx + rw * 1.0},${cy - rh * 0.35} C${cx + rw * 0.86},${cy - rh * 0.8} ${cx + rw * 0.2},${cy - rh * 0.86} ${cx - rw * 0.28},${cy - rh * 0.74} C${cx - rw * 0.66},${cy - rh * 0.64} ${cx - rw * 0.95},${cy - rh * 0.5} ${cx - rw * 1.05},${cy - rh * 0.2} Z`} fill={color} />
          <Path d={`M${cx - rw * 0.35},${top + 2} C${cx + rw * 0.1},${top + 10} ${cx + rw * 0.5},${cy - rh * 0.95} ${cx + rw * 0.95},${cy - rh * 0.6}`} stroke={dark} strokeWidth={2.5} fill="none" opacity={0.55} />
        </G>
      );
    case 3: // curly volume
      return (
        <G>
          {[-0.85, -0.5, -0.15, 0.2, 0.55, 0.88].map((o, i) => (
            <Circle key={i} cx={cx + o * rw} cy={top + 6 + Math.abs(o) * rh * 0.34} r={rw * 0.36} fill={i % 2 ? shade(color, 10) : color} />
          ))}
          <Circle cx={cx - rw * 0.92} cy={cy - rh * 0.5} r={rw * 0.3} fill={color} />
          <Circle cx={cx + rw * 0.92} cy={cy - rh * 0.5} r={rw * 0.3} fill={color} />
        </G>
      );
    case 4: // long straight
      return (
        <G>
          <Path d={`M${cx - rw * 1.16},${cy + rh * 0.95} C${cx - rw * 1.3},${cy - rh * 0.4} ${cx - rw * 1.1},${top - 8} ${cx},${top - 8} C${cx + rw * 1.1},${top - 8} ${cx + rw * 1.3},${cy - rh * 0.4} ${cx + rw * 1.16},${cy + rh * 0.95} C${cx + rw * 1.0},${cy + rh * 0.4} ${cx + rw * 1.02},${cy - rh * 0.3} ${cx + rw * 0.96},${cy - rh * 0.6} C${cx + rw * 0.6},${cy - rh * 1.0} ${cx - rw * 0.6},${cy - rh * 1.0} ${cx - rw * 0.96},${cy - rh * 0.6} C${cx - rw * 1.02},${cy - rh * 0.3} ${cx - rw * 1.0},${cy + rh * 0.4} ${cx - rw * 1.16},${cy + rh * 0.95} Z`} fill={color} />
          <Path d={`M${cx - rw * 1.05},${cy - rh * 0.2} C${cx - rw * 1.06},${cy + rh * 0.3} ${cx - rw * 1.1},${cy + rh * 0.6} ${cx - rw * 1.12},${cy + rh * 0.9}`} stroke={light} strokeWidth={2} fill="none" opacity={0.4} />
        </G>
      );
    case 5: // updo / bun
      return (
        <G>
          <Circle cx={cx + rw * 0.05} cy={top - rh * 0.22} r={rw * 0.34} fill={shade(color, -12)} />
          <Path d={`M${cx - rw * 1.02},${cy - rh * 0.35} C${cx - rw * 1.05},${cy - rh * 1.1} ${cx - rw * 0.5},${top - 4} ${cx},${top - 4} C${cx + rw * 0.5},${top - 4} ${cx + rw * 1.05},${cy - rh * 1.1} ${cx + rw * 1.02},${cy - rh * 0.35} C${cx + rw * 0.85},${cy - rh * 0.85} ${cx - rw * 0.85},${cy - rh * 0.85} ${cx - rw * 1.02},${cy - rh * 0.35} Z`} fill={color} />
        </G>
      );
    case 6: // bald / receding
      return (
        <Path d={`M${cx - rw * 1.0},${cy - rh * 0.15} C${cx - rw * 1.02},${cy - rh * 0.62} ${cx - rw * 0.8},${cy - rh * 0.82} ${cx - rw * 0.62},${cy - rh * 0.86} C${cx - rw * 0.7},${cy - rh * 0.55} ${cx - rw * 0.85},${cy - rh * 0.3} ${cx - rw * 1.0},${cy - rh * 0.15} Z M${cx + rw * 1.0},${cy - rh * 0.15} C${cx + rw * 1.02},${cy - rh * 0.62} ${cx + rw * 0.8},${cy - rh * 0.82} ${cx + rw * 0.62},${cy - rh * 0.86} C${cx + rw * 0.7},${cy - rh * 0.55} ${cx + rw * 0.85},${cy - rh * 0.3} ${cx + rw * 1.0},${cy - rh * 0.15} Z`} fill={color} opacity={0.85} />
      );
    case 7: // afro
      return (
        <G>
          <Ellipse cx={cx} cy={top + rh * 0.16} rx={rw * 1.28} ry={rh * 0.72} fill={color} />
          <Ellipse cx={cx - rw * 0.4} cy={top + rh * 0.06} rx={rw * 0.42} ry={rh * 0.3} fill={light} opacity={0.16} />
        </G>
      );
    case 8: // ponytail
      return (
        <G>
          <Path d={`M${cx + rw * 1.0},${cy - rh * 0.32} C${cx + rw * 1.5},${cy - rh * 0.1} ${cx + rw * 1.42},${cy + rh * 0.62} ${cx + rw * 1.02},${cy + rh * 0.78} C${cx + rw * 1.28},${cy + rh * 0.3} ${cx + rw * 1.22},${cy - rh * 0.05} ${cx + rw * 0.92},${cy - rh * 0.2} Z`} fill={shade(color, -14)} />
          <Path d={`M${cx - rw * 1.02},${cy - rh * 0.3} C${cx - rw * 1.06},${cy - rh * 1.12} ${cx - rw * 0.5},${top - 6} ${cx},${top - 6} C${cx + rw * 0.5},${top - 6} ${cx + rw * 1.06},${cy - rh * 1.12} ${cx + rw * 1.02},${cy - rh * 0.3} C${cx + rw * 0.85},${cy - rh * 0.88} ${cx - rw * 0.85},${cy - rh * 0.88} ${cx - rw * 1.02},${cy - rh * 0.3} Z`} fill={color} />
        </G>
      );
    default: // messy fringe
      return (
        <G>
          <Path d={`M${cx - rw * 1.06},${cy - rh * 0.22} C${cx - rw * 1.12},${cy - rh * 1.14} ${cx - rw * 0.5},${top - 10} ${cx},${top - 8} C${cx + rw * 0.5},${top - 10} ${cx + rw * 1.12},${cy - rh * 1.14} ${cx + rw * 1.06},${cy - rh * 0.22} C${cx + rw * 0.9},${cy - rh * 0.68} ${cx + rw * 0.62},${cy - rh * 0.52} ${cx + rw * 0.36},${cy - rh * 0.78} C${cx + rw * 0.1},${cy - rh * 0.52} ${cx - rw * 0.14},${cy - rh * 0.5} ${cx - rw * 0.34},${cy - rh * 0.8} C${cx - rw * 0.6},${cy - rh * 0.52} ${cx - rw * 0.88},${cy - rh * 0.6} ${cx - rw * 1.06},${cy - rh * 0.22} Z`} fill={color} />
        </G>
      );
  }
}

function FacialHair({ kind, color, cx, cy, rw, rh, my }: { kind: number; color: string; cx: number; cy: number; rw: number; rh: number; my: number }) {
  if (!kind) return null;
  const c = shade(color, -14);
  if (kind === 1) {
    return <Path d={`M${cx - rw * 0.78},${my - 10} C${cx - rw * 0.8},${cy + rh * 0.9} ${cx + rw * 0.8},${cy + rh * 0.9} ${cx + rw * 0.78},${my - 10} C${cx + rw * 0.4},${my + 4} ${cx - rw * 0.4},${my + 4} ${cx - rw * 0.78},${my - 10} Z`} fill={c} opacity={0.22} />;
  }
  if (kind === 2) {
    return <Path d={`M${cx - rw * 0.38},${my - 6} Q${cx},${my - 11} ${cx + rw * 0.38},${my - 6} Q${cx},${my - 1} ${cx - rw * 0.38},${my - 6} Z`} fill={c} />;
  }
  if (kind === 3) {
    return (
      <G>
        <Path d={`M${cx - rw * 0.36},${my - 6} Q${cx},${my - 11} ${cx + rw * 0.36},${my - 6} Q${cx},${my - 1} ${cx - rw * 0.36},${my - 6} Z`} fill={c} />
        <Path d={`M${cx - rw * 0.34},${my + 8} Q${cx},${my + 5} ${cx + rw * 0.34},${my + 8} Q${cx + rw * 0.22},${cy + rh * 1.02} ${cx},${cy + rh * 1.06} Q${cx - rw * 0.22},${cy + rh * 1.02} ${cx - rw * 0.34},${my + 8} Z`} fill={c} />
      </G>
    );
  }
  return (
    <G>
      <Path d={`M${cx - rw * 0.9},${my - 18} C${cx - rw * 0.95},${cy + rh * 0.95} ${cx + rw * 0.95},${cy + rh * 0.95} ${cx + rw * 0.9},${my - 18} C${cx + rw * 0.55},${my - 4} ${cx + rw * 0.3},${my + 3} ${cx},${my + 3} C${cx - rw * 0.3},${my + 3} ${cx - rw * 0.55},${my - 4} ${cx - rw * 0.9},${my - 18} Z`} fill={c} opacity={0.95} />
      <Path d={`M${cx - rw * 0.38},${my - 6} Q${cx},${my - 12} ${cx + rw * 0.38},${my - 6} Q${cx},${my} ${cx - rw * 0.38},${my - 6} Z`} fill={shade(color, -24)} />
    </G>
  );
}

function Collar({ kind, color, accent, cx, cy, rh }: { kind: number; color: string; accent: string; cx: number; cy: number; rh: number }) {
  const y = cy + rh * 1.5;
  const dark = shade(color, -22);
  switch (kind) {
    case 1: // open shirt
      return (
        <G>
          <Path d={`M${cx - 92},240 C${cx - 74},${y + 4} ${cx - 34},${y - 6} ${cx},${y + 6} C${cx + 34},${y - 6} ${cx + 74},${y + 4} ${cx + 92},240 Z`} fill={color} />
          <Path d={`M${cx - 24},${y - 4} L${cx - 4},${y + 22} L${cx - 30},${y + 16} Z`} fill="#EEF3FA" />
          <Path d={`M${cx + 24},${y - 4} L${cx + 4},${y + 22} L${cx + 30},${y + 16} Z`} fill="#EEF3FA" />
        </G>
      );
    case 2: // suit + tie
      return (
        <G>
          <Path d={`M${cx - 96},240 C${cx - 76},${y} ${cx - 36},${y - 8} ${cx},${y + 4} C${cx + 36},${y - 8} ${cx + 76},${y} ${cx + 96},240 Z`} fill={dark} />
          <Path d={`M${cx - 30},${y - 6} L${cx},${y + 34} L${cx - 46},${y + 30} Z`} fill="#F2F6FC" />
          <Path d={`M${cx + 30},${y - 6} L${cx},${y + 34} L${cx + 46},${y + 30} Z`} fill="#F2F6FC" />
          <Path d={`M${cx - 8},${y + 6} L${cx + 8},${y + 6} L${cx + 11},${y + 16} L${cx},240 L${cx - 11},${y + 16} Z`} fill={accent} />
        </G>
      );
    case 3: // hoodie
      return (
        <G>
          <Path d={`M${cx - 98},240 C${cx - 80},${y + 2} ${cx - 40},${y - 10} ${cx},${y - 2} C${cx + 40},${y - 10} ${cx + 80},${y + 2} ${cx + 98},240 Z`} fill={color} />
          <Path d={`M${cx - 46},${y - 4} C${cx - 30},${y + 20} ${cx + 30},${y + 20} ${cx + 46},${y - 4} C${cx + 26},${y + 6} ${cx - 26},${y + 6} ${cx - 46},${y - 4} Z`} fill={dark} />
          <Line x1={cx - 12} y1={y + 12} x2={cx - 14} y2={240} stroke={accent} strokeWidth={3} />
          <Line x1={cx + 12} y1={y + 12} x2={cx + 14} y2={240} stroke={accent} strokeWidth={3} />
        </G>
      );
    case 4: // uniform
      return (
        <G>
          <Path d={`M${cx - 96},240 C${cx - 76},${y} ${cx - 36},${y - 8} ${cx},${y + 2} C${cx + 36},${y - 8} ${cx + 76},${y} ${cx + 96},240 Z`} fill={color} />
          <Rect x={cx - 44} y={y + 12} width={22} height={7} rx={2} fill={accent} />
          <Rect x={cx - 44} y={y + 23} width={14} height={5} rx={2} fill={accent} opacity={0.7} />
        </G>
      );
    default:
      return <Path d={`M${cx - 94},240 C${cx - 74},${y + 6} ${cx - 34},${y - 2} ${cx},${y + 8} C${cx + 34},${y - 2} ${cx + 74},${y + 6} ${cx + 94},240 Z`} fill={color} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Portrait                                                           */
/* ------------------------------------------------------------------ */

export interface PortraitProps {
  face: FaceDNA;
  emotion?: Emotion;
  size?: number;
  stress?: number;
  animated?: boolean;
  quality?: 'Low' | 'Medium' | 'High' | 'Ultra';
  speaking?: boolean;
}

function PortraitInner({
  face, emotion = 'calm', size = 220, stress = 0, animated = true, quality = 'High', speaking = false,
}: PortraitProps) {
  const [blink, setBlink] = useState(0);
  const [gaze, setGaze] = useState<[number, number]>([0, 0]);
  const [talk, setTalk] = useState(0);
  const mounted = useRef(true);

  const sway = useSharedValue(0);
  const breathe = useSharedValue(0);
  const tilt = useSharedValue(0);

  const e = EXPR[emotion] ?? EXPR.calm;
  const hi = quality === 'High' || quality === 'Ultra';

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!animated) return;
    let timer: any;
    const loop = () => {
      const stressFactor = 1 - Math.min(0.65, stress / 160);
      const delay = (1400 + Math.random() * 3400) * stressFactor;
      timer = setTimeout(() => {
        if (!mounted.current) return;
        setBlink(1);
        setTimeout(() => { if (mounted.current) setBlink(0); }, 105);
        loop();
      }, delay);
    };
    loop();
    return () => clearTimeout(timer);
  }, [animated, stress]);

  useEffect(() => {
    if (!animated) return;
    let timer: any;
    const loop = () => {
      const jitter = emotion === 'evasive' || emotion === 'nervous' ? 900 : 2100;
      timer = setTimeout(() => {
        if (!mounted.current) return;
        const amp = emotion === 'evasive' ? 3.2 : emotion === 'calm' ? 1.1 : 2.1;
        setGaze([(Math.random() - 0.5) * 2 * amp, (Math.random() - 0.5) * amp]);
        loop();
      }, 500 + Math.random() * jitter);
    };
    loop();
    return () => clearTimeout(timer);
  }, [animated, emotion]);

  useEffect(() => {
    if (!speaking || !animated) { setTalk(0); return; }
    const iv = setInterval(() => { if (mounted.current) setTalk((t) => (t + 1) % 3); }, 130);
    return () => clearInterval(iv);
  }, [speaking, animated]);

  useEffect(() => {
    if (!animated) return;
    sway.value = withRepeat(withSequence(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      withTiming(-1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    breathe.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [animated]);

  useEffect(() => {
    tilt.value = withSpring(e.tension * (emotion === 'angry' ? 1 : emotion === 'broken' ? -1 : 0.4), {
      damping: 14, stiffness: 90,
    });
  }, [emotion]);

  const headStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: sway.value * 2.2 },
      { translateY: breathe.value * 1.6 },
      { rotate: `${tilt.value * 2.4 + sway.value * 0.5}deg` },
    ],
  }));

  const f = face;
  const cx = 100;
  const cy = 104;
  const rw = 42 * f.jawWidth;
  const rh = 50 * f.faceLength;
  const eyeY = cy - rh * 0.12;
  const eyeDx = rw * 0.42;
  const eyeRx = 9.2;
  const eyeRy = 5.6 * (blink ? 0.06 : e.eyeOpen) * (1 - e.squint * 0.35);
  const browY = eyeY - 13 + e.browY;
  const noseW = 7.5 * f.noseWidth;
  const my = cy + rh * 0.56;
  const mw = 13 * f.lipFullness + 3;
  const gx = gaze[0] + e.gazeBias[0];
  const gy = gaze[1] + e.gazeBias[1];

  const mk = useMemo(() => {
    if (speaking && talk > 0) return talk === 1 ? 'open' : 'neutral';
    return e.mouth;
  }, [speaking, talk, e.mouth]);

  const sweatCount = Math.min(4, e.sweat + (stress > 70 ? 2 : stress > 45 ? 1 : 0));

  const headPath = `M${cx - rw},${cy}
    C${cx - rw},${cy - rh * 1.05} ${cx - rw * 0.56},${cy - rh * 1.3} ${cx},${cy - rh * 1.3}
    C${cx + rw * 0.56},${cy - rh * 1.3} ${cx + rw},${cy - rh * 1.05} ${cx + rw},${cy}
    C${cx + rw * 0.99},${cy + rh * 0.5} ${cx + rw * 0.58},${cy + rh * 1.16} ${cx},${cy + rh * 1.22}
    C${cx - rw * 0.58},${cy + rh * 1.16} ${cx - rw * 0.99},${cy + rh * 0.5} ${cx - rw},${cy} Z`;

  return (
    <View style={{ width: size, height: size * 1.2 }}>
      <Animated.View style={[StyleSheet.absoluteFill, animated ? headStyle : undefined]}>
        <Svg width="100%" height="100%" viewBox="0 0 200 240">
          <Defs>
            <RadialGradient id="skinG" cx="42%" cy="32%" r="78%">
              <Stop offset="0%" stopColor={shade(f.skin, 22)} />
              <Stop offset="52%" stopColor={f.skin} />
              <Stop offset="100%" stopColor={f.skinShadow} />
            </RadialGradient>
            <LinearGradient id="rim" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#7FE7FF" stopOpacity="0.5" />
              <Stop offset="35%" stopColor="#7FE7FF" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="keylight" x1="0" y1="0" x2="0.6" y2="1">
              <Stop offset="0%" stopColor="#FFF3E0" stopOpacity="0.22" />
              <Stop offset="60%" stopColor="#FFF3E0" stopOpacity="0" />
            </LinearGradient>
            <RadialGradient id="irisG" cx="42%" cy="35%" r="65%">
              <Stop offset="0%" stopColor={shade(f.eyeColor, 55)} />
              <Stop offset="70%" stopColor={f.eyeColor} />
              <Stop offset="100%" stopColor={shade(f.eyeColor, -50)} />
            </RadialGradient>
            <LinearGradient id="clothG" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={shade(f.clothing, 16)} />
              <Stop offset="100%" stopColor={shade(f.clothing, -18)} />
            </LinearGradient>
            <ClipPath id="headClip"><Path d={headPath} /></ClipPath>
          </Defs>

          {/* neck */}
          <Path d={`M${cx - 20},${cy + rh * 0.95} L${cx - 22},${cy + rh * 1.55} L${cx + 22},${cy + rh * 1.55} L${cx + 20},${cy + rh * 0.95} Z`} fill={f.skinShadow} />
          <Ellipse cx={cx} cy={cy + rh * 1.02} rx={22} ry={9} fill={shade(f.skinShadow, -18)} opacity={0.6} />

          {/* shoulders / clothing */}
          <G>
            <Path d={`M${cx - 100},240 C${cx - 86},${cy + rh * 1.42} ${cx - 40},${cy + rh * 1.3} ${cx},${cy + rh * 1.36} C${cx + 40},${cy + rh * 1.3} ${cx + 86},${cy + rh * 1.42} ${cx + 100},240 Z`} fill="url(#clothG)" />
            <Collar kind={f.collar} color={f.clothing} accent={f.clothingAccent} cx={cx} cy={cy} rh={rh} />
          </G>

          {/* ears */}
          <Ellipse cx={cx - rw * 0.99} cy={cy + rh * 0.06} rx={6.5} ry={11} fill={f.skinShadow} />
          <Ellipse cx={cx + rw * 0.99} cy={cy + rh * 0.06} rx={6.5} ry={11} fill={f.skinShadow} />
          {f.earring && <Circle cx={cx + rw * 1.0} cy={cy + rh * 0.24} r={2.6} fill="#E8D48A" />}

          {/* head */}
          <Path d={headPath} fill="url(#skinG)" />

          <G clipPath="url(#headClip)">
            {/* cheekbone shading */}
            {hi && (
              <>
                <Ellipse cx={cx - rw * 0.62} cy={cy + rh * 0.2} rx={rw * 0.34 * f.cheekbone} ry={rh * 0.22} fill={f.skinShadow} opacity={0.3} />
                <Ellipse cx={cx + rw * 0.62} cy={cy + rh * 0.2} rx={rw * 0.34 * f.cheekbone} ry={rh * 0.22} fill={f.skinShadow} opacity={0.3} />
                <Ellipse cx={cx} cy={cy + rh * 0.98} rx={rw * 0.44} ry={rh * 0.18} fill={f.skinShadow} opacity={0.28} />
              </>
            )}
            {/* blush */}
            {e.blush > 0 && (
              <>
                <Ellipse cx={cx - rw * 0.6} cy={cy + rh * 0.24} rx={rw * 0.3} ry={rh * 0.15} fill="#E06A6A" opacity={e.blush * 0.5} />
                <Ellipse cx={cx + rw * 0.6} cy={cy + rh * 0.24} rx={rw * 0.3} ry={rh * 0.15} fill="#E06A6A" opacity={e.blush * 0.5} />
              </>
            )}
            {/* freckles */}
            {f.freckles && hi && Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return <Circle key={i} cx={cx + Math.cos(a) * rw * (0.35 + (i % 3) * 0.18)} cy={cy + rh * 0.16 + Math.sin(a) * rh * 0.1} r={0.9} fill={shade(f.skinShadow, -30)} opacity={0.5} />;
            })}
            {/* age lines */}
            {f.age > 46 && hi && (
              <>
                <Path d={`M${cx - rw * 0.5},${browY - 8} Q${cx},${browY - 12} ${cx + rw * 0.5},${browY - 8}`} stroke={f.skinShadow} strokeWidth={1.2} fill="none" opacity={0.45} />
                <Path d={`M${cx - rw * 0.44},${browY - 14} Q${cx},${browY - 18} ${cx + rw * 0.44},${browY - 14}`} stroke={f.skinShadow} strokeWidth={1} fill="none" opacity={0.3} />
                <Path d={`M${cx - rw * 0.5},${my - 10} Q${cx - rw * 0.44},${my + 4} ${cx - rw * 0.34},${my + 10}`} stroke={f.skinShadow} strokeWidth={1.1} fill="none" opacity={0.35} />
                <Path d={`M${cx + rw * 0.5},${my - 10} Q${cx + rw * 0.44},${my + 4} ${cx + rw * 0.34},${my + 10}`} stroke={f.skinShadow} strokeWidth={1.1} fill="none" opacity={0.35} />
              </>
            )}
            {f.scar && <Path d={`M${cx + rw * 0.5},${cy - rh * 0.42} L${cx + rw * 0.68},${cy - rh * 0.05}`} stroke={shade(f.skinShadow, -20)} strokeWidth={1.6} opacity={0.7} />}

            {/* eye sockets */}
            <Ellipse cx={cx - eyeDx} cy={eyeY} rx={eyeRx + 3} ry={7.5} fill={f.skinShadow} opacity={0.34} />
            <Ellipse cx={cx + eyeDx} cy={eyeY} rx={eyeRx + 3} ry={7.5} fill={f.skinShadow} opacity={0.34} />

            {/* eyes */}
            {[-1, 1].map((s) => (
              <G key={s}>
                <Ellipse cx={cx + s * eyeDx} cy={eyeY} rx={eyeRx} ry={Math.max(0.4, eyeRy)} fill="#F7F9FC" />
                {eyeRy > 1.4 && (
                  <>
                    <Circle cx={cx + s * eyeDx + gx} cy={eyeY + gy * 0.55} r={4.3} fill="url(#irisG)" />
                    <Circle cx={cx + s * eyeDx + gx} cy={eyeY + gy * 0.55} r={2.0} fill="#0B0D12" />
                    <Circle cx={cx + s * eyeDx + gx - 1.5} cy={eyeY + gy * 0.55 - 1.6} r={1.3} fill="#FFFFFF" opacity={0.9} />
                    {hi && <Circle cx={cx + s * eyeDx + gx + 1.8} cy={eyeY + gy * 0.55 + 1.4} r={0.7} fill="#BFE8FF" opacity={0.6} />}
                  </>
                )}
                {/* upper lid shadow */}
                <Path d={`M${cx + s * eyeDx - eyeRx},${eyeY} A${eyeRx},${Math.max(0.5, eyeRy)} 0 0 1 ${cx + s * eyeDx + eyeRx},${eyeY}`} fill="none" stroke={shade(f.skinShadow, -34)} strokeWidth={1.5} />
                {/* lower lid */}
                <Path d={`M${cx + s * eyeDx - eyeRx},${eyeY + 0.5} A${eyeRx},${Math.max(0.5, eyeRy)} 0 0 0 ${cx + s * eyeDx + eyeRx},${eyeY + 0.5}`} fill="none" stroke={f.skinShadow} strokeWidth={0.9} opacity={0.7} />
              </G>
            ))}

            {/* brows */}
            {[-1, 1].map((s) => {
              const bx = cx + s * eyeDx;
              const angle = e.browAngle * s * -1;
              const inner = e.browInner;
              return (
                <Path
                  key={s}
                  d={`M${bx - 11},${browY + angle * 0.32 + (s < 0 ? 0 : inner * 0.2)} Q${bx},${browY - 3.4 - angle * 0.22} ${bx + 11},${browY + angle * -0.32 + (s < 0 ? inner * 0.2 : 0)}`}
                  stroke={shade(f.hairColor, -18)}
                  strokeWidth={3.1 * f.browThickness}
                  strokeLinecap="round"
                  fill="none"
                />
              );
            })}

            {/* nose */}
            <Path d={`M${cx},${eyeY + 3} C${cx - 1.6},${cy + rh * 0.16} ${cx - noseW * 0.7},${cy + rh * 0.3} ${cx - noseW * 0.5},${cy + rh * 0.35}`} stroke={f.skinShadow} strokeWidth={1.7} fill="none" opacity={0.75} />
            <Ellipse cx={cx - noseW * 0.62} cy={cy + rh * 0.36} rx={2.3} ry={1.5} fill={shade(f.skinShadow, -34)} opacity={0.85} />
            <Ellipse cx={cx + noseW * 0.62} cy={cy + rh * 0.36} rx={2.3} ry={1.5} fill={shade(f.skinShadow, -34)} opacity={0.85} />
            <Path d={`M${cx - noseW},${cy + rh * 0.34} Q${cx},${cy + rh * 0.44} ${cx + noseW},${cy + rh * 0.34}`} stroke={f.skinShadow} strokeWidth={1.2} fill="none" opacity={0.5} />

            {/* mouth */}
            <Path d={mouthPath(mk, cx, my, mw, f.lipFullness)} fill={mk === 'open' || mk === 'sob' ? '#40151C' : shade(f.skinShadow, -46)} />
            {(mk === 'open' || mk === 'sob') && (
              <Path d={`M${cx - mw * 0.5},${my - 0.5} Q${cx},${my - 3} ${cx + mw * 0.5},${my - 0.5} Q${cx},${my + 2} ${cx - mw * 0.5},${my - 0.5} Z`} fill="#F4F6F8" opacity={0.85} />
            )}
            <Path d={`M${cx - mw * 0.9},${my - 0.5} Q${cx},${my - 2.4} ${cx + mw * 0.9},${my - 0.5}`} stroke={shade(f.skinShadow, -20)} strokeWidth={0.9} fill="none" opacity={0.6} />

            <FacialHair kind={f.facialHair} color={f.hairColor} cx={cx} cy={cy} rw={rw} rh={rh} my={my} />

            {/* key light + rim */}
            {hi && <Path d={headPath} fill="url(#keylight)" />}
            {hi && <Path d={headPath} fill="url(#rim)" />}
          </G>

          <Hair style={f.hairStyle} color={f.hairColor} cx={cx} cy={cy} rw={rw} rh={rh} />

          {/* glasses */}
          {f.glasses > 0 && (
            <G opacity={0.95}>
              <Circle cx={cx - eyeDx} cy={eyeY} r={13} fill="#9FD8F0" fillOpacity={0.08} stroke="#C9D6E4" strokeWidth={f.glasses === 2 ? 2.6 : 1.3} />
              <Circle cx={cx + eyeDx} cy={eyeY} r={13} fill="#9FD8F0" fillOpacity={0.08} stroke="#C9D6E4" strokeWidth={f.glasses === 2 ? 2.6 : 1.3} />
              <Line x1={cx - eyeDx + 13} y1={eyeY} x2={cx + eyeDx - 13} y2={eyeY} stroke="#C9D6E4" strokeWidth={f.glasses === 2 ? 2.4 : 1.2} />
              <Line x1={cx - eyeDx - 13} y1={eyeY} x2={cx - rw} y2={eyeY - 3} stroke="#C9D6E4" strokeWidth={1.2} />
              <Line x1={cx + eyeDx + 13} y1={eyeY} x2={cx + rw} y2={eyeY - 3} stroke="#C9D6E4" strokeWidth={1.2} />
              {hi && <Path d={`M${cx - eyeDx - 9},${eyeY + 7} L${cx - eyeDx + 4},${eyeY - 9}`} stroke="#FFFFFF" strokeWidth={2} opacity={0.25} />}
            </G>
          )}

          {/* sweat */}
          {Array.from({ length: sweatCount }).map((_, i) => {
            const sx = cx + (i % 2 === 0 ? -1 : 1) * rw * (0.62 + i * 0.08);
            const sy = cy - rh * (0.62 - i * 0.2);
            return (
              <G key={i}>
                <Path d={`M${sx},${sy} q3,4 0,7 q-3,-3 0,-7 Z`} fill="#BFE8FF" opacity={0.7} />
                <Circle cx={sx + 0.6} cy={sy + 4.5} r={1} fill="#FFFFFF" opacity={0.6} />
              </G>
            );
          })}
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Portraits are expensive to re-render; only redraw when something visible changes. */
const Portrait = React.memo(PortraitInner, (a, b) =>
  a.face === b.face &&
  a.emotion === b.emotion &&
  a.size === b.size &&
  a.quality === b.quality &&
  a.animated === b.animated &&
  a.speaking === b.speaking &&
  Math.round((a.stress ?? 0) / 10) === Math.round((b.stress ?? 0) / 10)
);

export default Portrait;
