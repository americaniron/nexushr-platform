/**
 * Voice/Video Communication — WebRTC signaling + TTS/STT proxy
 * Enables voice and video interaction with AI employees.
 */
import type { Env } from '../index';
import { json, generateId, parseBody, EMPLOYEE_JOB_MAP, EMPLOYEE_NAMES } from '../lib/helpers';

interface VoiceSession {
  id: string;
  userId: string;
  employeeId: string;
  status: 'initializing' | 'connected' | 'speaking' | 'listening' | 'ended';
  startedAt: string;
  endedAt?: string;
}

export async function handleVoice(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  // Start a voice session
  if (path === '/api/voice/session/start' && request.method === 'POST') {
    return handleStartSession(request, env, userId);
  }

  // End a voice session
  if (path === '/api/voice/session/end' && request.method === 'POST') {
    return handleEndSession(request, env, userId);
  }

  // Text-to-Speech
  if (path === '/api/voice/tts' && request.method === 'POST') {
    return handleTTS(request, env, userId);
  }

  // Speech-to-Text
  if (path === '/api/voice/stt' && request.method === 'POST') {
    return handleSTT(request, env, userId);
  }

  // WebRTC signaling
  if (path === '/api/voice/signal/offer' && request.method === 'POST') {
    return handleSignalOffer(request, env, userId);
  }
  if (path === '/api/voice/signal/answer' && request.method === 'POST') {
    return handleSignalAnswer(request, env, userId);
  }
  if (path === '/api/voice/signal/ice' && request.method === 'POST') {
    return handleICECandidate(request, env, userId);
  }

  // Voice config
  if (path === '/api/voice/config' && request.method === 'GET') {
    return handleVoiceConfig(env, userId);
  }

  // Active sessions
  if (path === '/api/voice/sessions' && request.method === 'GET') {
    return handleListSessions(env, userId);
  }

  return json({ error: 'Not found' }, 404);
}

async function handleStartSession(request: Request, env: Env, userId: string): Promise<Response> {
  const { employeeId, mode = 'voice' } = await parseBody<{ employeeId: string; mode?: 'voice' | 'video' }>(request);

  if (!employeeId) {
    return json({ error: 'employeeId is required' }, 400);
  }

  const jobType = EMPLOYEE_JOB_MAP[employeeId];
  if (!jobType) {
    return json({ error: `Unknown employee: ${employeeId}` }, 400);
  }

  const sessionId = generateId('vs');
  const voiceProfile = getVoiceProfile(employeeId);

  // Store session in KV for fast access
  const sessionData: VoiceSession = {
    id: sessionId,
    userId,
    employeeId,
    status: 'initializing',
    startedAt: new Date().toISOString(),
  };

  await env.CACHE.put(`voice_session:${sessionId}`, JSON.stringify(sessionData), { expirationTtl: 3600 }); // 1 hour max

  // TURN server credentials (would use Cloudflare Calls or Twilio in production)
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // In production, add TURN servers:
    // { urls: 'turn:turn.nexushr.ai:443', username: '...', credential: '...' },
  ];

  await env.DB.prepare(
    'INSERT INTO audit_log (id, user_id, action, actor, target, details) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId('aud'), userId, 'voice_session_start', userId, employeeId, `${mode} session started`).run();

  return json({
    success: true,
    data: {
      sessionId,
      employeeId,
      employeeName: EMPLOYEE_NAMES[employeeId],
      mode,
      status: 'initializing',
      voiceProfile,
      iceServers,
      config: {
        sampleRate: 16000,
        channels: 1,
        codec: 'opus',
        bitrate: 32000,
        vadEnabled: true, // Voice Activity Detection
        noiseSuppressionEnabled: true,
        echoCancellationEnabled: true,
      },
    },
  });
}

