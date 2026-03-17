/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Avatar Engine — Production-grade 3D avatar system
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * 1. TTS with viseme-based lip sync (Worker OpenAI TTS + Web Speech API fallback)
 * 2. Expression system mapped to sentiment analysis output
 * 3. Gesture library: pointing, waving, nodding, shrugging, thinking, celebrating
 * 4. Camera controls: zoom, pan, preset angles, smooth transitions
 * 5. LOD (Level of Detail) for mobile/low-end devices
 * 6. WebGPU rendering path with WebGL fallback
 */

// ══════════════════════════════════════════════════════
// 1. TYPES & INTERFACES
// ══════════════════════════════════════════════════════

export type Viseme = 'rest' | 'aa' | 'ee' | 'ih' | 'oh' | 'oo' | 'ss' | 'th' | 'ff' | 'dd' | 'kk' | 'mm' | 'nn' | 'rr' | 'ch';

export interface VisemeFrame {
  time: number;
  viseme: Viseme;
  weight: number;
  duration: number;
}

export type Expression = 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry' | 'thinking' | 'confused' | 'excited';

export type Gesture = 'idle' | 'nod' | 'shake' | 'wave' | 'point' | 'shrug' | 'think' | 'celebrate' | 'lean_forward' | 'lean_back';

export type CameraPreset = 'default' | 'closeup' | 'wide' | 'side_left' | 'side_right' | 'top_down' | 'dramatic';

export type LODLevel = 'high' | 'medium' | 'low' | 'minimal';

export type RenderBackend = 'webgpu' | 'webgl' | 'canvas2d';

export interface AvatarColors {
  head: number;
  body: number;
  eyes: number;
  accent: number;
}

export interface AvatarState {
  expression: Expression;
  gesture: Gesture;
  isSpeaking: boolean;
  currentViseme: Viseme;
  visemeWeight: number;
  sentiment: string;
  cameraPreset: CameraPreset;
  lodLevel: LODLevel;
  renderBackend: RenderBackend;
}

export interface TTSRequest {
  text: string;
  employeeId: string;
  voice?: string;
}

export interface TTSResponse {
  audio?: string; // base64 mp3
  format?: string;
  fallback?: string;
  text?: string;
  voiceConfig?: { rate: number; pitch: number; volume: number; lang: string };
  visemes?: VisemeFrame[];
  durationEstimate?: number;
}

// ══════════════════════════════════════════════════════
// 2. VISEME MOUTH SHAPES — Morph target definitions
// ══════════════════════════════════════════════════════

export interface MouthShape {
  scaleX: number;
  scaleY: number;
  positionY: number;
  roundness: number; // 0 = flat, 1 = round (affects geometry)
}

export const VISEME_SHAPES: Record<Viseme, MouthShape> = {
  rest:  { scaleX: 1.0,  scaleY: 1.0,  positionY: 0,     roundness: 0 },
  aa:    { scaleX: 1.4,  scaleY: 2.8,  positionY: -0.01, roundness: 0.8 },  // wide open
  ee:    { scaleX: 1.8,  scaleY: 1.4,  positionY: 0,     roundness: 0.2 },  // wide smile
  ih:    { scaleX: 1.3,  scaleY: 1.6,  positionY: 0,     roundness: 0.3 },  // slight open
  oh:    { scaleX: 1.1,  scaleY: 2.2,  positionY: -0.005,roundness: 0.9 },  // rounded
  oo:    { scaleX: 0.7,  scaleY: 1.8,  positionY: 0,     roundness: 1.0 },  // pursed
  ss:    { scaleX: 1.2,  scaleY: 0.5,  positionY: 0,     roundness: 0.1 },  // teeth close
  th:    { scaleX: 1.1,  scaleY: 1.0,  positionY: 0,     roundness: 0.2 },  // tongue tip
  ff:    { scaleX: 1.3,  scaleY: 0.6,  positionY: 0.003, roundness: 0.1 },  // bottom lip tuck
  dd:    { scaleX: 1.0,  scaleY: 1.2,  positionY: 0,     roundness: 0.3 },  // tap
  kk:    { scaleX: 1.1,  scaleY: 1.5,  positionY: -0.003,roundness: 0.5 },  // back open
  mm:    { scaleX: 1.0,  scaleY: 0.3,  positionY: 0.002, roundness: 0 },    // lips pressed
  nn:    { scaleX: 1.1,  scaleY: 0.8,  positionY: 0,     roundness: 0.2 },  // nasal
  rr:    { scaleX: 0.9,  scaleY: 1.3,  positionY: 0,     roundness: 0.6 },  // slight round
  ch:    { scaleX: 0.8,  scaleY: 1.4,  positionY: 0,     roundness: 0.7 },  // puckered
};

