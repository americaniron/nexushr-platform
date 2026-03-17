/**
 * NexusHR Feature #30 — Real-Time Avatar Rendering Engine
 *
 * Enterprise-grade 3D avatar system:
 * - WebGL rendering pipeline with Three.js scene management
 * - Ready Player Me (RPM) avatar compatibility & import
 * - Facial animation system (52 ARKit blendshapes + custom morphs)
 * - Lip sync engine (viseme mapping, phoneme-to-morph, TTS sync)
 * - Emotional expression engine (7 primary + 12 compound expressions)
 * - Gesture animation system (procedural + keyframed, IK support)
 * - Avatar asset pipeline (import, optimize, LOD generation, caching)
 * - Animation timeline player (multi-track, easing, blending, sequencing)
 * - Avatar customization system (body, face, clothing, accessories)
 * - Enterprise avatar branding (custom uniforms, name badges, brand colors)
 */

import type { Env } from '../index';

// ─── Enums & Constants ──────────────────────────────────────────────

export type AvatarSource = 'ready_player_me' | 'custom_glb' | 'procedural' | 'template';
export type AvatarStatus = 'importing' | 'processing' | 'optimizing' | 'ready' | 'error' | 'archived';
export type LODLevel = 'ultra' | 'high' | 'medium' | 'low' | 'minimal';
export type AnimationType = 'idle' | 'gesture' | 'expression' | 'lipsync' | 'procedural' | 'physics' | 'custom';
export type BlendMode = 'override' | 'additive' | 'multiply' | 'blend';
export type EasingFunction = 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'cubic_bezier' | 'spring' | 'bounce' | 'elastic';
export type ExpressionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'disgusted' | 'fearful' | 'contempt' | 'confused' | 'thinking' | 'skeptical' | 'determined' | 'empathetic' | 'excited' | 'bored' | 'focused' | 'amused' | 'concerned' | 'confident';
export type GestureType = 'wave' | 'nod' | 'shake_head' | 'shrug' | 'point' | 'thumbs_up' | 'thumbs_down' | 'clap' | 'think' | 'lean_forward' | 'lean_back' | 'cross_arms' | 'open_hands' | 'writing' | 'typing' | 'presenting' | 'listening' | 'agreeing' | 'disagreeing' | 'explaining';
export type Viseme = 'sil' | 'PP' | 'FF' | 'TH' | 'DD' | 'kk' | 'CH' | 'SS' | 'nn' | 'RR' | 'aa' | 'E' | 'ih' | 'oh' | 'ou';
export type RenderQuality = 'cinematic' | 'high' | 'balanced' | 'performance' | 'mobile';
export type CustomizationCategory = 'body' | 'face' | 'hair' | 'clothing' | 'accessories' | 'skin' | 'eyes' | 'brand';

// ─── ARKit Blendshapes (52 standard) ────────────────────────────────

export const ARKIT_BLENDSHAPES = [
  'eyeBlinkLeft', 'eyeBlinkRight', 'eyeLookDownLeft', 'eyeLookDownRight',
  'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
  'eyeLookUpLeft', 'eyeLookUpRight', 'eyeSquintLeft', 'eyeSquintRight',
  'eyeWideLeft', 'eyeWideRight', 'jawForward', 'jawLeft', 'jawRight',
  'jawOpen', 'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthLeft',
  'mouthRight', 'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft',
  'mouthFrownRight', 'mouthDimpleLeft', 'mouthDimpleRight', 'mouthStretchLeft',
  'mouthStretchRight', 'mouthRollLower', 'mouthRollUpper', 'mouthShrugLower',
  'mouthShrugUpper', 'mouthPressLeft', 'mouthPressRight', 'mouthLowerDownLeft',
  'mouthLowerDownRight', 'mouthUpperUpLeft', 'mouthUpperUpRight', 'browDownLeft',
  'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight', 'noseSneerLeft',
  'noseSneerRight', 'tongueOut'
] as const;

// ─── Core Interfaces ────────────────────────────────────────────────

export interface AvatarProfile {
  id: string;
  tenant_id: string;
  employee_id: string;
  name: string;
  source: AvatarSource;
  status: AvatarStatus;
  rpm_url: string | null;
  model_url: string | null;
  thumbnail_url: string | null;
  lod_variants: LODVariant[];
  skeleton: SkeletonConfig;
  blendshapes: string[];
  customization: AvatarCustomization;
  branding: AvatarBranding;
  render_config: RenderConfig;
  animation_config: AnimationConfig;
  asset_metadata: AssetMetadata;
  created_at: string;
  updated_at: string;
}

export interface LODVariant {
  level: LODLevel;
  vertex_count: number;
  triangle_count: number;
  texture_resolution: number;
  file_size_kb: number;
  url: string | null;
  distance_threshold: number;
}

export interface SkeletonConfig {
  bone_count: number;
  root_bone: string;
  has_fingers: boolean;
  has_face_bones: boolean;
  ik_chains: IKChain[];
  bone_map: Record<string, string>;
}

export interface IKChain {
  name: string;
  root: string;
  effector: string;
  pole_target: string | null;
  chain_length: number;
  weight: number;
}

export interface AvatarCustomization {
  body: BodyCustomization;
  face: FaceCustomization;
  hair: HairCustomization;
  clothing: ClothingCustomization;
  accessories: AccessoryItem[];
  skin: SkinCustomization;
}

export interface BodyCustomization {
  height: number;
  build: 'slim' | 'average' | 'athletic' | 'heavy';
  proportions: Record<string, number>;
}

export interface FaceCustomization {
  shape: string;
  eye_color: string;
  eye_shape: string;
  eyebrow_style: string;
  nose_shape: string;
  mouth_shape: string;
  jawline: string;
  cheekbones: number;
  face_morphs: Record<string, number>;
}

export interface HairCustomization {
  style_id: string;
  color: string;
  highlights: string | null;
  length: number;
  physics_enabled: boolean;
}

export interface ClothingCustomization {
  outfit_id: string;
  top: string;
  bottom: string;
  shoes: string;
  colors: Record<string, string>;
  brand_override: boolean;
}

export interface AccessoryItem {
  id: string;
  type: 'glasses' | 'earrings' | 'necklace' | 'watch' | 'badge' | 'headset' | 'hat' | 'custom';
  model_url: string;
  attach_bone: string;
  offset: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export interface SkinCustomization {
  tone: string;
  texture_id: string;
  roughness: number;
  subsurface_scattering: number;
}

export interface AvatarBranding {
  enabled: boolean;
  company_logo_url: string | null;
  brand_colors: { primary: string; secondary: string; accent: string };
  uniform_template: string | null;
  name_badge: NameBadge | null;
  custom_accessories: AccessoryItem[];
}

export interface NameBadge {
  text: string;
  title: string;
  company: string;
  photo_url: string | null;
  style: 'modern' | 'classic' | 'minimal' | 'corporate';
  attach_position: 'chest_left' | 'chest_right' | 'lanyard';
}

export interface RenderConfig {
  quality: RenderQuality;
  max_fps: number;
  shadow_quality: 'off' | 'low' | 'medium' | 'high' | 'ultra';
  anti_aliasing: 'none' | 'fxaa' | 'smaa' | 'msaa_2x' | 'msaa_4x';
  ambient_occlusion: boolean;
  bloom: boolean;
  depth_of_field: boolean;
  environment_map: string;
  background: BackgroundConfig;
  lighting: LightingConfig;
  post_processing: PostProcessConfig;
}

export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'hdri' | 'office' | 'virtual' | 'transparent';
  color: string;
  gradient_end: string | null;
  hdri_url: string | null;
  blur_amount: number;
}

