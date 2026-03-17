/**
 * NexusHR Voice AI Client — Real-time voice conversation with AI employees
 *
 * Features:
 * 1. Voice session management (create, configure, end)
 * 2. WebRTC audio capture + VAD → Worker STT
 * 3. Turn processing (user audio → AI reply + TTS audio + avatar animation)
 * 4. Emotional tone control and detection
 * 5. Avatar lip sync timeline consumption
 * 6. Offline fallback with Web Speech API
 *
 * Dual-mode: Worker API when online, Web Speech API fallback when offline.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const API = '/api/voice-ai';

// ══════════════════════════════════════════════════════
// 1. TYPES
// ══════════════════════════════════════════════════════

export type VoiceAIState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'paused' | 'error';
export type EmotionalTone = 'neutral' | 'warm' | 'empathetic' | 'confident' | 'enthusiastic' | 'serious' | 'apologetic' | 'encouraging';
export type STTProvider = 'whisper' | 'deepgram' | 'azure' | 'google';
export type TTSProvider = 'elevenlabs' | 'openai_tts' | 'azure_tts' | 'google_tts';
export type Viseme = 'sil' | 'PP' | 'FF' | 'TH' | 'DD' | 'kk' | 'CH' | 'SS' | 'nn' | 'RR' | 'aa' | 'E' | 'I' | 'O' | 'U';

export interface VoiceAIConfig {
  stt_provider: STTProvider;
  tts_provider: TTSProvider;
  tts_voice_id: string;
  language: string;
  sample_rate: number;
  vad_threshold: number;
  silence_timeout_ms: number;
  max_turn_duration_ms: number;
  enable_interruption: boolean;
  streaming_enabled: boolean;
  emotional_tone: EmotionalTone;
}

export interface VoiceAISession {
  id: string;
  employee_id: string;
  org_id: string;
  user_id: string;
  state: VoiceAIState;
  config: VoiceAIConfig;
  conversation_id: string;
  turns: VoiceTurn[];
  created_at: string;
  last_activity: string;
  total_duration_ms: number;
  avatar_state: AvatarSyncState;
}

export interface VoiceTurn {
  id: string;
  role: 'user' | 'assistant';
  transcript: string;
  audio_duration_ms: number;
  emotional_tone: EmotionalTone;
  confidence: number;
  latency_ms: number;
  visemes: VisemeFrame[];
  timestamp: string;
}

export interface VisemeFrame {
  time_ms: number;
  viseme: Viseme;
  weight: number;
  duration_ms: number;
}

export interface AvatarSyncState {
  current_viseme: Viseme;
  blend_weights: Record<string, number>;
  emotion: EmotionalTone;
  gaze_target: { x: number; y: number; z: number };
  head_nod: boolean;
  is_speaking: boolean;
  gesture: string;
}

export interface TurnResult {
  user_transcript: { text: string; confidence: number; words: any[] };
  ai_reply: string;
  ai_audio: { audio_base64: string; duration_ms: number; visemes: VisemeFrame[] };
  emotion_analysis: { user: EmotionalTone; ai_response: EmotionalTone; sentiment: string };
  avatar_animation: {
    lip_sync: VisemeFrame[];
    facial_expressions: { time_ms: number; expression: string; intensity: number }[];
    head_movements: { time_ms: number; rotation: { pitch: number; yaw: number; roll: number }; duration_ms: number }[];
    gestures: { time_ms: number; gesture: string; duration_ms: number }[];
    eye_movements: { time_ms: number; target: { x: number; y: number }; blink: boolean }[];
  };
  latency_ms: number;
  turn_id: string;
}

export interface VoicePresets {
  presets: { role: string; voice_name: string; tts_voice_id: string; emotional_tone: EmotionalTone; personality_voice_notes: string }[];
  emotions: string[];
  providers: { stt: string[]; tts: string[] };
}

export interface VoiceAnalytics {
  session_id: string;
  total_turns: number;
  avg_latency_ms: number;
  avg_stt_confidence: number;
  speaking_time_user_ms: number;
  speaking_time_ai_ms: number;
  silence_time_ms: number;
  interruptions: number;
  emotional_distribution: Record<EmotionalTone, number>;
  user_sentiment: 'positive' | 'neutral' | 'negative';
}

// ══════════════════════════════════════════════════════
// 2. API CLIENT
// ══════════════════════════════════════════════════════

async function api<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

export const voiceAIClient = {
  // Session management
  async createSession(employeeId: string, orgId: string, role?: string) {
    return api<VoiceAISession>('/session', { method: 'POST', body: JSON.stringify({ employee_id: employeeId, org_id: orgId, role }) });
  },
  async getSession(sessionId: string) {
    return api<VoiceAISession>(`/session/${sessionId}`);
  },
  async updateConfig(sessionId: string, config: Partial<VoiceAIConfig>) {
    return api<VoiceAISession>(`/session/${sessionId}/config`, { method: 'PATCH', body: JSON.stringify(config) });
  },
  async endSession(sessionId: string) {
    return api<VoiceAnalytics>(`/session/${sessionId}/end`, { method: 'POST' });
  },

  // Voice turn processing
  async processTurn(sessionId: string, audioBase64: string) {
    return api<TurnResult>(`/session/${sessionId}/turn`, { method: 'POST', body: JSON.stringify({ audio: audioBase64 }) });
  },

  // WebRTC signaling
  async sendSignaling(sessionId: string, type: 'offer' | 'answer' | 'ice', data: string) {
    return api<VoiceAISession>(`/session/${sessionId}/signaling`, { method: 'POST', body: JSON.stringify({ type, data }) });
  },

  // Standalone STT/TTS
  async stt(audioBase64: string, config?: Partial<VoiceAIConfig>) {
    return api<{ text: string; confidence: number; words: any[] }>('/stt', { method: 'POST', body: JSON.stringify({ audio: audioBase64, config }) });
  },
  async tts(text: string, emotion?: EmotionalTone, config?: Partial<VoiceAIConfig>) {
    return api<{ audio_base64: string; duration_ms: number; visemes: VisemeFrame[] }>('/tts', { method: 'POST', body: JSON.stringify({ text, emotion, config }) });
  },

  // Viseme generation
  async generateVisemes(text: string, durationMs?: number) {
    return api<{ visemes: VisemeFrame[] }>('/visemes', { method: 'POST', body: JSON.stringify({ text, duration_ms: durationMs }) });
  },

  // Presets & docs
  async getPresets() {
    return api<VoicePresets>('/presets');
  },
  async getArchitecture() {
    return api<any>('/architecture');
  },

  // Session history
  async getSessionHistory(sessionId: string) {
    return api<{ turns: VoiceTurn[] }>(`/session/${sessionId}/history`);
  },
};

// ══════════════════════════════════════════════════════
// 3. CLIENT-SIDE AUDIO CAPTURE (WebRTC + VAD)
// ══════════════════════════════════════════════════════

export class ClientAudioCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private vadTimer: number | null = null;
  private lastVoiceTime = 0;

  constructor(
    private config: { vadThreshold: number; silenceTimeoutMs: number; sampleRate: number },
    private onSilenceDetected?: (audioBlob: Blob) => void,
    private onVoiceActivity?: (isActive: boolean, energy: number) => void
  ) {}

  async start(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: this.config.sampleRate, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);

      // Start recording
      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType: this.getSupportedMimeType() });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.start(100); // 100ms chunks
      this.isRecording = true;

      // Start VAD monitoring
      this.startVAD();
    } catch (e) {
      throw new Error(`Microphone access denied: ${(e as Error).message}`);
    }
  }

  stop(): Blob | null {
    this.isRecording = false;
    if (this.vadTimer) cancelAnimationFrame(this.vadTimer);

    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }

    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.audioContext?.close();

    if (this.audioChunks.length > 0) {
      const blob = new Blob(this.audioChunks, { type: this.getSupportedMimeType() });
      this.audioChunks = [];
      return blob;
    }
    return null;
  }

  /** Finalize current recording and start a new one */
  finalizeAndRestart(): Blob | null {
    if (!this.mediaRecorder || !this.isRecording) return null;

    this.mediaRecorder.stop();
    const blob = this.audioChunks.length > 0
      ? new Blob(this.audioChunks, { type: this.getSupportedMimeType() })
      : null;

    this.audioChunks = [];

    // Restart recording
    this.mediaRecorder.start(100);
    return blob;
  }

  private startVAD(): void {
    if (!this.analyser) return;

    const dataArray = new Float32Array(this.analyser.fftSize);

    const checkVAD = () => {
      if (!this.isRecording || !this.analyser) return;

      this.analyser.getFloatTimeDomainData(dataArray);
      const energy = Math.sqrt(dataArray.reduce((sum, s) => sum + s * s, 0) / dataArray.length);

      const isVoice = energy > this.config.vadThreshold;

      this.onVoiceActivity?.(isVoice, energy);

      if (isVoice) {
        this.lastVoiceTime = Date.now();
      } else if (this.lastVoiceTime > 0 && Date.now() - this.lastVoiceTime > this.config.silenceTimeoutMs) {
        // Silence detected — finalize audio
        const blob = this.finalizeAndRestart();
        if (blob && blob.size > 1000) { // Ignore tiny fragments
          this.onSilenceDetected?.(blob);
        }
        this.lastVoiceTime = 0;
      }

      this.vadTimer = requestAnimationFrame(checkVAD);
    };

    this.vadTimer = requestAnimationFrame(checkVAD);
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/webm';
  }
}