// ══════════════════════════════════════════════════════
// 3. EXPRESSION SYSTEM — Facial morph definitions
// ══════════════════════════════════════════════════════

export interface FacialExpression {
  leftBrowY: number;      // delta from rest
  rightBrowY: number;
  leftBrowRot: number;    // radians
  rightBrowRot: number;
  eyeScaleY: number;      // 1 = normal, 0.1 = squint, 1.5 = wide
  pupilScale: number;     // 1 = normal, 1.3 = dilated
  mouthScaleX: number;
  mouthScaleY: number;
  mouthPosY: number;
  headTiltX: number;      // nod angle
  headTiltZ: number;      // side tilt
  cheekPuff: number;      // 0-1
  eyeEmissive: number;    // glow intensity
}

export const EXPRESSIONS: Record<Expression, FacialExpression> = {
  neutral: {
    leftBrowY: 0, rightBrowY: 0, leftBrowRot: 0.1, rightBrowRot: -0.1,
    eyeScaleY: 1, pupilScale: 1, mouthScaleX: 1, mouthScaleY: 1,
    mouthPosY: 0, headTiltX: 0, headTiltZ: 0, cheekPuff: 0, eyeEmissive: 0.5,
  },
  happy: {
    leftBrowY: 0.01, rightBrowY: 0.01, leftBrowRot: 0.15, rightBrowRot: -0.15,
    eyeScaleY: 0.85, pupilScale: 1.1, mouthScaleX: 1.6, mouthScaleY: 0.8,
    mouthPosY: 0.005, headTiltX: 0.05, headTiltZ: 0, cheekPuff: 0.3, eyeEmissive: 0.7,
  },
  sad: {
    leftBrowY: -0.01, rightBrowY: -0.01, leftBrowRot: -0.15, rightBrowRot: 0.15,
    eyeScaleY: 0.8, pupilScale: 0.9, mouthScaleX: 0.8, mouthScaleY: 1.2,
    mouthPosY: -0.008, headTiltX: -0.08, headTiltZ: 0.05, cheekPuff: 0, eyeEmissive: 0.3,
  },
  surprised: {
    leftBrowY: 0.04, rightBrowY: 0.04, leftBrowRot: 0, rightBrowRot: 0,
    eyeScaleY: 1.4, pupilScale: 1.3, mouthScaleX: 1.2, mouthScaleY: 2.5,
    mouthPosY: -0.01, headTiltX: 0.03, headTiltZ: 0, cheekPuff: 0, eyeEmissive: 0.9,
  },
  angry: {
    leftBrowY: -0.02, rightBrowY: -0.02, leftBrowRot: -0.25, rightBrowRot: 0.25,
    eyeScaleY: 0.7, pupilScale: 0.8, mouthScaleX: 0.9, mouthScaleY: 0.5,
    mouthPosY: 0, headTiltX: 0.1, headTiltZ: 0, cheekPuff: 0.1, eyeEmissive: 1.0,
  },
  thinking: {
    leftBrowY: 0.02, rightBrowY: -0.005, leftBrowRot: 0.2, rightBrowRot: 0.05,
    eyeScaleY: 0.9, pupilScale: 1, mouthScaleX: 0.7, mouthScaleY: 0.8,
    mouthPosY: 0.003, headTiltX: -0.05, headTiltZ: -0.1, cheekPuff: 0, eyeEmissive: 0.4,
  },
  confused: {
    leftBrowY: 0.02, rightBrowY: -0.01, leftBrowRot: 0.2, rightBrowRot: 0.15,
    eyeScaleY: 1.1, pupilScale: 1.05, mouthScaleX: 0.8, mouthScaleY: 1.1,
    mouthPosY: -0.003, headTiltX: 0, headTiltZ: 0.12, cheekPuff: 0, eyeEmissive: 0.5,
  },
  excited: {
    leftBrowY: 0.03, rightBrowY: 0.03, leftBrowRot: 0.1, rightBrowRot: -0.1,
    eyeScaleY: 1.25, pupilScale: 1.2, mouthScaleX: 1.5, mouthScaleY: 2.0,
    mouthPosY: 0, headTiltX: 0, headTiltZ: 0, cheekPuff: 0.4, eyeEmissive: 1.0,
  },
};