export interface LightingConfig {
  preset: 'studio' | 'office' | 'outdoor' | 'dramatic' | 'soft' | 'custom';
  key_light: LightSource;
  fill_light: LightSource;
  rim_light: LightSource;
  ambient_intensity: number;
  ambient_color: string;
}

export interface LightSource {
  type: 'directional' | 'point' | 'spot' | 'area';
  color: string;
  intensity: number;
  position: [number, number, number];
  cast_shadows: boolean;
}

export interface PostProcessConfig {
  tone_mapping: 'linear' | 'reinhard' | 'cineon' | 'aces' | 'filmic';
  exposure: number;
  contrast: number;
  saturation: number;
  color_grading: { shadows: string; midtones: string; highlights: string } | null;
}

export interface AnimationConfig {
  idle_animation: string;
  breathing_enabled: boolean;
  breathing_rate: number;
  eye_blink_rate: number;
  eye_saccade: boolean;
  micro_expressions: boolean;
  physics_hair: boolean;
  physics_clothing: boolean;
  gesture_library: string[];
  expression_library: string[];
}

export interface AssetMetadata {
  format: 'glb' | 'gltf' | 'vrm' | 'fbx';
  original_size_kb: number;
  optimized_size_kb: number;
  vertex_count: number;
  triangle_count: number;
  texture_count: number;
  material_count: number;
  animation_count: number;
  import_duration_ms: number;
  optimization_level: string;
}

// ─── Animation System Interfaces ────────────────────────────────────

export interface AnimationClip {
  id: string;
  name: string;
  type: AnimationType;
  duration_ms: number;
  fps: number;
  loop: boolean;
  tracks: AnimationTrack[];
  blend_in_ms: number;
  blend_out_ms: number;
  speed: number;
  layer: number;
  blend_mode: BlendMode;
  events: AnimationEvent[];
}

export interface AnimationTrack {
  target: string;
  property: 'position' | 'rotation' | 'scale' | 'blendshape' | 'visibility' | 'color';
  keyframes: Keyframe[];
  interpolation: 'linear' | 'step' | 'cubic' | 'catmull_rom';
}

export interface Keyframe {
  time_ms: number;
  value: number | number[];
  easing: EasingFunction;
  tangent_in?: number[];
  tangent_out?: number[];
}

export interface AnimationEvent {
  time_ms: number;
  type: 'sound' | 'particle' | 'callback' | 'expression' | 'gesture';
  data: Record<string, any>;
}

export interface AnimationTimeline {
  id: string;
  name: string;
  duration_ms: number;
  entries: TimelineEntry[];
  current_time_ms: number;
  playback_speed: number;
  is_playing: boolean;
  loop: boolean;
}

export interface TimelineEntry {
  clip_id: string;
  start_time_ms: number;
  duration_ms: number;
  layer: number;
  blend_mode: BlendMode;
  weight: number;
  speed: number;
}

// ─── Facial Animation & Lip Sync ────────────────────────────────────

export interface FacialAnimationState {
  blendshapes: Record<string, number>;
  expression: ExpressionType;
  expression_intensity: number;
  active_viseme: Viseme;
  viseme_weight: number;
  eye_target: [number, number, number] | null;
  blink_state: number;
}

export interface ExpressionPreset {
  name: ExpressionType;
  blendshapes: Record<string, number>;
  transition_ms: number;
  intensity_range: [number, number];
  compatible_gestures: GestureType[];
}

export interface LipSyncConfig {
  viseme_smoothing: number;
  viseme_strength: number;
  jaw_open_scale: number;
  phoneme_map: Record<string, Viseme>;
  co_articulation: boolean;
  emotion_blend: boolean;
  audio_analysis: AudioAnalysisConfig;
}

export interface AudioAnalysisConfig {
  sample_rate: number;
  fft_size: number;
  mel_bands: number;
  energy_threshold: number;
  silence_threshold_ms: number;
  vowel_emphasis: number;
}

export interface VisemeTimestamp {
  viseme: Viseme;
  start_ms: number;
  end_ms: number;
  weight: number;
  phoneme: string;
}

// ─── Speech Synchronization ─────────────────────────────────────────

export interface SpeechSyncSession {
  id: string;
  avatar_id: string;
  text: string;
  audio_url: string | null;
  viseme_timeline: VisemeTimestamp[];
  expression_cues: ExpressionCue[];
  gesture_cues: GestureCue[];
  duration_ms: number;
  status: 'generating' | 'ready' | 'playing' | 'paused' | 'completed';
  created_at: string;
}

export interface ExpressionCue {
  expression: ExpressionType;
  start_ms: number;
  duration_ms: number;
  intensity: number;
  blend_in_ms: number;
  blend_out_ms: number;
}

export interface GestureCue {
  gesture: GestureType;
  start_ms: number;
  duration_ms: number;
  intensity: number;
}

// ─── Expression Presets ─────────────────────────────────────────────