// ══════════════════════════════════════════════════════
// 4. AVATAR ANIMATION PLAYER
// ══════════════════════════════════════════════════════

export class AvatarAnimationPlayer {
  private animationFrame: number | null = null;
  private startTime = 0;
  private isPlaying = false;

  constructor(
    private onVisemeUpdate?: (viseme: Viseme, weight: number) => void,
    private onExpressionUpdate?: (expression: string, intensity: number) => void,
    private onHeadUpdate?: (rotation: { pitch: number; yaw: number; roll: number }) => void,
    private onGestureUpdate?: (gesture: string) => void,
    private onEyeUpdate?: (target: { x: number; y: number }, blink: boolean) => void
  ) {}

  /** Play a complete animation timeline synchronized with audio */
  play(animation: TurnResult['avatar_animation']): void {
    this.stop();
    this.startTime = performance.now();
    this.isPlaying = true;

    const tick = () => {
      if (!this.isPlaying) return;

      const elapsed = performance.now() - this.startTime;

      // Update lip sync
      const currentViseme = this.findCurrentKeyframe(animation.lip_sync, elapsed, 'time_ms');
      if (currentViseme) {
        this.onVisemeUpdate?.(currentViseme.viseme, currentViseme.weight);
      }

      // Update facial expression
      const currentExpr = this.findCurrentKeyframe(animation.facial_expressions, elapsed, 'time_ms');
      if (currentExpr) {
        this.onExpressionUpdate?.(currentExpr.expression, currentExpr.intensity);
      }

      // Update head movement
      const currentHead = this.findCurrentKeyframe(animation.head_movements, elapsed, 'time_ms');
      if (currentHead) {
        this.onHeadUpdate?.(currentHead.rotation);
      }

      // Update gesture
      const currentGesture = this.findCurrentKeyframe(animation.gestures, elapsed, 'time_ms');
      if (currentGesture) {
        this.onGestureUpdate?.(currentGesture.gesture);
      }

      // Update eye
      const currentEye = this.findCurrentKeyframe(animation.eye_movements, elapsed, 'time_ms');
      if (currentEye) {
        this.onEyeUpdate?.(currentEye.target, currentEye.blink);
      }

      this.animationFrame = requestAnimationFrame(tick);
    };

    this.animationFrame = requestAnimationFrame(tick);
  }