// Map sentiment labels (from NLU) → expressions
export function sentimentToExpression(sentiment: string): Expression {
  const map: Record<string, Expression> = {
    positive: 'happy', very_positive: 'excited', negative: 'sad', very_negative: 'angry',
    neutral: 'neutral', mixed: 'confused',
    // Intent-based mappings
    greeting: 'happy', farewell: 'happy', thanks: 'happy', complaint: 'sad',
    question: 'thinking', clarification: 'confused', request: 'neutral',
    feedback: 'thinking', followup: 'neutral',
    // Direct expression keywords
    happy: 'happy', sad: 'sad', angry: 'angry', surprised: 'surprised',
    thinking: 'thinking', confused: 'confused', excited: 'excited',
  };
  return map[sentiment?.toLowerCase()] || 'neutral';
}

// ══════════════════════════════════════════════════════
// 4. GESTURE LIBRARY — Skeletal animation definitions
// ══════════════════════════════════════════════════════

export interface GestureKeyframe {
  time: number; // 0-1 normalized
  // Head
  headRotX?: number;
  headRotY?: number;
  headRotZ?: number;
  headPosY?: number;
  // Shoulders
  leftShoulderY?: number;
  rightShoulderY?: number;
  leftShoulderRotZ?: number;
  rightShoulderRotZ?: number;
  // Body
  bodyRotX?: number;
  bodyRotY?: number;
  bodyRotZ?: number;
  bodyPosY?: number;
  // Arms (if present in LOD)
  leftArmRotZ?: number;
  rightArmRotZ?: number;
  leftArmRotX?: number;
  rightArmRotX?: number;
  // Hands
  leftHandRotZ?: number;
  rightHandRotZ?: number;
}

export interface GestureAnimation {
  name: Gesture;
  duration: number; // ms
  loop: boolean;
  keyframes: GestureKeyframe[];
  expressionOverride?: Expression;
}