const EXPRESSION_PRESETS: Record<ExpressionType, Record<string, number>> = {
  neutral: {},
  happy: { mouthSmileLeft: 0.7, mouthSmileRight: 0.7, cheekSquintLeft: 0.4, cheekSquintRight: 0.4, eyeSquintLeft: 0.2, eyeSquintRight: 0.2, browInnerUp: 0.1 },
  sad: { mouthFrownLeft: 0.6, mouthFrownRight: 0.6, browInnerUp: 0.5, browDownLeft: 0.3, browDownRight: 0.3, eyeLookDownLeft: 0.2, eyeLookDownRight: 0.2 },
  angry: { browDownLeft: 0.8, browDownRight: 0.8, eyeSquintLeft: 0.4, eyeSquintRight: 0.4, noseSneerLeft: 0.5, noseSneerRight: 0.5, jawForward: 0.2, mouthPressLeft: 0.3, mouthPressRight: 0.3 },
  surprised: { eyeWideLeft: 0.8, eyeWideRight: 0.8, browInnerUp: 0.6, browOuterUpLeft: 0.7, browOuterUpRight: 0.7, jawOpen: 0.4, mouthFunnel: 0.2 },
  disgusted: { noseSneerLeft: 0.7, noseSneerRight: 0.7, mouthUpperUpLeft: 0.4, mouthUpperUpRight: 0.4, browDownLeft: 0.3, browDownRight: 0.3, mouthFrownLeft: 0.3, mouthFrownRight: 0.3 },
  fearful: { eyeWideLeft: 0.7, eyeWideRight: 0.7, browInnerUp: 0.8, mouthStretchLeft: 0.4, mouthStretchRight: 0.4, jawOpen: 0.2 },
  contempt: { mouthSmileRight: 0.4, mouthDimpleRight: 0.3, browDownLeft: 0.2, eyeSquintRight: 0.15 },
  confused: { browInnerUp: 0.4, browDownLeft: 0.3, eyeSquintLeft: 0.2, mouthPucker: 0.15, jawLeft: 0.1 },
  thinking: { eyeLookUpLeft: 0.3, eyeLookUpRight: 0.2, browInnerUp: 0.3, mouthPucker: 0.1, mouthLeft: 0.15 },
  skeptical: { browDownLeft: 0.1, browOuterUpRight: 0.5, eyeSquintLeft: 0.3, mouthSmileLeft: 0.1, mouthPressRight: 0.15 },
  determined: { browDownLeft: 0.5, browDownRight: 0.5, jawForward: 0.15, mouthPressLeft: 0.3, mouthPressRight: 0.3, eyeSquintLeft: 0.2, eyeSquintRight: 0.2 },
  empathetic: { browInnerUp: 0.4, mouthSmileLeft: 0.3, mouthSmileRight: 0.3, eyeSquintLeft: 0.15, eyeSquintRight: 0.15, mouthFrownLeft: 0.1, mouthFrownRight: 0.1 },
  excited: { eyeWideLeft: 0.4, eyeWideRight: 0.4, mouthSmileLeft: 0.8, mouthSmileRight: 0.8, browOuterUpLeft: 0.4, browOuterUpRight: 0.4, cheekSquintLeft: 0.5, cheekSquintRight: 0.5, jawOpen: 0.2 },
  bored: { eyeBlinkLeft: 0.3, eyeBlinkRight: 0.3, eyeLookDownLeft: 0.3, eyeLookDownRight: 0.3, mouthFrownLeft: 0.15, mouthFrownRight: 0.15, jawOpen: 0.05 },
  focused: { browDownLeft: 0.3, browDownRight: 0.3, eyeSquintLeft: 0.25, eyeSquintRight: 0.25, mouthPressLeft: 0.1, mouthPressRight: 0.1 },
  amused: { mouthSmileLeft: 0.5, mouthSmileRight: 0.5, cheekSquintLeft: 0.3, cheekSquintRight: 0.3, eyeSquintLeft: 0.3, eyeSquintRight: 0.3, jawOpen: 0.15 },
  concerned: { browInnerUp: 0.6, browDownLeft: 0.2, browDownRight: 0.2, mouthFrownLeft: 0.3, mouthFrownRight: 0.3, eyeSquintLeft: 0.1, eyeSquintRight: 0.1 },
  confident: { mouthSmileLeft: 0.3, mouthSmileRight: 0.3, browOuterUpLeft: 0.15, browOuterUpRight: 0.15, jawForward: 0.1 }
};

// ─── Viseme-Phoneme Mapping ─────────────────────────────────────────

const PHONEME_TO_VISEME: Record<string, Viseme> = {
  // Silence
  'SIL': 'sil', 'SP': 'sil', 'PAU': 'sil',
  // Bilabial (lips together)
  'P': 'PP', 'B': 'PP', 'M': 'PP',
  // Labiodental (teeth on lip)
  'F': 'FF', 'V': 'FF',
  // Dental (tongue between teeth)
  'TH': 'TH', 'DH': 'TH',
  // Alveolar (tongue tip)
  'T': 'DD', 'D': 'DD', 'L': 'DD',
  // Velar (back of tongue)
  'K': 'kk', 'G': 'kk', 'NG': 'kk',
  // Postalveolar (tongue behind ridge)
  'SH': 'CH', 'ZH': 'CH', 'CH': 'CH', 'JH': 'CH',
  // Sibilant
  'S': 'SS', 'Z': 'SS',
  // Nasal
  'N': 'nn',
  // Rhotic
  'R': 'RR', 'ER': 'RR',
  // Open vowels
  'AA': 'aa', 'AE': 'aa', 'AH': 'aa',
  // Mid vowels
  'EH': 'E', 'EY': 'E',
  // Close vowels
  'IH': 'ih', 'IY': 'ih',
  // Rounded vowels
  'AO': 'oh', 'OW': 'oh',
  // Close rounded
  'UH': 'ou', 'UW': 'ou', 'W': 'ou', 'OY': 'ou',
  // Approximants
  'Y': 'ih', 'HH': 'sil'
};

const VISEME_TO_BLENDSHAPES: Record<Viseme, Record<string, number>> = {
  sil: {},
  PP: { mouthClose: 0.8, mouthPressLeft: 0.4, mouthPressRight: 0.4 },
  FF: { mouthFunnel: 0.3, mouthRollLower: 0.4, mouthUpperUpLeft: 0.1, mouthUpperUpRight: 0.1 },
  TH: { tongueOut: 0.4, jawOpen: 0.15, mouthFunnel: 0.1 },
  DD: { jawOpen: 0.2, mouthClose: 0.1, tongueOut: 0.15 },
  kk: { jawOpen: 0.2, mouthStretchLeft: 0.15, mouthStretchRight: 0.15 },
  CH: { mouthFunnel: 0.5, jawOpen: 0.15, mouthPucker: 0.2 },
  SS: { mouthStretchLeft: 0.3, mouthStretchRight: 0.3, jawOpen: 0.1 },
  nn: { mouthClose: 0.4, jawOpen: 0.05, mouthPressLeft: 0.2, mouthPressRight: 0.2 },
  RR: { mouthFunnel: 0.4, mouthPucker: 0.3, jawOpen: 0.1 },
  aa: { jawOpen: 0.6, mouthLowerDownLeft: 0.3, mouthLowerDownRight: 0.3 },
  E: { jawOpen: 0.3, mouthStretchLeft: 0.4, mouthStretchRight: 0.4 },
  ih: { jawOpen: 0.2, mouthStretchLeft: 0.5, mouthStretchRight: 0.5, mouthSmileLeft: 0.1, mouthSmileRight: 0.1 },
  oh: { jawOpen: 0.45, mouthFunnel: 0.5, mouthPucker: 0.3 },
  ou: { mouthFunnel: 0.7, mouthPucker: 0.6, jawOpen: 0.2 }
};

// ─── Gesture Definitions ────────────────────────────────────────────