async function handleEndSession(request: Request, env: Env, userId: string): Promise<Response> {
  const { sessionId } = await parseBody<{ sessionId: string }>(request);

  const sessionData = await env.CACHE.get(`voice_session:${sessionId}`);
  if (sessionData) {
    const session = JSON.parse(sessionData);
    session.status = 'ended';
    session.endedAt = new Date().toISOString();

    // Calculate duration
    const duration = (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000;

    await env.CACHE.delete(`voice_session:${sessionId}`);

    await env.DB.prepare(
      'INSERT INTO audit_log (id, user_id, action, actor, target, details) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(generateId('aud'), userId, 'voice_session_end', userId, session.employeeId, `Session ended after ${Math.round(duration)}s`).run();

    return json({
      success: true,
      data: {
        sessionId,
        duration: Math.round(duration),
        status: 'ended',
      },
    });
  }

  return json({ error: 'Session not found' }, 404);
}

// ══════════════════════════════════════════════════════
// VISEME GENERATION — phoneme-to-mouth-shape mapping
// ══════════════════════════════════════════════════════
type Viseme = 'rest' | 'aa' | 'ee' | 'ih' | 'oh' | 'oo' | 'ss' | 'th' | 'ff' | 'dd' | 'kk' | 'mm' | 'nn' | 'rr' | 'ch';

interface VisemeFrame {
  time: number;    // ms from start
  viseme: Viseme;
  weight: number;  // 0-1 intensity
  duration: number; // ms
}

// Letter/digraph → viseme mapping (English approximation)
const PHONEME_MAP: Record<string, Viseme> = {
  'a': 'aa', 'e': 'ee', 'i': 'ih', 'o': 'oh', 'u': 'oo',
  'b': 'mm', 'p': 'mm', 'm': 'mm',
  'f': 'ff', 'v': 'ff',
  'th': 'th', 'dh': 'th',
  's': 'ss', 'z': 'ss', 'c': 'ss',
  'sh': 'ch', 'ch': 'ch', 'j': 'ch', 'zh': 'ch',
  't': 'dd', 'd': 'dd', 'n': 'nn', 'l': 'nn',
  'k': 'kk', 'g': 'kk', 'ng': 'kk',
  'r': 'rr', 'w': 'oo', 'y': 'ee', 'h': 'aa',
  ' ': 'rest', '.': 'rest', ',': 'rest', '!': 'rest', '?': 'rest',
};

function generateVisemes(text: string, wordsPerSec: number = 2.5): VisemeFrame[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const totalDuration = (words.length / wordsPerSec) * 1000;
  const msPerChar = totalDuration / Math.max(text.length, 1);
  const frames: VisemeFrame[] = [];
  let currentTime = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i].toLowerCase();
    // Check digraphs first
    let viseme: Viseme = 'rest';
    if (i < text.length - 1) {
      const digraph = ch + text[i + 1].toLowerCase();
      if (PHONEME_MAP[digraph]) {
        viseme = PHONEME_MAP[digraph];
        i++; // skip next char
      } else {
        viseme = PHONEME_MAP[ch] || 'rest';
      }
    } else {
      viseme = PHONEME_MAP[ch] || 'rest';
    }

    const duration = msPerChar * (viseme === 'rest' ? 1.5 : 1); // pauses slightly longer
    frames.push({
      time: Math.round(currentTime),
      viseme,
      weight: viseme === 'rest' ? 0 : 0.7 + Math.random() * 0.3,
      duration: Math.round(duration),
    });
    currentTime += duration;
  }

  // Merge consecutive same-viseme frames for efficiency
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

async function handleTTS(request: Request, env: Env, userId: string): Promise<Response> {
  const { text, employeeId, voice } = await parseBody<{ text: string; employeeId: string; voice?: string }>(request);

  if (!text || !employeeId) {
    return json({ error: 'text and employeeId are required' }, 400);
  }

  const voiceProfile = getVoiceProfile(employeeId);
  const selectedVoice = voice || voiceProfile.defaultVoice;

  // Generate viseme timeline for lip sync (always available regardless of TTS source)
  const visemes = generateVisemes(text, voiceProfile.speed * 2.5);

  // Check for OpenAI TTS API key
  const apiKey = await env.API_KEYS.get(`${userId}:openai`);

  if (apiKey) {
    try {
      // Use OpenAI's TTS API
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text.slice(0, 4096), // OpenAI limit
          voice: selectedVoice,
          response_format: 'mp3',
          speed: voiceProfile.speed,
        }),
      });

      if (res.ok) {
        const audioBuffer = await res.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

        return json({
          success: true,
          data: {
            audio: base64Audio,
            format: 'mp3',
            voice: selectedVoice,
            durationEstimate: Math.round(text.split(/\s+/).length / 2.5),
            visemes,
          },
        });
      }
    } catch (err: any) {
      // Fall through to browser TTS
    }
  }

  // Fallback: Use Web Speech API on client side
  return json({
    success: true,
    data: {
      fallback: 'web_speech_api',
      text,
      voice: selectedVoice,
      voiceConfig: {
        rate: voiceProfile.speed,
        pitch: voiceProfile.pitch,
        volume: 1.0,
        lang: 'en-US',
      },
      visemes,
      message: 'No TTS API key found. Using browser Web Speech API. Add an OpenAI API key for neural voices.',
    },
  });
}