export const GESTURE_ANIMATIONS: Record<Gesture, GestureAnimation> = {
  idle: {
    name: 'idle', duration: 4000, loop: true,
    keyframes: [
      { time: 0, headRotY: 0, bodyPosY: 0, leftShoulderY: 0, rightShoulderY: 0 },
      { time: 0.5, headRotY: 0.05, bodyPosY: 0.005, leftShoulderY: 0.003, rightShoulderY: -0.002 },
      { time: 1, headRotY: 0, bodyPosY: 0, leftShoulderY: 0, rightShoulderY: 0 },
    ],
  },
  nod: {
    name: 'nod', duration: 800, loop: false,
    keyframes: [
      { time: 0, headRotX: 0 },
      { time: 0.2, headRotX: 0.2 },
      { time: 0.4, headRotX: -0.05 },
      { time: 0.6, headRotX: 0.15 },
      { time: 0.8, headRotX: -0.02 },
      { time: 1, headRotX: 0 },
    ],
    expressionOverride: 'happy',
  },
  shake: {
    name: 'shake', duration: 1000, loop: false,
    keyframes: [
      { time: 0, headRotY: 0 },
      { time: 0.15, headRotY: -0.2 },
      { time: 0.35, headRotY: 0.2 },
      { time: 0.55, headRotY: -0.15 },
      { time: 0.75, headRotY: 0.1 },
      { time: 1, headRotY: 0 },
    ],
    expressionOverride: 'sad',
  },
  wave: {
    name: 'wave', duration: 1500, loop: false,
    keyframes: [
      { time: 0, rightShoulderY: 0, rightArmRotZ: 0, rightHandRotZ: 0 },
      { time: 0.15, rightShoulderY: 0.06, rightArmRotZ: -1.2, rightHandRotZ: 0 },
      { time: 0.3, rightShoulderY: 0.06, rightArmRotZ: -1.2, rightHandRotZ: 0.4 },
      { time: 0.45, rightShoulderY: 0.06, rightArmRotZ: -1.2, rightHandRotZ: -0.4 },
      { time: 0.6, rightShoulderY: 0.06, rightArmRotZ: -1.2, rightHandRotZ: 0.3 },
      { time: 0.75, rightShoulderY: 0.06, rightArmRotZ: -1.2, rightHandRotZ: -0.3 },
      { time: 0.9, rightShoulderY: 0.02, rightArmRotZ: -0.4, rightHandRotZ: 0 },
      { time: 1, rightShoulderY: 0, rightArmRotZ: 0, rightHandRotZ: 0 },
    ],
    expressionOverride: 'happy',
  },
  point: {
    name: 'point', duration: 1200, loop: false,
    keyframes: [
      { time: 0, rightShoulderY: 0, rightArmRotZ: 0, rightArmRotX: 0 },
      { time: 0.25, rightShoulderY: 0.03, rightArmRotZ: -0.8, rightArmRotX: -0.3 },
      { time: 0.6, rightShoulderY: 0.03, rightArmRotZ: -0.8, rightArmRotX: -0.3 },
      { time: 1, rightShoulderY: 0, rightArmRotZ: 0, rightArmRotX: 0 },
    ],
  },
  shrug: {
    name: 'shrug', duration: 1200, loop: false,
    keyframes: [
      { time: 0, leftShoulderY: 0, rightShoulderY: 0, headRotZ: 0, leftArmRotZ: 0, rightArmRotZ: 0 },
      { time: 0.3, leftShoulderY: 0.06, rightShoulderY: 0.06, headRotZ: 0.08, leftArmRotZ: 0.3, rightArmRotZ: -0.3 },
      { time: 0.6, leftShoulderY: 0.06, rightShoulderY: 0.06, headRotZ: 0.08, leftArmRotZ: 0.3, rightArmRotZ: -0.3 },
      { time: 1, leftShoulderY: 0, rightShoulderY: 0, headRotZ: 0, leftArmRotZ: 0, rightArmRotZ: 0 },
    ],
    expressionOverride: 'confused',
  },
  think: {
    name: 'think', duration: 2000, loop: false,
    keyframes: [
      { time: 0, headRotZ: 0, headRotX: 0, rightShoulderY: 0, rightArmRotZ: 0 },
      { time: 0.2, headRotZ: -0.1, headRotX: -0.08, rightShoulderY: 0.02, rightArmRotZ: -0.5 },
      { time: 0.7, headRotZ: -0.1, headRotX: -0.08, rightShoulderY: 0.02, rightArmRotZ: -0.5 },
      { time: 1, headRotZ: 0, headRotX: 0, rightShoulderY: 0, rightArmRotZ: 0 },
    ],
    expressionOverride: 'thinking',
  },
  celebrate: {
    name: 'celebrate', duration: 1800, loop: false,
    keyframes: [
      { time: 0, bodyPosY: 0, leftShoulderY: 0, rightShoulderY: 0, leftArmRotZ: 0, rightArmRotZ: 0 },
      { time: 0.1, bodyPosY: 0.03, leftShoulderY: 0.05, rightShoulderY: 0.05, leftArmRotZ: 1.0, rightArmRotZ: -1.0 },
      { time: 0.25, bodyPosY: 0.06, leftArmRotZ: 1.2, rightArmRotZ: -1.2 },
      { time: 0.4, bodyPosY: 0.03, leftArmRotZ: 0.8, rightArmRotZ: -0.8 },
      { time: 0.55, bodyPosY: 0.05, leftArmRotZ: 1.1, rightArmRotZ: -1.1 },
      { time: 0.7, bodyPosY: 0.02, leftArmRotZ: 0.6, rightArmRotZ: -0.6 },
      { time: 1, bodyPosY: 0, leftShoulderY: 0, rightShoulderY: 0, leftArmRotZ: 0, rightArmRotZ: 0 },
    ],
    expressionOverride: 'excited',
  },
  lean_forward: {
    name: 'lean_forward', duration: 1500, loop: false,
    keyframes: [
      { time: 0, bodyRotX: 0, headRotX: 0 },
      { time: 0.3, bodyRotX: 0.12, headRotX: 0.05 },
      { time: 0.7, bodyRotX: 0.12, headRotX: 0.05 },
      { time: 1, bodyRotX: 0, headRotX: 0 },
    ],
  },
  lean_back: {
    name: 'lean_back', duration: 1500, loop: false,
    keyframes: [
      { time: 0, bodyRotX: 0, headRotX: 0 },
      { time: 0.3, bodyRotX: -0.08, headRotX: -0.05 },
      { time: 0.7, bodyRotX: -0.08, headRotX: -0.05 },
      { time: 1, bodyRotX: 0, headRotX: 0 },
    ],
  },
};