  stop(): void {
    this.isPlaying = false;
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.onVisemeUpdate?.('sil', 0);
  }

  private findCurrentKeyframe<T extends { time_ms: number }>(frames: T[], elapsed: number, timeKey: string): T | null {
    if (frames.length === 0) return null;
    let best: T | null = null;
    for (const frame of frames) {
      if (frame.time_ms <= elapsed) best = frame;
      else break;
    }
    return best;
  }
}

// ══════════════════════════════════════════════════════
// 5. WEB SPEECH API FALLBACK (offline mode)
// ══════════════════════════════════════════════════════

export class WebSpeechFallback {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;

  constructor(private language: string = 'en-US') {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = language;
      }
      this.synthesis = window.speechSynthesis || null;
    }
  }

  async listen(): Promise<string> {
    if (!this.recognition) throw new Error('Speech recognition not supported');

    return new Promise((resolve, reject) => {
      this.recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        if (event.results[last].isFinal) {
          resolve(event.results[last][0].transcript);
        }
      };
      this.recognition.onerror = (e: any) => reject(new Error(e.error));
      this.recognition.start();
    });
  }

  speak(text: string, voice?: string): Promise<void> {
    if (!this.synthesis) return Promise.resolve();

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.language;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      if (voice) {
        const voices = this.synthesis!.getVoices();
        const match = voices.find(v => v.name.toLowerCase().includes(voice.toLowerCase()));
        if (match) utterance.voice = match;
      }

      utterance.onend = () => resolve();
      this.synthesis!.speak(utterance);
    });
  }

  stopListening(): void {
    this.recognition?.stop();
  }

  stopSpeaking(): void {
    this.synthesis?.cancel();
  }

  get isSupported(): boolean {
    return !!this.recognition && !!this.synthesis;
  }
}