async function handleSTT(request: Request, env: Env, userId: string): Promise<Response> {
  const contentType = request.headers.get('content-type') || '';

  // Check for OpenAI Whisper API key
  const apiKey = await env.API_KEYS.get(`${userId}:openai`);

  if (apiKey && contentType.includes('multipart/form-data')) {
    try {
      // Forward audio to OpenAI Whisper
      const formData = await request.formData();
      const audioFile = formData.get('audio');

      if (audioFile) {
        const whisperForm = new FormData();
        whisperForm.append('file', audioFile);
        whisperForm.append('model', 'whisper-1');
        whisperForm.append('response_format', 'json');

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: whisperForm,
        });

        if (res.ok) {
          const result = await res.json() as any;
          return json({
            success: true,
            data: {
              text: result.text,
              confidence: 0.95,
              provider: 'openai_whisper',
            },
          });
        }
      }
    } catch (err: any) {
      // Fall through
    }
  }

  // For JSON requests or fallback
  const body = contentType.includes('json') ? await request.json() as any : {};

  return json({
    success: true,
    data: {
      fallback: 'web_speech_api',
      message: 'Use browser Web Speech API (SpeechRecognition) for real-time transcription. Add an OpenAI API key for Whisper-powered STT.',
      config: {
        continuous: true,
        interimResults: true,
        lang: 'en-US',
        maxAlternatives: 1,
      },
    },
  });
}

// ── WebRTC Signaling ──

async function handleSignalOffer(request: Request, env: Env, userId: string): Promise<Response> {
  const { sessionId, offer } = await parseBody<{ sessionId: string; offer: any }>(request);

  // Store offer in KV for the AI-side to pick up
  await env.CACHE.put(`webrtc_offer:${sessionId}`, JSON.stringify(offer), { expirationTtl: 60 });

  // In production, the AI side would generate a real WebRTC answer
  // For now, acknowledge the offer
  return json({
    success: true,
    data: {
      sessionId,
      status: 'offer_received',
      message: 'WebRTC offer received. AI agent will generate an answer.',
    },
  });
}

async function handleSignalAnswer(request: Request, env: Env, userId: string): Promise<Response> {
  const { sessionId, answer } = await parseBody<{ sessionId: string; answer: any }>(request);

  await env.CACHE.put(`webrtc_answer:${sessionId}`, JSON.stringify(answer), { expirationTtl: 60 });

  return json({
    success: true,
    data: { sessionId, status: 'answer_set' },
  });
}