// Map intent/sentiment to appropriate gestures
export function selectGesture(intent: string, sentiment: string): Gesture {
  const map: Record<string, Gesture> = {
    greeting: 'wave', farewell: 'wave', thanks: 'nod',
    question: 'think', clarification: 'think',
    complaint: 'lean_forward', request: 'nod',
    positive: 'nod', very_positive: 'celebrate',
    negative: 'shake', confused: 'shrug',
    surprised: 'lean_back',
  };
  return map[intent] || map[sentiment] || 'idle';
}

// ══════════════════════════════════════════════════════
// 5. CAMERA SYSTEM — Presets & smooth transitions
// ══════════════════════════════════════════════════════

export interface CameraConfig {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
}

export const CAMERA_PRESETS: Record<CameraPreset, CameraConfig> = {
  default:     { position: [0, 0.4, 3],     lookAt: [0, 0.3, 0],  fov: 45 },
  closeup:     { position: [0, 0.65, 1.6],  lookAt: [0, 0.65, 0], fov: 35 },
  wide:        { position: [0, 0.2, 4.5],   lookAt: [0, 0, 0],    fov: 55 },
  side_left:   { position: [-2, 0.5, 2],    lookAt: [0, 0.3, 0],  fov: 45 },
  side_right:  { position: [2, 0.5, 2],     lookAt: [0, 0.3, 0],  fov: 45 },
  top_down:    { position: [0, 3, 1.5],     lookAt: [0, 0.3, 0],  fov: 50 },
  dramatic:    { position: [-1, 0.8, 2.2],  lookAt: [0, 0.4, 0],  fov: 40 },
};

// ══════════════════════════════════════════════════════
// 6. LOD SYSTEM — Quality tiers
// ══════════════════════════════════════════════════════

export interface LODConfig {
  geometrySegments: number;    // sphere segments
  pixelRatio: number;          // renderer pixel ratio cap
  enableShadows: boolean;
  enableAntiAlias: boolean;
  enablePostProcess: boolean;
  maxLights: number;
  animationFPS: number;        // target frame cap
  enableArms: boolean;         // add arm meshes
  enableHands: boolean;
  enableFingers: boolean;
  mouthDetail: 'box' | 'torus' | 'morph';
}

export const LOD_CONFIGS: Record<LODLevel, LODConfig> = {
  high: {
    geometrySegments: 48, pixelRatio: 2, enableShadows: true, enableAntiAlias: true,
    enablePostProcess: true, maxLights: 5, animationFPS: 60, enableArms: true,
    enableHands: true, enableFingers: false, mouthDetail: 'morph',
  },
  medium: {
    geometrySegments: 32, pixelRatio: 1.5, enableShadows: false, enableAntiAlias: true,
    enablePostProcess: false, maxLights: 4, animationFPS: 30, enableArms: true,
    enableHands: true, enableFingers: false, mouthDetail: 'torus',
  },
  low: {
    geometrySegments: 16, pixelRatio: 1, enableShadows: false, enableAntiAlias: false,
    enablePostProcess: false, maxLights: 3, animationFPS: 24, enableArms: true,
    enableHands: false, enableFingers: false, mouthDetail: 'box',
  },
  minimal: {
    geometrySegments: 8, pixelRatio: 1, enableShadows: false, enableAntiAlias: false,
    enablePostProcess: false, maxLights: 2, animationFPS: 15, enableArms: false,
    enableHands: false, enableFingers: false, mouthDetail: 'box',
  },
};

// Auto-detect optimal LOD
export function detectLOD(): LODLevel {
  if (typeof navigator === 'undefined') return 'medium';

  const cores = navigator.hardwareConcurrency || 2;
  // @ts-ignore — deviceMemory is experimental
  const memory = (navigator as any).deviceMemory || 4;
  const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
  const isLowEnd = cores <= 2 || memory <= 2;
  const isHighEnd = cores >= 8 && memory >= 8 && !isMobile;

  if (isHighEnd) return 'high';
  if (isLowEnd || isMobile) return isMobile && isLowEnd ? 'minimal' : 'low';
  return 'medium';
}

// ══════════════════════════════════════════════════════
// 7. WEBGPU DETECTION
// ══════════════════════════════════════════════════════