const GESTURE_DEFINITIONS: Record<GestureType, { duration_ms: number; bones: string[]; layer: number; compatible_expressions: ExpressionType[] }> = {
  wave: { duration_ms: 2000, bones: ['RightArm', 'RightForeArm', 'RightHand'], layer: 2, compatible_expressions: ['happy', 'excited', 'neutral'] },
  nod: { duration_ms: 800, bones: ['Head', 'Neck'], layer: 3, compatible_expressions: ['happy', 'empathetic', 'confident', 'neutral', 'focused'] },
  shake_head: { duration_ms: 1000, bones: ['Head', 'Neck'], layer: 3, compatible_expressions: ['sad', 'disgusted', 'skeptical', 'concerned'] },
  shrug: { duration_ms: 1500, bones: ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'Spine2'], layer: 2, compatible_expressions: ['confused', 'neutral', 'amused'] },
  point: { duration_ms: 1200, bones: ['RightArm', 'RightForeArm', 'RightHand', 'RightHandIndex1'], layer: 2, compatible_expressions: ['confident', 'focused', 'excited'] },
  thumbs_up: { duration_ms: 1000, bones: ['RightArm', 'RightForeArm', 'RightHand', 'RightHandThumb1'], layer: 2, compatible_expressions: ['happy', 'confident', 'satisfied'] },
  thumbs_down: { duration_ms: 1000, bones: ['RightArm', 'RightForeArm', 'RightHand', 'RightHandThumb1'], layer: 2, compatible_expressions: ['sad', 'disgusted', 'angry'] },
  clap: { duration_ms: 1800, bones: ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand'], layer: 2, compatible_expressions: ['happy', 'excited'] },
  think: { duration_ms: 2500, bones: ['RightArm', 'RightForeArm', 'RightHand', 'Head'], layer: 2, compatible_expressions: ['thinking', 'confused', 'focused'] },
  lean_forward: { duration_ms: 1500, bones: ['Spine', 'Spine1', 'Spine2'], layer: 1, compatible_expressions: ['focused', 'empathetic', 'concerned'] },
  lean_back: { duration_ms: 1500, bones: ['Spine', 'Spine1', 'Spine2'], layer: 1, compatible_expressions: ['confident', 'bored', 'amused'] },
  cross_arms: { duration_ms: 2000, bones: ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'], layer: 2, compatible_expressions: ['skeptical', 'determined', 'angry', 'bored'] },
  open_hands: { duration_ms: 1200, bones: ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand'], layer: 2, compatible_expressions: ['empathetic', 'confused', 'explaining'] },
  writing: { duration_ms: 3000, bones: ['RightArm', 'RightForeArm', 'RightHand'], layer: 2, compatible_expressions: ['focused', 'thinking', 'neutral'] },
  typing: { duration_ms: 2500, bones: ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand'], layer: 2, compatible_expressions: ['focused', 'neutral'] },
  presenting: { duration_ms: 2000, bones: ['RightArm', 'RightForeArm', 'RightHand', 'Spine2'], layer: 2, compatible_expressions: ['confident', 'excited', 'happy'] },
  listening: { duration_ms: 2000, bones: ['Head', 'Neck', 'Spine2'], layer: 1, compatible_expressions: ['empathetic', 'focused', 'neutral', 'concerned'] },
  agreeing: { duration_ms: 1200, bones: ['Head', 'Neck'], layer: 3, compatible_expressions: ['happy', 'confident', 'empathetic'] },
  disagreeing: { duration_ms: 1200, bones: ['Head', 'Neck', 'LeftHand'], layer: 3, compatible_expressions: ['skeptical', 'concerned', 'determined'] },
  explaining: { duration_ms: 2500, bones: ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand'], layer: 2, compatible_expressions: ['confident', 'focused', 'empathetic'] }
};

// ─── Render Quality Presets ─────────────────────────────────────────

const RENDER_QUALITY_PRESETS: Record<RenderQuality, Partial<RenderConfig>> = {
  cinematic: {
    max_fps: 60, shadow_quality: 'ultra', anti_aliasing: 'msaa_4x',
    ambient_occlusion: true, bloom: true, depth_of_field: true,
    post_processing: { tone_mapping: 'aces', exposure: 1.0, contrast: 1.1, saturation: 1.05, color_grading: null }
  },
  high: {
    max_fps: 60, shadow_quality: 'high', anti_aliasing: 'smaa',
    ambient_occlusion: true, bloom: true, depth_of_field: false,
    post_processing: { tone_mapping: 'filmic', exposure: 1.0, contrast: 1.0, saturation: 1.0, color_grading: null }
  },
  balanced: {
    max_fps: 30, shadow_quality: 'medium', anti_aliasing: 'fxaa',
    ambient_occlusion: false, bloom: false, depth_of_field: false,
    post_processing: { tone_mapping: 'reinhard', exposure: 1.0, contrast: 1.0, saturation: 1.0, color_grading: null }
  },
  performance: {
    max_fps: 30, shadow_quality: 'low', anti_aliasing: 'fxaa',
    ambient_occlusion: false, bloom: false, depth_of_field: false,
    post_processing: { tone_mapping: 'linear', exposure: 1.0, contrast: 1.0, saturation: 1.0, color_grading: null }
  },
  mobile: {
    max_fps: 24, shadow_quality: 'off', anti_aliasing: 'none',
    ambient_occlusion: false, bloom: false, depth_of_field: false,
    post_processing: { tone_mapping: 'linear', exposure: 1.0, contrast: 1.0, saturation: 1.0, color_grading: null }
  }
};

// ─── LOD Thresholds ─────────────────────────────────────────────────

const LOD_CONFIGS: Record<LODLevel, { vertex_ratio: number; texture_ratio: number; distance: number }> = {
  ultra: { vertex_ratio: 1.0, texture_ratio: 1.0, distance: 0 },
  high: { vertex_ratio: 0.6, texture_ratio: 0.75, distance: 3 },
  medium: { vertex_ratio: 0.3, texture_ratio: 0.5, distance: 8 },
  low: { vertex_ratio: 0.15, texture_ratio: 0.25, distance: 15 },
  minimal: { vertex_ratio: 0.05, texture_ratio: 0.125, distance: 30 }
};

// ─── Avatar Asset Pipeline ──────────────────────────────────────────

class AvatarAssetPipeline {
  private env: Env;
  private tenantId: string;

  constructor(env: Env, tenantId: string) { this.env = env; this.tenantId = tenantId; }

  async importFromRPM(rpmUrl: string, employeeId: string, name: string): Promise<AvatarProfile> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const profile: AvatarProfile = {
      id, tenant_id: this.tenantId, employee_id: employeeId, name,
      source: 'ready_player_me', status: 'processing',
      rpm_url: rpmUrl, model_url: null, thumbnail_url: null,
      lod_variants: this.generateLODVariants(50000, 80000, 2048, 5000),
      skeleton: this.defaultSkeleton(),
      blendshapes: [...ARKIT_BLENDSHAPES],
      customization: this.defaultCustomization(),
      branding: this.defaultBranding(),
      render_config: this.defaultRenderConfig('balanced'),
      animation_config: this.defaultAnimationConfig(),
      asset_metadata: { format: 'glb', original_size_kb: 0, optimized_size_kb: 0, vertex_count: 50000, triangle_count: 80000, texture_count: 4, material_count: 3, animation_count: 0, import_duration_ms: 0, optimization_level: 'standard' },
      created_at: now, updated_at: now
    };

    await this.saveProfile(profile);
    return profile;
  }

  async importCustomModel(modelData: { url: string; format: string; name: string; employee_id: string }): Promise<AvatarProfile> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const profile: AvatarProfile = {
      id, tenant_id: this.tenantId, employee_id: modelData.employee_id, name: modelData.name,
      source: 'custom_glb', status: 'processing',
      rpm_url: null, model_url: modelData.url, thumbnail_url: null,
      lod_variants: this.generateLODVariants(30000, 50000, 1024, 3000),
      skeleton: this.defaultSkeleton(),
      blendshapes: [...ARKIT_BLENDSHAPES],
      customization: this.defaultCustomization(),
      branding: this.defaultBranding(),
      render_config: this.defaultRenderConfig('balanced'),
      animation_config: this.defaultAnimationConfig(),
      asset_metadata: { format: modelData.format as any || 'glb', original_size_kb: 0, optimized_size_kb: 0, vertex_count: 30000, triangle_count: 50000, texture_count: 3, material_count: 2, animation_count: 0, import_duration_ms: 0, optimization_level: 'standard' },
      created_at: now, updated_at: now
    };

    await this.saveProfile(profile);
    return profile;
  }

  async createFromTemplate(templateId: string, employeeId: string, name: string, customizations?: Partial<AvatarCustomization>): Promise<AvatarProfile> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const profile: AvatarProfile = {
      id, tenant_id: this.tenantId, employee_id: employeeId, name,
      source: 'template', status: 'ready',
      rpm_url: null, model_url: null, thumbnail_url: null,
      lod_variants: this.generateLODVariants(25000, 40000, 1024, 2500),
      skeleton: this.defaultSkeleton(),
      blendshapes: [...ARKIT_BLENDSHAPES],
      customization: { ...this.defaultCustomization(), ...(customizations || {}) },
      branding: this.defaultBranding(),
      render_config: this.defaultRenderConfig('balanced'),
      animation_config: this.defaultAnimationConfig(),
      asset_metadata: { format: 'glb', original_size_kb: 2500, optimized_size_kb: 1500, vertex_count: 25000, triangle_count: 40000, texture_count: 3, material_count: 2, animation_count: 5, import_duration_ms: 0, optimization_level: 'template' },
      created_at: now, updated_at: now
    };

    await this.saveProfile(profile);
    return profile;
  }

  async getProfile(avatarId: string): Promise<AvatarProfile | null> {
    const row = await this.env.DB.prepare(`SELECT * FROM avatar_profiles WHERE id = ? AND tenant_id = ?`).bind(avatarId, this.tenantId).first();
    return row ? this.parseProfile(row) : null;
  }

  async listProfiles(filters?: { employee_id?: string; status?: AvatarStatus; source?: AvatarSource; limit?: number; offset?: number }): Promise<{ avatars: AvatarProfile[]; total: number }> {
    let where = 'WHERE tenant_id = ?';
    const params: any[] = [this.tenantId];
    if (filters?.employee_id) { where += ' AND employee_id = ?'; params.push(filters.employee_id); }
    if (filters?.status) { where += ' AND status = ?'; params.push(filters.status); }
    if (filters?.source) { where += ' AND source = ?'; params.push(filters.source); }

    const countResult = await this.env.DB.prepare(`SELECT COUNT(*) as cnt FROM avatar_profiles ${where}`).bind(...params).first<{ cnt: number }>();
    const total = countResult?.cnt || 0;
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const rows = await this.env.DB.prepare(`SELECT * FROM avatar_profiles ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
    const avatars = (rows.results || []).map((r: any) => this.parseProfile(r));
    return { avatars, total };
  }

  async updateCustomization(avatarId: string, customization: Partial<AvatarCustomization>): Promise<AvatarProfile> {
    const profile = await this.getProfile(avatarId);
    if (!profile) throw new Error('Avatar not found');
    const merged = { ...profile.customization, ...customization };
    await this.env.DB.prepare(`UPDATE avatar_profiles SET customization = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(JSON.stringify(merged), new Date().toISOString(), avatarId, this.tenantId).run();
    return { ...profile, customization: merged, updated_at: new Date().toISOString() };
  }

  async updateBranding(avatarId: string, branding: Partial<AvatarBranding>): Promise<AvatarProfile> {
    const profile = await this.getProfile(avatarId);
    if (!profile) throw new Error('Avatar not found');
    const merged = { ...profile.branding, ...branding };
    await this.env.DB.prepare(`UPDATE avatar_profiles SET branding = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(JSON.stringify(merged), new Date().toISOString(), avatarId, this.tenantId).run();
    return { ...profile, branding: merged, updated_at: new Date().toISOString() };
  }

  async updateRenderConfig(avatarId: string, config: Partial<RenderConfig>): Promise<AvatarProfile> {
    const profile = await this.getProfile(avatarId);
    if (!profile) throw new Error('Avatar not found');
    const merged = { ...profile.render_config, ...config };
    await this.env.DB.prepare(`UPDATE avatar_profiles SET render_config = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(JSON.stringify(merged), new Date().toISOString(), avatarId, this.tenantId).run();
    return { ...profile, render_config: merged, updated_at: new Date().toISOString() };
  }

  async deleteProfile(avatarId: string): Promise<void> {
    await this.env.DB.prepare(`UPDATE avatar_profiles SET status = 'archived', updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(new Date().toISOString(), avatarId, this.tenantId).run();
  }

  // ─── Private helpers ──────────────

  private generateLODVariants(baseVerts: number, baseTris: number, baseTexRes: number, baseSizeKb: number): LODVariant[] {
    return (Object.entries(LOD_CONFIGS) as [LODLevel, typeof LOD_CONFIGS[LODLevel]][]).map(([level, config]) => ({
      level, vertex_count: Math.round(baseVerts * config.vertex_ratio),
      triangle_count: Math.round(baseTris * config.vertex_ratio),
      texture_resolution: Math.round(baseTexRes * config.texture_ratio),
      file_size_kb: Math.round(baseSizeKb * config.vertex_ratio * config.texture_ratio),
      url: null, distance_threshold: config.distance
    }));
  }

  private defaultSkeleton(): SkeletonConfig {
    return {
      bone_count: 67, root_bone: 'Hips',
      has_fingers: true, has_face_bones: true,
      ik_chains: [
        { name: 'left_arm', root: 'LeftArm', effector: 'LeftHand', pole_target: 'LeftForeArm', chain_length: 3, weight: 1.0 },
        { name: 'right_arm', root: 'RightArm', effector: 'RightHand', pole_target: 'RightForeArm', chain_length: 3, weight: 1.0 },
        { name: 'left_leg', root: 'LeftUpLeg', effector: 'LeftFoot', pole_target: 'LeftLeg', chain_length: 3, weight: 1.0 },
        { name: 'right_leg', root: 'RightUpLeg', effector: 'RightFoot', pole_target: 'RightLeg', chain_length: 3, weight: 1.0 },
        { name: 'spine', root: 'Hips', effector: 'Head', pole_target: null, chain_length: 5, weight: 0.8 }
      ],
      bone_map: {
        'Hips': 'hips', 'Spine': 'spine', 'Spine1': 'chest', 'Spine2': 'upperChest',
        'Neck': 'neck', 'Head': 'head', 'LeftArm': 'leftUpperArm', 'LeftForeArm': 'leftLowerArm',
        'LeftHand': 'leftHand', 'RightArm': 'rightUpperArm', 'RightForeArm': 'rightLowerArm',
        'RightHand': 'rightHand', 'LeftUpLeg': 'leftUpperLeg', 'LeftLeg': 'leftLowerLeg',
        'LeftFoot': 'leftFoot', 'RightUpLeg': 'rightUpperLeg', 'RightLeg': 'rightLowerLeg', 'RightFoot': 'rightFoot'
      }
    };
  }

  private defaultCustomization(): AvatarCustomization {
    return {
      body: { height: 1.75, build: 'average', proportions: {} },
      face: { shape: 'oval', eye_color: '#4A90D9', eye_shape: 'almond', eyebrow_style: 'natural', nose_shape: 'straight', mouth_shape: 'medium', jawline: 'medium', cheekbones: 0.5, face_morphs: {} },
      hair: { style_id: 'default_short', color: '#3B2F2F', highlights: null, length: 0.5, physics_enabled: true },
      clothing: { outfit_id: 'business_casual', top: 'dress_shirt', bottom: 'slacks', shoes: 'oxford', colors: { top: '#FFFFFF', bottom: '#2C3E50' }, brand_override: false },
      accessories: [],
      skin: { tone: '#D2A77D', texture_id: 'default', roughness: 0.6, subsurface_scattering: 0.3 }
    };
  }

  private defaultBranding(): AvatarBranding {
    return {
      enabled: false, company_logo_url: null,
      brand_colors: { primary: '#1A73E8', secondary: '#34A853', accent: '#FBBC04' },
      uniform_template: null, name_badge: null, custom_accessories: []
    };
  }

  private defaultRenderConfig(quality: RenderQuality): RenderConfig {
    const preset = RENDER_QUALITY_PRESETS[quality];
    return {
      quality, max_fps: preset.max_fps || 30,
      shadow_quality: preset.shadow_quality || 'medium',
      anti_aliasing: preset.anti_aliasing || 'fxaa',
      ambient_occlusion: preset.ambient_occlusion || false,
      bloom: preset.bloom || false,
      depth_of_field: preset.depth_of_field || false,
      environment_map: 'neutral_studio',
      background: { type: 'gradient', color: '#F0F4F8', gradient_end: '#E2E8F0', hdri_url: null, blur_amount: 0.5 },
      lighting: {
        preset: 'studio',
        key_light: { type: 'directional', color: '#FFFFFF', intensity: 1.2, position: [2, 3, 2], cast_shadows: true },
        fill_light: { type: 'directional', color: '#E8F4FD', intensity: 0.6, position: [-2, 2, 1], cast_shadows: false },
        rim_light: { type: 'directional', color: '#FFF8E1', intensity: 0.4, position: [0, 2, -3], cast_shadows: false },
        ambient_intensity: 0.3, ambient_color: '#E8ECF0'
      },
      post_processing: preset.post_processing as PostProcessConfig || { tone_mapping: 'reinhard', exposure: 1.0, contrast: 1.0, saturation: 1.0, color_grading: null }
    };
  }

  private defaultAnimationConfig(): AnimationConfig {
    return {
      idle_animation: 'breathing_idle', breathing_enabled: true, breathing_rate: 15,
      eye_blink_rate: 4.5, eye_saccade: true, micro_expressions: true,
      physics_hair: true, physics_clothing: true,
      gesture_library: Object.keys(GESTURE_DEFINITIONS),
      expression_library: Object.keys(EXPRESSION_PRESETS)
    };
  }

  private async saveProfile(profile: AvatarProfile): Promise<void> {
    await this.env.DB.prepare(`INSERT INTO avatar_profiles (id, tenant_id, employee_id, name, source, status, rpm_url, model_url, thumbnail_url, lod_variants, skeleton, blendshapes, customization, branding, render_config, animation_config, asset_metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(profile.id, profile.tenant_id, profile.employee_id, profile.name, profile.source, profile.status, profile.rpm_url, profile.model_url, profile.thumbnail_url, JSON.stringify(profile.lod_variants), JSON.stringify(profile.skeleton), JSON.stringify(profile.blendshapes), JSON.stringify(profile.customization), JSON.stringify(profile.branding), JSON.stringify(profile.render_config), JSON.stringify(profile.animation_config), JSON.stringify(profile.asset_metadata), profile.created_at, profile.updated_at)
      .run();
  }

  private parseProfile(row: any): AvatarProfile {
    return {
      id: row.id, tenant_id: row.tenant_id, employee_id: row.employee_id, name: row.name,
      source: row.source, status: row.status, rpm_url: row.rpm_url, model_url: row.model_url,
      thumbnail_url: row.thumbnail_url,
      lod_variants: JSON.parse(row.lod_variants || '[]'),
      skeleton: JSON.parse(row.skeleton || '{}'),
      blendshapes: JSON.parse(row.blendshapes || '[]'),
      customization: JSON.parse(row.customization || '{}'),
      branding: JSON.parse(row.branding || '{}'),
      render_config: JSON.parse(row.render_config || '{}'),
      animation_config: JSON.parse(row.animation_config || '{}'),
      asset_metadata: JSON.parse(row.asset_metadata || '{}'),
      created_at: row.created_at, updated_at: row.updated_at
    };
  }
}

// ─── Speech Sync Engine ─────────────────────────────────────────────

class SpeechSyncEngine {
  private env: Env;
  private tenantId: string;

  constructor(env: Env, tenantId: string) { this.env = env; this.tenantId = tenantId; }

  async createSyncSession(avatarId: string, text: string, emotion?: ExpressionType): Promise<SpeechSyncSession> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Generate viseme timeline from text (approximation based on text analysis)
    const visemeTimeline = this.textToVisemes(text);
    const durationMs = visemeTimeline.length > 0 ? visemeTimeline[visemeTimeline.length - 1].end_ms : 0;

    // Generate expression cues based on text sentiment and punctuation
    const expressionCues = this.generateExpressionCues(text, durationMs, emotion);

    // Generate gesture cues
    const gestureCues = this.generateGestureCues(text, durationMs);

    const session: SpeechSyncSession = {
      id, avatar_id: avatarId, text, audio_url: null,
      viseme_timeline: visemeTimeline,
      expression_cues: expressionCues,
      gesture_cues: gestureCues,
      duration_ms: durationMs,
      status: 'ready', created_at: now
    };

    await this.env.DB.prepare(`INSERT INTO avatar_speech_sessions (id, tenant_id, avatar_id, text, viseme_timeline, expression_cues, gesture_cues, duration_ms, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, this.tenantId, avatarId, text, JSON.stringify(visemeTimeline), JSON.stringify(expressionCues), JSON.stringify(gestureCues), durationMs, 'ready', now).run();

    return session;
  }

  async getSession(sessionId: string): Promise<SpeechSyncSession | null> {
    const row = await this.env.DB.prepare(`SELECT * FROM avatar_speech_sessions WHERE id = ? AND tenant_id = ?`).bind(sessionId, this.tenantId).first();
    if (!row) return null;
    return {
      id: (row as any).id, avatar_id: (row as any).avatar_id, text: (row as any).text,
      audio_url: (row as any).audio_url,
      viseme_timeline: JSON.parse((row as any).viseme_timeline || '[]'),
      expression_cues: JSON.parse((row as any).expression_cues || '[]'),
      gesture_cues: JSON.parse((row as any).gesture_cues || '[]'),
      duration_ms: (row as any).duration_ms, status: (row as any).status,
      created_at: (row as any).created_at
    };
  }

  async listSessions(avatarId: string, limit: number = 20): Promise<SpeechSyncSession[]> {
    const rows = await this.env.DB.prepare(`SELECT * FROM avatar_speech_sessions WHERE tenant_id = ? AND avatar_id = ? ORDER BY created_at DESC LIMIT ?`).bind(this.tenantId, avatarId, limit).all();
    return (rows.results || []).map((r: any) => ({
      id: r.id, avatar_id: r.avatar_id, text: r.text, audio_url: r.audio_url,
      viseme_timeline: JSON.parse(r.viseme_timeline || '[]'),
      expression_cues: JSON.parse(r.expression_cues || '[]'),
      gesture_cues: JSON.parse(r.gesture_cues || '[]'),
      duration_ms: r.duration_ms, status: r.status, created_at: r.created_at
    }));
  }

  private textToVisemes(text: string): VisemeTimestamp[] {
    const visemes: VisemeTimestamp[] = [];
    const words = text.split(/\s+/);
    let currentMs = 0;
    const msPerChar = 55; // ~180 WPM average

    for (const word of words) {
      const chars = word.toLowerCase().replace(/[^a-z]/g, '');
      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const nextChar = chars[i + 1] || '';
        const digraph = char + nextChar;

        let phoneme = 'SIL';
        let viseme: Viseme = 'sil';

        // Map character pairs and singles to approximate phonemes
        if (['th', 'dh'].includes(digraph)) { phoneme = 'TH'; viseme = 'TH'; i++; }
        else if (['sh', 'ch'].includes(digraph)) { phoneme = 'SH'; viseme = 'CH'; i++; }
        else if (['ng'].includes(digraph)) { phoneme = 'NG'; viseme = 'kk'; i++; }
        else if ('aeiou'.includes(char)) {
          if (char === 'a') { phoneme = 'AA'; viseme = 'aa'; }
          else if (char === 'e') { phoneme = 'EH'; viseme = 'E'; }
          else if (char === 'i') { phoneme = 'IH'; viseme = 'ih'; }
          else if (char === 'o') { phoneme = 'AO'; viseme = 'oh'; }
          else if (char === 'u') { phoneme = 'UH'; viseme = 'ou'; }
        }
        else if ('pbm'.includes(char)) { phoneme = char.toUpperCase(); viseme = 'PP'; }
        else if ('fv'.includes(char)) { phoneme = char.toUpperCase(); viseme = 'FF'; }
        else if ('td'.includes(char)) { phoneme = char.toUpperCase(); viseme = 'DD'; }
        else if ('kg'.includes(char)) { phoneme = char.toUpperCase(); viseme = 'kk'; }
        else if ('sz'.includes(char)) { phoneme = char.toUpperCase(); viseme = 'SS'; }
        else if (char === 'n') { phoneme = 'N'; viseme = 'nn'; }
        else if (char === 'r') { phoneme = 'R'; viseme = 'RR'; }
        else if (char === 'l') { phoneme = 'L'; viseme = 'DD'; }
        else if (char === 'w') { phoneme = 'W'; viseme = 'ou'; }
        else if (char === 'y') { phoneme = 'Y'; viseme = 'ih'; }
        else if (char === 'h') { phoneme = 'HH'; viseme = 'sil'; }

        const duration = msPerChar + (Math.random() * 20 - 10);
        visemes.push({
          viseme, start_ms: Math.round(currentMs),
          end_ms: Math.round(currentMs + duration),
          weight: 0.7 + Math.random() * 0.3,
          phoneme
        });
        currentMs += duration;
      }

      // Word gap
      visemes.push({
        viseme: 'sil', start_ms: Math.round(currentMs),
        end_ms: Math.round(currentMs + 80),
        weight: 0.1, phoneme: 'SP'
      });
      currentMs += 80;
    }

    return visemes;
  }

  private generateExpressionCues(text: string, durationMs: number, baseEmotion?: ExpressionType): ExpressionCue[] {
    const cues: ExpressionCue[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const msPerSentence = durationMs / Math.max(sentences.length, 1);
    let currentMs = 0;

    for (const sentence of sentences) {
      let expression: ExpressionType = baseEmotion || 'neutral';
      let intensity = 0.6;

      if (/[!]/.test(sentence)) { expression = 'excited'; intensity = 0.8; }
      else if (/\?/.test(sentence)) { expression = 'confused'; intensity = 0.6; }
      else if (/\b(sorry|unfortunately|issue|problem)\b/i.test(sentence)) { expression = 'concerned'; intensity = 0.7; }
      else if (/\b(great|excellent|perfect|happy|glad)\b/i.test(sentence)) { expression = 'happy'; intensity = 0.75; }
      else if (/\b(think|consider|perhaps|maybe)\b/i.test(sentence)) { expression = 'thinking'; intensity = 0.5; }

      cues.push({
        expression, start_ms: Math.round(currentMs),
        duration_ms: Math.round(msPerSentence * 0.85),
        intensity: Math.round(intensity * 100) / 100,
        blend_in_ms: 200, blend_out_ms: 300
      });

      currentMs += msPerSentence;
    }

    return cues;
  }

  private generateGestureCues(text: string, durationMs: number): GestureCue[] {
    const cues: GestureCue[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    let currentMs = 200;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].toLowerCase();
      let gesture: GestureType = 'explaining';
      let intensity = 0.6;

      if (/\b(first|second|third|point|item)\b/.test(sentence)) { gesture = 'point'; intensity = 0.7; }
      else if (/\b(welcome|hello|hi|greetings)\b/.test(sentence)) { gesture = 'wave'; intensity = 0.8; }
      else if (/\b(yes|agree|correct|right)\b/.test(sentence)) { gesture = 'nod'; intensity = 0.7; }
      else if (/\b(no|disagree|wrong|incorrect)\b/.test(sentence)) { gesture = 'shake_head'; intensity = 0.6; }
      else if (/\b(think|consider|hmm)\b/.test(sentence)) { gesture = 'think'; intensity = 0.5; }
      else if (/\b(not sure|maybe|perhaps)\b/.test(sentence)) { gesture = 'shrug'; intensity = 0.6; }
      else if (/\b(show|present|demonstrate|look)\b/.test(sentence)) { gesture = 'presenting'; intensity = 0.7; }
      else if (i > 0 && i < sentences.length - 1) { gesture = 'explaining'; intensity = 0.5; }

      const gestureDef = GESTURE_DEFINITIONS[gesture];
      if (currentMs + gestureDef.duration_ms < durationMs) {
        cues.push({
          gesture, start_ms: Math.round(currentMs),
          duration_ms: gestureDef.duration_ms,
          intensity: Math.round(intensity * 100) / 100
        });
        currentMs += gestureDef.duration_ms + 500;
      }
    }

    return cues;
  }
}

// ─── Schema ─────────────────────────────────────────────────────────

export const AVATAR_ENGINE_SCHEMA = `
CREATE TABLE IF NOT EXISTS avatar_profiles (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, employee_id TEXT NOT NULL,
  name TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'processing',
  rpm_url TEXT, model_url TEXT, thumbnail_url TEXT,
  lod_variants TEXT, skeleton TEXT, blendshapes TEXT,
  customization TEXT, branding TEXT, render_config TEXT,
  animation_config TEXT, asset_metadata TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_avatar_tenant ON avatar_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_avatar_employee ON avatar_profiles(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_avatar_status ON avatar_profiles(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_avatar_source ON avatar_profiles(tenant_id, source);

CREATE TABLE IF NOT EXISTS avatar_speech_sessions (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, avatar_id TEXT NOT NULL,
  text TEXT NOT NULL, viseme_timeline TEXT, expression_cues TEXT,
  gesture_cues TEXT, duration_ms INTEGER, status TEXT DEFAULT 'ready',
  audio_url TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_avatar_speech_tenant ON avatar_speech_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_avatar_speech_avatar ON avatar_speech_sessions(tenant_id, avatar_id);

CREATE TABLE IF NOT EXISTS avatar_animations (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
  type TEXT NOT NULL, clip_data TEXT NOT NULL, duration_ms INTEGER,
  is_default INTEGER DEFAULT 0, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_avatar_anim_tenant ON avatar_animations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_avatar_anim_type ON avatar_animations(tenant_id, type);

CREATE TABLE IF NOT EXISTS avatar_branding_templates (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
  branding_config TEXT NOT NULL, uniform_config TEXT,
  badge_config TEXT, accessory_configs TEXT,
  is_default INTEGER DEFAULT 0, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_avatar_brand_tenant ON avatar_branding_templates(tenant_id);
`;

// ─── Route Handler ──────────────────────────────────────────────────

export async function handleAvatarEngine(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const tenantId = userId.split(':')[0] || userId;
  const pipeline = new AvatarAssetPipeline(env, tenantId);
  const speechSync = new SpeechSyncEngine(env, tenantId);
  const method = request.method;
  const subPath = path.replace('/api/avatars/', '').replace(/\/$/, '');

  if (subPath === 'init' && method === 'POST') {
    const statements = AVATAR_ENGINE_SCHEMA.split(';').filter(s => s.trim());
    for (const stmt of statements) { await env.DB.prepare(stmt).run(); }
    return json({ success: true, tables: ['avatar_profiles', 'avatar_speech_sessions', 'avatar_animations', 'avatar_branding_templates'] });
  }

  // ── Import from Ready Player Me ──
  if (subPath === 'import/rpm' && method === 'POST') {
    const body = await request.json() as { rpm_url: string; employee_id: string; name: string };
    const profile = await pipeline.importFromRPM(body.rpm_url, body.employee_id, body.name);
    return json({ success: true, avatar: profile });
  }

  // ── Import custom model ──
  if (subPath === 'import/custom' && method === 'POST') {
    const body = await request.json() as any;
    const profile = await pipeline.importCustomModel(body);
    return json({ success: true, avatar: profile });
  }

  // ── Create from template ──
  if (subPath === 'create/template' && method === 'POST') {
    const body = await request.json() as { template_id: string; employee_id: string; name: string; customizations?: Partial<AvatarCustomization> };
    const profile = await pipeline.createFromTemplate(body.template_id, body.employee_id, body.name, body.customizations);
    return json({ success: true, avatar: profile });
  }

  // ── List avatars ──
  if (subPath === 'list' && method === 'GET') {
    const url = new URL(request.url);
    const filters = {
      employee_id: url.searchParams.get('employee_id') || undefined,
      status: url.searchParams.get('status') as AvatarStatus | undefined,
      source: url.searchParams.get('source') as AvatarSource | undefined,
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    };
    const result = await pipeline.listProfiles(filters);
    return json({ success: true, ...result });
  }

  // ── Avatar-specific routes ──
  const avatarMatch = subPath.match(/^([^/]+)(?:\/(.+))?$/);
  if (avatarMatch) {
    const avatarId = avatarMatch[1];
    const action = avatarMatch[2];

    // Skip known top-level routes
    if (['import', 'create', 'list', 'expressions', 'gestures', 'visemes', 'render-presets', 'lod-configs'].includes(avatarId)) {
      // Handle below
    } else {
      if (!action && method === 'GET') {
        const profile = await pipeline.getProfile(avatarId);
        return profile ? json({ success: true, avatar: profile }) : json({ error: 'Avatar not found' }, 404);
      }

      if (action === 'customization' && method === 'PUT') {
        const body = await request.json() as Partial<AvatarCustomization>;
        const updated = await pipeline.updateCustomization(avatarId, body);
        return json({ success: true, avatar: updated });
      }

      if (action === 'branding' && method === 'PUT') {
        const body = await request.json() as Partial<AvatarBranding>;
        const updated = await pipeline.updateBranding(avatarId, body);
        return json({ success: true, avatar: updated });
      }

      if (action === 'render-config' && method === 'PUT') {
        const body = await request.json() as Partial<RenderConfig>;
        const updated = await pipeline.updateRenderConfig(avatarId, body);
        return json({ success: true, avatar: updated });
      }

      if (!action && method === 'DELETE') {
        await pipeline.deleteProfile(avatarId);
        return json({ success: true });
      }

      // ── Speech sync ──
      if (action === 'speech/sync' && method === 'POST') {
        const body = await request.json() as { text: string; emotion?: ExpressionType };
        const session = await speechSync.createSyncSession(avatarId, body.text, body.emotion);
        return json({ success: true, session });
      }

      if (action === 'speech/sessions' && method === 'GET') {
        const sessions = await speechSync.listSessions(avatarId);
        return json({ success: true, sessions });
      }

      if (action?.startsWith('speech/sessions/') && method === 'GET') {
        const sessionId = action.replace('speech/sessions/', '');
        const session = await speechSync.getSession(sessionId);
        return session ? json({ success: true, session }) : json({ error: 'Session not found' }, 404);
      }
    }
  }

  // ── Expression presets catalog ──
  if (subPath === 'expressions' && method === 'GET') {
    const expressions = Object.entries(EXPRESSION_PRESETS).map(([name, blendshapes]) => ({
      name, blendshape_count: Object.keys(blendshapes).length, blendshapes
    }));
    return json({ success: true, expressions, total: expressions.length });
  }

  // ── Gesture catalog ──
  if (subPath === 'gestures' && method === 'GET') {
    const gestures = Object.entries(GESTURE_DEFINITIONS).map(([name, def]) => ({
      name, duration_ms: def.duration_ms, bone_count: def.bones.length,
      bones: def.bones, layer: def.layer, compatible_expressions: def.compatible_expressions
    }));
    return json({ success: true, gestures, total: gestures.length });
  }

  // ── Viseme catalog ──
  if (subPath === 'visemes' && method === 'GET') {
    const visemes = Object.entries(VISEME_TO_BLENDSHAPES).map(([viseme, blendshapes]) => ({
      viseme, blendshape_count: Object.keys(blendshapes).length, blendshapes
    }));
    return json({ success: true, visemes, total: visemes.length, phoneme_map: PHONEME_TO_VISEME });
  }

  // ── Render presets ──
  if (subPath === 'render-presets' && method === 'GET') {
    return json({ success: true, presets: RENDER_QUALITY_PRESETS });
  }

  // ── LOD configs ──
  if (subPath === 'lod-configs' && method === 'GET') {
    return json({ success: true, configs: LOD_CONFIGS });
  }

  // ── ARKit blendshapes reference ──
  if (subPath === 'blendshapes' && method === 'GET') {
    return json({ success: true, blendshapes: ARKIT_BLENDSHAPES, total: ARKIT_BLENDSHAPES.length });
  }

  return json({ error: 'Not Found', available_endpoints: [
    'POST /init',
    'POST /import/rpm', 'POST /import/custom', 'POST /create/template',
    'GET /list', 'GET /:id', 'DELETE /:id',
    'PUT /:id/customization', 'PUT /:id/branding', 'PUT /:id/render-config',
    'POST /:id/speech/sync', 'GET /:id/speech/sessions', 'GET /:id/speech/sessions/:sid',
    'GET /expressions', 'GET /gestures', 'GET /visemes', 'GET /blendshapes',
    'GET /render-presets', 'GET /lod-configs'
  ] }, 404);
}

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