async function handleICECandidate(request: Request, env: Env, userId: string): Promise<Response> {
  const { sessionId, candidate } = await parseBody<{ sessionId: string; candidate: any }>(request);

  // Store ICE candidates
  const existingRaw = await env.CACHE.get(`webrtc_ice:${sessionId}`);
  const existing = existingRaw ? JSON.parse(existingRaw) : [];
  existing.push(candidate);

  await env.CACHE.put(`webrtc_ice:${sessionId}`, JSON.stringify(existing), { expirationTtl: 60 });

  return json({
    success: true,
    data: { sessionId, candidateCount: existing.length },
  });
}

async function handleVoiceConfig(env: Env, userId: string): Promise<Response> {
  const hasOpenAI = !!(await env.API_KEYS.get(`${userId}:openai`));

  return json({
    success: true,
    data: {
      ttsProvider: hasOpenAI ? 'openai' : 'web_speech_api',
      sttProvider: hasOpenAI ? 'openai_whisper' : 'web_speech_api',
      hasApiKey: hasOpenAI,
      availableVoices: hasOpenAI
        ? ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
        : ['browser_default'],
      webrtcSupported: true,
      features: {
        voiceChat: true,
        videoChat: true,
        screenShare: true,
        recording: hasOpenAI,
        realTimeTranscription: true,
        voiceCommands: true,
      },
    },
  });
}

async function handleListSessions(env: Env, userId: string): Promise<Response> {
  // List recent voice sessions from audit log
  const sessions = await env.DB.prepare(
    `SELECT action, target, details, created_at
     FROM audit_log
     WHERE user_id = ? AND action LIKE 'voice_%'
     ORDER BY created_at DESC
     LIMIT 50`
  ).bind(userId).all<any>();

  return json({
    success: true,
    data: sessions.results || [],
  });
}

// ── Voice Profile Per Employee ──

function getVoiceProfile(employeeId: string): { defaultVoice: string; speed: number; pitch: number; personality: string } {
  const profiles: Record<string, { defaultVoice: string; speed: number; pitch: number; personality: string }> = {
    atlas: { defaultVoice: 'onyx', speed: 1.0, pitch: 1.0, personality: 'Confident, authoritative, technical' },
    cipher: { defaultVoice: 'echo', speed: 1.1, pitch: 0.95, personality: 'Precise, fast-paced, analytical' },
    aurora: { defaultVoice: 'nova', speed: 1.0, pitch: 1.05, personality: 'Energetic, enthusiastic, creative' },
    blaze: { defaultVoice: 'fable', speed: 1.05, pitch: 1.0, personality: 'Bold, passionate, driven' },
    vex: { defaultVoice: 'alloy', speed: 1.0, pitch: 1.0, personality: 'Persuasive, warm, confident' },
    forge: { defaultVoice: 'onyx', speed: 0.95, pitch: 0.9, personality: 'Authoritative, direct, strategic' },
    harmony: { defaultVoice: 'shimmer', speed: 0.95, pitch: 1.05, personality: 'Empathetic, calm, reassuring' },
    echo: { defaultVoice: 'nova', speed: 1.0, pitch: 1.0, personality: 'Friendly, patient, thorough' },
    prism: { defaultVoice: 'alloy', speed: 1.0, pitch: 1.0, personality: 'Analytical, clear, methodical' },
    nova: { defaultVoice: 'fable', speed: 1.0, pitch: 1.0, personality: 'Insightful, precise, data-driven' },
    lyra: { defaultVoice: 'shimmer', speed: 0.95, pitch: 1.05, personality: 'Eloquent, creative, articulate' },
    pixel: { defaultVoice: 'nova', speed: 1.0, pitch: 1.0, personality: 'Creative, visual, detail-oriented' },
    sage: { defaultVoice: 'alloy', speed: 1.0, pitch: 1.0, personality: 'Strategic, thoughtful, balanced' },
  };

  return profiles[employeeId] || { defaultVoice: 'alloy', speed: 1.0, pitch: 1.0, personality: 'Professional, helpful' };
}