export async function detectRenderBackend(): Promise<RenderBackend> {
  // Check WebGPU
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        const device = await adapter.requestDevice();
        if (device) {
          device.destroy(); // clean up test device
          return 'webgpu';
        }
      }
    } catch { /* fall through */ }
  }

  // Check WebGL
  try {
    const canvas = document.createElement('canvas');
    if (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) {
      return 'webgl';
    }
  } catch { /* fall through */ }

  return 'canvas2d';
}

// ══════════════════════════════════════════════════════
// 8. ANIMATION INTERPOLATION — Smooth blending
// ══════════════════════════════════════════════════════

// Smooth step (ease in-out)
export function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

// Lerp with easing
export function lerpSmooth(from: number, to: number, t: number): number {
  return from + (to - from) * smoothStep(Math.min(1, Math.max(0, t)));
}

// Interpolate between gesture keyframes
export function interpolateKeyframes(keyframes: GestureKeyframe[], t: number): GestureKeyframe {
  // Clamp t to 0-1
  t = Math.min(1, Math.max(0, t));

  // Find surrounding keyframes
  let prev = keyframes[0];
  let next = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (t >= keyframes[i].time && t <= keyframes[i + 1].time) {
      prev = keyframes[i];
      next = keyframes[i + 1];
      break;
    }
  }

  const segmentT = (t - prev.time) / Math.max(0.001, next.time - prev.time);
  const easedT = smoothStep(segmentT);

  // Interpolate all defined properties
  const result: GestureKeyframe = { time: t };
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  allKeys.delete('time');

  for (const key of allKeys) {
    const k = key as keyof GestureKeyframe;
    const pv = (prev[k] as number) ?? 0;
    const nv = (next[k] as number) ?? 0;
    (result as any)[k] = pv + (nv - pv) * easedT;
  }

  return result;
}

// Blend between two expressions
export function blendExpressions(from: FacialExpression, to: FacialExpression, t: number): FacialExpression {
  const easedT = smoothStep(Math.min(1, Math.max(0, t)));
  const result = {} as FacialExpression;
  for (const key of Object.keys(from) as (keyof FacialExpression)[]) {
    result[key] = from[key] + (to[key] - from[key]) * easedT;
  }
  return result;
}

// ══════════════════════════════════════════════════════
// 9. TTS + LIP SYNC ENGINE
// ══════════════════════════════════════════════════════

// Local viseme generation (fallback when Worker unavailable)
const LOCAL_PHONEME_MAP: Record<string, Viseme> = {
  'a': 'aa', 'e': 'ee', 'i': 'ih', 'o': 'oh', 'u': 'oo',
  'b': 'mm', 'p': 'mm', 'm': 'mm',
  'f': 'ff', 'v': 'ff',
  's': 'ss', 'z': 'ss', 'c': 'ss',
  't': 'dd', 'd': 'dd', 'n': 'nn', 'l': 'nn',
  'k': 'kk', 'g': 'kk',
  'r': 'rr', 'w': 'oo', 'y': 'ee', 'h': 'aa',
  ' ': 'rest', '.': 'rest', ',': 'rest', '!': 'rest', '?': 'rest',
};

export function generateLocalVisemes(text: string, durationMs?: number): VisemeFrame[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const totalDuration = durationMs || (words.length / 2.5) * 1000;
  const msPerChar = totalDuration / Math.max(text.length, 1);
  const frames: VisemeFrame[] = [];
  let currentTime = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i].toLowerCase();
    const viseme: Viseme = LOCAL_PHONEME_MAP[ch] || 'rest';
    const duration = msPerChar * (viseme === 'rest' ? 1.5 : 1);
    frames.push({
      time: Math.round(currentTime),
      viseme,
      weight: viseme === 'rest' ? 0 : 0.7 + Math.random() * 0.3,
      duration: Math.round(duration),
    });
    currentTime += duration;
  }

  // Merge consecutive same-viseme frames
  const merged: VisemeFrame[] = [];
  for (const f of frames) {
    const last = merged[merged.length - 1];
    if (last && last.viseme === f.viseme) {
      last.duration += f.duration;
    } else {
      merged.push({ ...f });
    }
  }
  return merged;
}

export class LipSyncEngine {
  private visemes: VisemeFrame[] = [];
  private startTime: number = 0;
  private playing: boolean = false;
  private audioElement: HTMLAudioElement | null = null;
  private speechSynth: SpeechSynthesisUtterance | null = null;