// ══════════════════════════════════════════════════════
// 6. REACT HOOKS
// ══════════════════════════════════════════════════════

/** Main hook: full voice conversation with an AI employee */
export function useVoiceAI(employeeId: string, orgId: string, role?: string) {
  const [session, setSession] = useState<VoiceAISession | null>(null);
  const [state, setState] = useState<VoiceAIState>('idle');
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionalTone>('neutral');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<VoiceAnalytics | null>(null);

  const audioCapture = useRef<ClientAudioCapture | null>(null);
  const animationPlayer = useRef<AvatarAnimationPlayer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fallback = useRef<WebSpeechFallback | null>(null);

  // Avatar state for 3D rendering
  const [avatarState, setAvatarState] = useState<{
    viseme: Viseme; visemeWeight: number;
    expression: string; expressionIntensity: number;
    headRotation: { pitch: number; yaw: number; roll: number };
    gesture: string;
    eyeTarget: { x: number; y: number }; isBlink: boolean;
    isSpeaking: boolean;
  }>({
    viseme: 'sil', visemeWeight: 0,
    expression: 'neutral', expressionIntensity: 0.2,
    headRotation: { pitch: 0, yaw: 0, roll: 0 },
    gesture: 'none',
    eyeTarget: { x: 0, y: 0 }, isBlink: false,
    isSpeaking: false,
  });

  // Initialize animation player
  useEffect(() => {
    animationPlayer.current = new AvatarAnimationPlayer(
      (viseme, weight) => setAvatarState(prev => ({ ...prev, viseme, visemeWeight: weight })),
      (expression, intensity) => setAvatarState(prev => ({ ...prev, expression, expressionIntensity: intensity })),
      (rotation) => setAvatarState(prev => ({ ...prev, headRotation: rotation })),
      (gesture) => setAvatarState(prev => ({ ...prev, gesture })),
      (target, blink) => setAvatarState(prev => ({ ...prev, eyeTarget: target, isBlink: blink }))
    );
    fallback.current = new WebSpeechFallback();
    return () => { animationPlayer.current?.stop(); };
  }, []);

  /** Start a voice conversation session */
  const startSession = useCallback(async () => {
    setError(null);
    setState('connecting');

    const newSession = await voiceAIClient.createSession(employeeId, orgId, role);
    if (!newSession) {
      // Offline fallback
      if (fallback.current?.isSupported) {
        setState('listening');
        setSession({ id: 'offline', employee_id: employeeId, org_id: orgId, user_id: 'local', state: 'listening', config: {} as any, conversation_id: 'offline', turns: [], created_at: new Date().toISOString(), last_activity: new Date().toISOString(), total_duration_ms: 0, avatar_state: {} as any });
        return;
      }
      setError('Could not start voice session. Check your connection.');
      setState('error');
      return;
    }

    setSession(newSession);

    // Set up audio capture with VAD
    audioCapture.current = new ClientAudioCapture(
      {
        vadThreshold: newSession.config.vad_threshold || 0.35,
        silenceTimeoutMs: newSession.config.silence_timeout_ms || 800,
        sampleRate: newSession.config.sample_rate || 24000,
      },
      async (audioBlob) => {
        // Silence detected → process the turn
        await processAudioTurn(newSession.id, audioBlob);
      },
      (isActive, energy) => {
        // Update visual indicators
        if (isActive && state !== 'processing' && state !== 'speaking') {
          setState('listening');
        }
      }
    );

    try {
      await audioCapture.current.start();
      setState('listening');
    } catch (e) {
      setError(`Microphone error: ${(e as Error).message}`);
      setState('error');
    }
  }, [employeeId, orgId, role]);

  /** Process a single audio turn through the full pipeline */
  const processAudioTurn = useCallback(async (sessionId: string, audioBlob: Blob) => {
    setIsProcessing(true);
    setState('processing');

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const audioBase64 = btoa(binary);

      const result = await voiceAIClient.processTurn(sessionId, audioBase64);
      if (!result) {
        setError('Failed to process voice turn');
        setState('listening');
        setIsProcessing(false);
        return;
      }

      // Update turns
      setTurns(prev => [
        ...prev,
        { id: result.turn_id + '-user', role: 'user', transcript: result.user_transcript.text, audio_duration_ms: 0, emotional_tone: result.emotion_analysis.user, confidence: result.user_transcript.confidence, latency_ms: 0, visemes: [], timestamp: new Date().toISOString() },
        { id: result.turn_id + '-ai', role: 'assistant', transcript: result.ai_reply, audio_duration_ms: result.ai_audio.duration_ms, emotional_tone: result.emotion_analysis.ai_response, confidence: 1, latency_ms: result.latency_ms, visemes: result.ai_audio.visemes, timestamp: new Date().toISOString() },
      ]);

      setCurrentEmotion(result.emotion_analysis.ai_response);
      setState('speaking');
      setAvatarState(prev => ({ ...prev, isSpeaking: true }));

      // Play avatar animation
      animationPlayer.current?.play(result.avatar_animation);

      // Play audio (if real audio is returned)
      if (result.ai_audio.audio_base64 && !result.ai_audio.audio_base64.startsWith('placeholder')) {
        await playAudio(result.ai_audio.audio_base64, result.ai_audio.duration_ms);
      } else {
        // Use Web Speech API as TTS fallback
        if (fallback.current?.isSupported) {
          await fallback.current.speak(result.ai_reply);
        } else {
          // Just wait estimated duration
          await new Promise(resolve => setTimeout(resolve, result.ai_audio.duration_ms));
        }
      }

      animationPlayer.current?.stop();
      setAvatarState(prev => ({ ...prev, isSpeaking: false, viseme: 'sil', visemeWeight: 0 }));
      setState('listening');
    } catch (e) {
      setError(`Voice processing error: ${(e as Error).message}`);
      setState('listening');
    }

    setIsProcessing(false);
  }, []);

  /** Play audio from base64 */
  const playAudio = useCallback(async (base64: string, durationMs: number): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        audioContextRef.current.decodeAudioData(bytes.buffer, (buffer) => {
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContextRef.current!.destination);
          source.onended = () => resolve();
          source.start();
        }, () => {
          // Decode failed — wait estimated duration
          setTimeout(resolve, durationMs);
        });
      } catch {
        setTimeout(resolve, durationMs);
      }
    });
  }, []);

  /** End the voice session */
  const endSession = useCallback(async () => {
    audioCapture.current?.stop();
    animationPlayer.current?.stop();

    if (session && session.id !== 'offline') {
      const result = await voiceAIClient.endSession(session.id);
      if (result) setAnalytics(result);
    }

    setSession(null);
    setState('idle');
    setAvatarState(prev => ({ ...prev, isSpeaking: false, viseme: 'sil', visemeWeight: 0 }));
  }, [session]);

  /** Interrupt AI speech (if enabled) */
  const interrupt = useCallback(() => {
    if (state === 'speaking' && session?.config.enable_interruption) {
      animationPlayer.current?.stop();
      fallback.current?.stopSpeaking();
      setAvatarState(prev => ({ ...prev, isSpeaking: false, viseme: 'sil', visemeWeight: 0 }));
      setState('listening');
    }
  }, [state, session]);

  /** Send text directly (typed message in voice mode) */
  const sendText = useCallback(async (text: string) => {
    if (!session || session.id === 'offline') return;
    setIsProcessing(true);
    setState('processing');

    // Use TTS to convert the response to audio + visemes
    const ttsResult = await voiceAIClient.tts(text, currentEmotion);
    if (ttsResult) {
      setTurns(prev => [
        ...prev,
        { id: `text-${Date.now()}`, role: 'user', transcript: text, audio_duration_ms: 0, emotional_tone: 'neutral', confidence: 1, latency_ms: 0, visemes: [], timestamp: new Date().toISOString() },
      ]);
    }

    setIsProcessing(false);
    setState('listening');
  }, [session, currentEmotion]);

  return {
    session, state, turns, currentEmotion, isProcessing, error, analytics, avatarState,
    startSession, endSession, interrupt, sendText,
  };
}

