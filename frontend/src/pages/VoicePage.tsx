import { useState, useRef, useEffect } from 'react';
import { isWorkerConnected, WorkerVoice } from '../lib/worker-api';
import { AI_EMPLOYEES } from '../data/employees';
import { useAuth } from '../context/AuthContext';
import type { VoiceSession } from '../data/types';

export function VoicePage() {
  const auth = useAuth();
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [mode, setMode] = useState<'voice' | 'video'>('voice');
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ from: string; text: string; ts: string }>>([]);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const recognitionRef = useRef<any>(null);

  const hiredEmployees = AI_EMPLOYEES.filter(e => auth.hiredEmployees.includes(e.id));

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const startCall = async (empId: string) => {
    setSelectedEmployee(empId);
    const emp = AI_EMPLOYEES.find(e => e.id === empId);

    if (isWorkerConnected()) {
      const res = await WorkerVoice.startSession(empId, mode);
      if (res.success && res.data) {
        setSession(res.data);
      }
    } else {
      // Create local session
      setSession({
        sessionId: `local_${Date.now()}`,
        employeeId: empId,
        employeeName: emp?.name || empId,
        mode,
        status: 'initializing',
        voiceProfile: { defaultVoice: 'alloy', speed: 1.0, pitch: 1.0, personality: 'Professional' },
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        config: { sampleRate: 16000, channels: 1, codec: 'opus', vadEnabled: true, noiseSuppressionEnabled: true, echoCancellationEnabled: true },
      });
    }

    setIsConnected(true);
    setDuration(0);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    setTranscript([{ from: 'system', text: `Call started with ${emp?.name || empId}`, ts: new Date().toLocaleTimeString() }]);

    // Start speech recognition if available
    startListening();

    // Play greeting via TTS
    if (emp) {
      speakText(emp.personality.greeting, empId);
      setTranscript(prev => [...prev, { from: 'ai', text: emp.personality.greeting, ts: new Date().toLocaleTimeString() }]);
    }
  };

  const endCall = async () => {
    if (session && isWorkerConnected()) {
      await WorkerVoice.endSession(session.sessionId);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();
    setTranscript(prev => [...prev, { from: 'system', text: `Call ended — ${formatDuration(duration)}`, ts: new Date().toLocaleTimeString() }]);
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript.trim();
        if (text) {
          setTranscript(prev => [...prev, { from: 'user', text, ts: new Date().toLocaleTimeString() }]);
          // Generate AI response
          handleUserSpeech(text);
        }
      }
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      // Restart if still connected
      if (isConnected) {
        try { recognition.start(); } catch {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {}
  };

  const handleUserSpeech = async (text: string) => {
    if (!selectedEmployee) return;
    const emp = AI_EMPLOYEES.find(e => e.id === selectedEmployee);
    if (!emp) return;

    // Simple response generation (in real mode, this would call the Worker LLM)
    setIsSpeaking(true);
    const responses = emp.personality.responseTemplates.general || ["I'm working on that for you."];
    const response = responses[Math.floor(Math.random() * responses.length)].replace(/\{topic\}/g, text.split(' ').slice(0, 3).join(' '));

    setTranscript(prev => [...prev, { from: 'ai', text: response, ts: new Date().toLocaleTimeString() }]);
    await speakText(response, selectedEmployee);
    setIsSpeaking(false);
  };

  const speakText = async (text: string, empId: string): Promise<void> => {
    // Try Web Speech API (always available)
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = session?.voiceProfile.speed || 1.0;
        utterance.pitch = session?.voiceProfile.pitch || 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    });
  };

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>📞 Voice & Video Chat</h1>
        <p style={{ color: '#9ca3af', fontSize: 15 }}>
          Talk to your AI employees using voice or video calls with real-time speech recognition.
        </p>
      </div>

      {!isConnected ? (
        <>
          {/* Mode Selection */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => setMode('voice')}
              style={{
                padding: '12px 24px', borderRadius: 12, border: `2px solid ${mode === 'voice' ? '#facc15' : '#2a2a3e'}`,
                background: mode === 'voice' ? 'rgba(250,204,21,0.1)' : '#1a1a2e',
                color: '#fff', cursor: 'pointer', fontSize: 16,
              }}
            >
              🎙️ Voice Call
            </button>
            <button
              onClick={() => setMode('video')}
              style={{
                padding: '12px 24px', borderRadius: 12, border: `2px solid ${mode === 'video' ? '#facc15' : '#2a2a3e'}`,
                background: mode === 'video' ? 'rgba(250,204,21,0.1)' : '#1a1a2e',
                color: '#fff', cursor: 'pointer', fontSize: 16,
              }}
            >
              📹 Video Call
            </button>
          </div>

          {/* Employee Selection */}
          <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: 12 }}>Select an AI Employee to Call</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {(hiredEmployees.length > 0 ? hiredEmployees : AI_EMPLOYEES.slice(0, 6)).map(emp => (
              <button
                key={emp.id}
                onClick={() => startCall(emp.id)}
                style={{
                  display: 'flex', gap: 12, alignItems: 'center', padding: '16px',
                  background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 12,
                  color: '#fff', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 32 }}>{emp.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{emp.name}</div>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>{emp.role}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 24 }}>{mode === 'voice' ? '📞' : '📹'}</span>
              </button>
            ))}
          </div>

          {/* Voice Features */}
          <div style={{ marginTop: 32, padding: 20, background: '#1a1a2e', borderRadius: 12, border: '1px solid #2a2a3e' }}>
            <h3 style={{ color: '#fff', fontWeight: 600, margin: '0 0 12px' }}>Voice Features</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { icon: '🎙️', title: 'Real-Time STT', desc: 'Speech-to-text via Web Speech API or OpenAI Whisper' },
                { icon: '🔊', title: 'Neural TTS', desc: 'Text-to-speech with unique voices per employee' },
                { icon: '📹', title: 'Video Chat', desc: 'WebRTC-based video communication' },
                { icon: '🧠', title: 'Voice Commands', desc: 'Issue tasks to AI employees by voice' },
                { icon: '📝', title: 'Live Transcription', desc: 'Full conversation transcript in real-time' },
                { icon: '🔇', title: 'Noise Suppression', desc: 'AI-powered noise cancellation' },
              ].map(f => (
                <div key={f.title} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20 }}>{f.icon}</span>
                  <div>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{f.title}</div>
                    <div style={{ color: '#6b7280', fontSize: 11 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Active Call UI */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Call Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 80, marginBottom: 12 }}>
              {AI_EMPLOYEES.find(e => e.id === selectedEmployee)?.emoji || '🤖'}
            </div>
            <h2 style={{ color: '#fff', fontWeight: 600, margin: '0 0 4px', fontSize: 24 }}>
              {session?.employeeName || 'AI Employee'}
            </h2>
            <div style={{ color: '#9ca3af', fontSize: 14 }}>
              {AI_EMPLOYEES.find(e => e.id === selectedEmployee)?.role}
            </div>
            <div style={{ fontSize: 32, color: '#facc15', fontWeight: 700, marginTop: 12, fontVariantNumeric: 'tabular-nums' }}>
              {formatDuration(duration)}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              {isListening && <span style={{ color: '#22c55e', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>🎙️ Listening</span>}
              {isSpeaking && <span style={{ color: '#3b82f6', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>🔊 Speaking</span>}
            </div>
          </div>

          {/* Call Controls */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
            <button
              onClick={() => isListening ? recognitionRef.current?.stop() : startListening()}
              style={{
                width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: isListening ? '#22c55e' : '#2a2a3e', color: '#fff', fontSize: 24,
              }}
            >
              🎙️
            </button>
            <button
              onClick={endCall}
              style={{
                width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: '#ef4444', color: '#fff', fontSize: 24,
              }}
            >
              📞
            </button>
          </div>

          {/* Transcript */}
          <div style={{ width: '100%', maxWidth: 600, background: '#1a1a2e', borderRadius: 12, padding: 16, border: '1px solid #2a2a3e', maxHeight: 400, overflow: 'auto' }}>
            <h3 style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 }}>Live Transcript</h3>
            {transcript.map((entry, i) => (
              <div key={i} style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                <span style={{ color: '#6b7280', fontSize: 11, minWidth: 60 }}>{entry.ts}</span>
                <span style={{
                  color: entry.from === 'user' ? '#3b82f6' : entry.from === 'ai' ? '#22c55e' : '#6b7280',
                  fontSize: 13,
                }}>
                  {entry.from === 'user' ? '🧑 You' : entry.from === 'ai' ? `🤖 ${session?.employeeName}` : '📍 System'}:
                </span>
                <span style={{ color: '#d1d5db', fontSize: 13 }}>{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