  get isPlaying(): boolean { return this.playing; }

  getCurrentViseme(): { viseme: Viseme; weight: number } {
    if (!this.playing || this.visemes.length === 0) {
      return { viseme: 'rest', weight: 0 };
    }

    const elapsed = Date.now() - this.startTime;

    // Find current viseme frame
    for (let i = this.visemes.length - 1; i >= 0; i--) {
      const f = this.visemes[i];
      if (elapsed >= f.time && elapsed < f.time + f.duration) {
        // Smooth blend within frame
        const frameProgress = (elapsed - f.time) / f.duration;
        const weight = f.weight * (frameProgress < 0.2 ? frameProgress / 0.2 : frameProgress > 0.8 ? (1 - frameProgress) / 0.2 : 1);
        return { viseme: f.viseme, weight: Math.min(1, weight) };
      }
    }

    // Past all frames
    this.playing = false;
    return { viseme: 'rest', weight: 0 };
  }

  async speak(text: string, ttsResponse?: TTSResponse): Promise<void> {
    this.stop();

    if (ttsResponse?.visemes) {
      this.visemes = ttsResponse.visemes;
    } else {
      this.visemes = generateLocalVisemes(text);
    }

    this.startTime = Date.now();
    this.playing = true;

    // Play audio if available
    if (ttsResponse?.audio) {
      this.audioElement = new Audio(`data:audio/mp3;base64,${ttsResponse.audio}`);
      this.audioElement.onended = () => { this.playing = false; };
      await this.audioElement.play().catch(() => { /* autoplay blocked */ });
    } else if (ttsResponse?.fallback === 'web_speech_api' || !ttsResponse?.audio) {
      // Use Web Speech API
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        if (ttsResponse?.voiceConfig) {
          utterance.rate = ttsResponse.voiceConfig.rate;
          utterance.pitch = ttsResponse.voiceConfig.pitch;
          utterance.volume = ttsResponse.voiceConfig.volume;
          utterance.lang = ttsResponse.voiceConfig.lang;
        }
        utterance.onend = () => { this.playing = false; };
        this.speechSynth = utterance;
        window.speechSynthesis.speak(utterance);
      }
    }
  }

  stop(): void {
    this.playing = false;
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    if (this.speechSynth) {
      window.speechSynthesis.cancel();
      this.speechSynth = null;
    }
  }
}

// ══════════════════════════════════════════════════════
// 10. AVATAR CONTROLLER — Unified state manager
// ══════════════════════════════════════════════════════

export class AvatarController {
  private state: AvatarState;
  private targetExpression: FacialExpression;
  private currentExpression: FacialExpression;
  private expressionBlendT: number = 1;
  private expressionBlendSpeed: number = 0.03;

  private currentGesture: GestureAnimation;
  private gestureStartTime: number = 0;
  private gestureActive: boolean = false;

  private targetCamera: CameraConfig;
  private currentCamera: CameraConfig;
  private cameraBlendT: number = 1;
  private cameraBlendSpeed: number = 0.02;

  public lipSync: LipSyncEngine;
  public lodConfig: LODConfig;

  constructor(lodLevel?: LODLevel) {
    const lod = lodLevel || detectLOD();
    this.lodConfig = LOD_CONFIGS[lod];
    this.lipSync = new LipSyncEngine();

    this.state = {
      expression: 'neutral', gesture: 'idle', isSpeaking: false,
      currentViseme: 'rest', visemeWeight: 0, sentiment: 'neutral',
      cameraPreset: 'default', lodLevel: lod, renderBackend: 'webgl',
    };

    this.targetExpression = EXPRESSIONS.neutral;
    this.currentExpression = { ...EXPRESSIONS.neutral };
    this.currentGesture = GESTURE_ANIMATIONS.idle;
    this.targetCamera = CAMERA_PRESETS.default;
    this.currentCamera = { ...CAMERA_PRESETS.default };
  }

  getState(): AvatarState { return this.state; }
  getLOD(): LODConfig { return this.lodConfig; }
  getCurrentExpression(): FacialExpression { return this.currentExpression; }
  getCurrentCamera(): CameraConfig { return this.currentCamera; }