/** Hook for voice presets and configuration */
export function useVoicePresets() {
  const [presets, setPresets] = useState<VoicePresets | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    voiceAIClient.getPresets().then(data => {
      if (data) setPresets(data);
      setLoading(false);
    });
  }, []);

  return { presets, loading };
}

/** Hook for standalone TTS with emotional tone */
export function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [visemes, setVisemes] = useState<VisemeFrame[]>([]);
  const audioRef = useRef<AudioContext | null>(null);

  const speak = useCallback(async (text: string, emotion: EmotionalTone = 'warm') => {
    setIsPlaying(true);
    const result = await voiceAIClient.tts(text, emotion);
    if (result) {
      setVisemes(result.visemes);
      // Play audio or wait
      await new Promise(resolve => setTimeout(resolve, result.duration_ms));
    }
    setVisemes([]);
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setVisemes([]);
  }, []);

  return { speak, stop, isPlaying, visemes };
}

/** Hook for standalone STT */
export function useSpeechToText() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [confidence, setConfidence] = useState(0);

  const listen = useCallback(async (audioBase64: string) => {
    setIsListening(true);
    const result = await voiceAIClient.stt(audioBase64);
    if (result) {
      setTranscript(result.text);
      setConfidence(result.confidence);
    }
    setIsListening(false);
  }, []);

  return { transcript, isListening, confidence, listen };
}

/** Hook for voice session analytics */
export function useVoiceAnalytics(sessionId: string | null) {
  const [history, setHistory] = useState<VoiceTurn[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const result = await voiceAIClient.getSessionHistory(sessionId);
    if (result) setHistory(result.turns);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  return { history, loading, refresh: loadHistory };
}