  setExpression(expression: Expression): void {
    if (this.state.expression !== expression) {
      this.state.expression = expression;
      this.targetExpression = EXPRESSIONS[expression];
      this.expressionBlendT = 0;
    }
  }

  setSentiment(sentiment: string): void {
    this.state.sentiment = sentiment;
    this.setExpression(sentimentToExpression(sentiment));
  }

  triggerGesture(gesture: Gesture): void {
    if (gesture === 'idle' && this.gestureActive) return;
    this.state.gesture = gesture;
    this.currentGesture = GESTURE_ANIMATIONS[gesture];
    this.gestureStartTime = Date.now();
    this.gestureActive = true;

    if (this.currentGesture.expressionOverride) {
      this.setExpression(this.currentGesture.expressionOverride);
    }
  }

  setCamera(preset: CameraPreset): void {
    if (this.state.cameraPreset !== preset) {
      this.state.cameraPreset = preset;
      this.targetCamera = CAMERA_PRESETS[preset];
      this.cameraBlendT = 0;
    }
  }

  async speak(text: string, ttsResponse?: TTSResponse): Promise<void> {
    this.state.isSpeaking = true;
    await this.lipSync.speak(text, ttsResponse);
  }

  stopSpeaking(): void {
    this.state.isSpeaking = false;
    this.lipSync.stop();
  }

  // Call this every frame to update blending
  update(): {
    expression: FacialExpression;
    gestureFrame: GestureKeyframe;
    camera: CameraConfig;
    viseme: { viseme: Viseme; weight: number };
    isSpeaking: boolean;
  } {
    // Blend expression
    if (this.expressionBlendT < 1) {
      this.expressionBlendT = Math.min(1, this.expressionBlendT + this.expressionBlendSpeed);
      this.currentExpression = blendExpressions(this.currentExpression, this.targetExpression, this.expressionBlendT);
    }

    // Update gesture
    let gestureFrame: GestureKeyframe = { time: 0 };
    if (this.gestureActive) {
      const elapsed = Date.now() - this.gestureStartTime;
      let t = elapsed / this.currentGesture.duration;

      if (t >= 1) {
        if (this.currentGesture.loop) {
          t = t % 1;
        } else {
          this.gestureActive = false;
          this.state.gesture = 'idle';
          this.currentGesture = GESTURE_ANIMATIONS.idle;
          this.gestureStartTime = Date.now();
          this.gestureActive = true;
          t = 0;
        }
      }

      gestureFrame = interpolateKeyframes(this.currentGesture.keyframes, t);
    }

    // Blend camera
    if (this.cameraBlendT < 1) {
      this.cameraBlendT = Math.min(1, this.cameraBlendT + this.cameraBlendSpeed);
      const et = smoothStep(this.cameraBlendT);
      this.currentCamera = {
        position: [
          this.currentCamera.position[0] + (this.targetCamera.position[0] - this.currentCamera.position[0]) * et,
          this.currentCamera.position[1] + (this.targetCamera.position[1] - this.currentCamera.position[1]) * et,
          this.currentCamera.position[2] + (this.targetCamera.position[2] - this.currentCamera.position[2]) * et,
        ],
        lookAt: [
          this.currentCamera.lookAt[0] + (this.targetCamera.lookAt[0] - this.currentCamera.lookAt[0]) * et,
          this.currentCamera.lookAt[1] + (this.targetCamera.lookAt[1] - this.currentCamera.lookAt[1]) * et,
          this.currentCamera.lookAt[2] + (this.targetCamera.lookAt[2] - this.currentCamera.lookAt[2]) * et,
        ],
        fov: this.currentCamera.fov + (this.targetCamera.fov - this.currentCamera.fov) * et,
      };
    }

    // Get current viseme from lip sync
    const viseme = this.lipSync.getCurrentViseme();
    this.state.currentViseme = viseme.viseme;
    this.state.visemeWeight = viseme.weight;
    this.state.isSpeaking = this.lipSync.isPlaying;

    return {
      expression: this.currentExpression,
      gestureFrame,
      camera: this.currentCamera,
      viseme,
      isSpeaking: this.state.isSpeaking,
    };
  }

  // React to a chat message (convenience method combining sentiment + gesture)
  reactToMessage(intent: string, sentiment: string): void {
    this.setSentiment(sentiment);
    this.triggerGesture(selectGesture(intent, sentiment));
  }

  destroy(): void {
    this.lipSync.stop();
  }
}
