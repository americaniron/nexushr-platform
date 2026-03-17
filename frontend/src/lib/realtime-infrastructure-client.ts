/**
 * Feature #34 — Real-Time Infrastructure Client
 *
 * Frontend API client + React hooks for:
 * 1. WebSocket channel management
 * 2. Session orchestration
 * 3. TURN server allocation
 * 4. WebRTC room management
 * 5. Latency optimization
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = '/api/realtime';

// ─── Types ───────────────────────────────────────────────────────────

type ChannelType = 'presence' | 'broadcast' | 'direct' | 'room' | 'system';
type MessagePriority = 'critical' | 'high' | 'normal' | 'low' | 'bulk';
type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'terminated';
type SessionRole = 'host' | 'participant' | 'observer' | 'moderator' | 'bot';
type TransportProtocol = 'websocket' | 'sse' | 'long-poll' | 'webrtc-data';
type MediaKind = 'audio' | 'video' | 'screen' | 'data';
type SimulcastLayer = 'high' | 'medium' | 'low';
type TurnProtocol = 'udp' | 'tcp' | 'tls';
type CompressionAlgo = 'none' | 'deflate' | 'brotli' | 'delta' | 'lz4';

interface WebSocketFrame {
  id: string; channel: string; type: string; priority: MessagePriority;
  payload: any; timestamp: number; sequence: number; compression: CompressionAlgo;
  ttl?: number; replyTo?: string; correlationId?: string;
}

interface ChannelConfig {
  name: string; type: ChannelType; maxSubscribers: number; persistence: boolean;
  historyDepth: number; ttl: number; compression: CompressionAlgo;
  authentication: string; encryption: boolean;
  rateLimits: { messagesPerSecond: number; bytesPerSecond: number };
  backpressure: { strategy: string; bufferSize: number };
}

interface SessionState {
  sessionId: string; userId: string; tenantId: string; role: SessionRole;
  transport: TransportProtocol; state: ConnectionState; channels: string[];
  metadata: Record<string, any>; connectedAt: number; lastActivity: number;
  lastHeartbeat: number; heartbeatInterval: number; reconnectCount: number;
  maxReconnects: number; messagesSent: number; messagesReceived: number;
  bytesIn: number; bytesOut: number; latencyMs: number; jitterMs: number;
  deviceFingerprint: string; ipAddress: string; userAgent: string; geoRegion: string;
}

interface PresenceInfo {
  userId: string; sessionId: string; status: 'online' | 'away' | 'busy' | 'dnd' | 'offline';
  customStatus?: string; lastSeen: number; typing?: { channel: string; startedAt: number };
  activeDevice: string; capabilities: string[];
}

interface RoomConfig {
  roomId: string; name: string; type: string; maxParticipants: number;
  mediaConfig: any; recording: any; security: any; topology: string;
  createdAt: number; expiresAt?: number;
}

interface TurnServer {
  id: string; region: string; hostname: string;
  ports: { udp: number; tcp: number; tls: number };
  protocols: TurnProtocol[]; capacity: any; health: any;
  credentials: { username: string; credential: string; ttl: number; realm: string };
}

interface BandwidthEstimate {
  availableBitrate: number; targetBitrate: number; rtt: number; jitter: number;
  packetLoss: number; trend: string; congestionLevel: string; timestamp: number;
}

interface EdgeNode {
  id: string; region: string; datacenter: string;
  coordinates: { lat: number; lng: number }; capacity: any;
  latencyMap: Record<string, number>; features: string[]; status: string;
}

interface RealtimeMetrics {
  connections: { total: number; websocket: number; sse: number; webrtc: number };
  messages: { sent: number; received: number; dropped: number; queued: number };
  bandwidth: { ingressMbps: number; egressMbps: number; peakMbps: number };
  latency: { p50: number; p95: number; p99: number; max: number };
  rooms: { active: number; participants: number; recordings: number };
  errors: { rate: number; types: Record<string, number> };
}

// ─── API Client ──────────────────────────────────────────────────────

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const realtimeClient = {
  // Schema
  initSchema: () => apiCall<{ success: boolean; tables: number; indexes: number }>('/schema/init', { method: 'POST' }),

  // ── WebSocket Channels ──
  createChannel: (tenantId: string, config: Partial<ChannelConfig> & { name: string; type: ChannelType }) =>
    apiCall<{ success: boolean; channel: ChannelConfig }>('/channels', { method: 'POST', body: JSON.stringify({ tenantId, ...config }) }),
  listChannels: (tenantId: string, type?: ChannelType) =>
    apiCall<{ success: boolean; channels: ChannelConfig[] }>(`/channels?tenantId=${tenantId}${type ? `&type=${type}` : ''}`),
  buildFrame: (channel: string, type: string, payload: any, options?: any) =>
    apiCall<{ success: boolean; frame: WebSocketFrame }>('/channels/frame', { method: 'POST', body: JSON.stringify({ channel, type, payload, options }) }),
  prioritizeFrames: (frames: WebSocketFrame[]) =>
    apiCall<{ success: boolean; frames: WebSocketFrame[] }>('/channels/prioritize', { method: 'POST', body: JSON.stringify({ frames }) }),
  getHeartbeatConfig: (transport: TransportProtocol = 'websocket') =>
    apiCall<{ success: boolean; config: any }>(`/channels/heartbeat?transport=${transport}`),
  getReconnectDelay: (attempt: number) =>
    apiCall<{ success: boolean; delayMs: number }>(`/channels/reconnect-delay?attempt=${attempt}`),
  getNegotiationParams: () =>
    apiCall<{ success: boolean; params: any }>('/channels/negotiate'),

  // ── Session Orchestration ──
  createSession: (tenantId: string, options?: any) =>
    apiCall<{ success: boolean; session: SessionState }>('/sessions', { method: 'POST', body: JSON.stringify({ tenantId, ...options }) }),
  getSession: (sessionId: string) =>
    apiCall<{ success: boolean; session: SessionState | null }>(`/sessions/${sessionId}`),
  updateSession: (sessionId: string, updates: Partial<SessionState>) =>
    apiCall<{ success: boolean; session: SessionState }>(`/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  terminateSession: (sessionId: string, reason?: string) =>
    apiCall<{ success: boolean }>(`/sessions/${sessionId}/terminate`, { method: 'POST', body: JSON.stringify({ reason }) }),
  listUserSessions: (tenantId: string) =>
    apiCall<{ success: boolean; sessions: SessionState[] }>(`/sessions/user?tenantId=${tenantId}`),
  updatePresence: (tenantId: string, presence: Partial<PresenceInfo>) =>
    apiCall<{ success: boolean; presence: PresenceInfo }>('/presence', { method: 'PUT', body: JSON.stringify({ tenantId, ...presence }) }),
  getPresenceBatch: (tenantId: string, userIds: string[]) =>
    apiCall<{ success: boolean; presence: Record<string, PresenceInfo> }>('/presence/batch', { method: 'POST', body: JSON.stringify({ tenantId, userIds }) }),
  cleanStaleSessions: (tenantId: string, thresholdMs?: number) =>
    apiCall<{ success: boolean; cleaned: number }>('/sessions/cleanup', { method: 'POST', body: JSON.stringify({ tenantId, thresholdMs }) }),
  snapshotSession: (sessionId: string) =>
    apiCall<{ success: boolean; snapshot: any }>(`/sessions/${sessionId}/snapshot`, { method: 'POST' }),
  restoreSession: (sessionId: string) =>
    apiCall<{ success: boolean; session: SessionState | null }>(`/sessions/${sessionId}/restore`, { method: 'POST' }),
  enforceSessionLimits: (tenantId: string, maxConcurrent?: number) =>
    apiCall<{ success: boolean; allowed: boolean; activeSessions: number }>('/sessions/enforce-limits', { method: 'POST', body: JSON.stringify({ tenantId, maxConcurrent }) }),

  // ── TURN Server Cluster ──
  allocateTurnServers: (clientRegion: string, options?: { protocols?: TurnProtocol[]; count?: number }) =>
    apiCall<{ success: boolean; servers: TurnServer[]; credentials: any }>('/turn/allocate', { method: 'POST', body: JSON.stringify({ clientRegion, ...options }) }),
  getTurnClusterHealth: () =>
    apiCall<{ success: boolean; cluster: any }>('/turn/health'),
  filterICECandidates: (candidates: any[], policy?: string) =>
    apiCall<{ success: boolean; candidates: any[] }>('/turn/filter-ice', { method: 'POST', body: JSON.stringify({ candidates, policy }) }),
  getBandwidthPolicy: (tier: 'free' | 'pro' | 'enterprise') =>
    apiCall<{ success: boolean; policy: any }>(`/turn/bandwidth-policy?tier=${tier}`),

  // ── WebRTC Rooms ──
  createRoom: (tenantId: string, options: { name: string; type?: string; maxParticipants?: number; mediaConfig?: any; security?: any; topology?: string }) =>
    apiCall<{ success: boolean; room: RoomConfig }>('/rooms', { method: 'POST', body: JSON.stringify({ tenantId, ...options }) }),
  getRoom: (roomId: string) =>
    apiCall<{ success: boolean; room: RoomConfig | null }>(`/rooms/${roomId}`),
  listRooms: (tenantId: string, active?: boolean) =>
    apiCall<{ success: boolean; rooms: RoomConfig[] }>(`/rooms?tenantId=${tenantId}${active !== undefined ? `&active=${active}` : ''}`),
  joinRoom: (roomId: string, sessionId: string, role?: SessionRole) =>
    apiCall<{ success: boolean; participant: any }>(`/rooms/${roomId}/join`, { method: 'POST', body: JSON.stringify({ sessionId, role }) }),
  leaveRoom: (roomId: string) =>
    apiCall<{ success: boolean }>(`/rooms/${roomId}/leave`, { method: 'POST' }),
  getRoomParticipants: (roomId: string) =>
    apiCall<{ success: boolean; participants: any[] }>(`/rooms/${roomId}/participants`),
  selectSimulcastLayer: (bwe: BandwidthEstimate, viewportWidth: number, isActiveSpeaker: boolean) =>
    apiCall<{ success: boolean; layer: SimulcastLayer }>('/webrtc/simulcast', { method: 'POST', body: JSON.stringify({ bwe, viewportWidth, isActiveSpeaker }) }),
  estimateBandwidth: (samples: any[]) =>
    apiCall<{ success: boolean; estimate: BandwidthEstimate }>('/webrtc/bwe', { method: 'POST', body: JSON.stringify({ samples }) }),
  negotiateCodecs: (localCodecs: string[], remoteCodecs: string[]) =>
    apiCall<{ success: boolean; negotiated: { audio: string; video: string } }>('/webrtc/codecs', { method: 'POST', body: JSON.stringify({ localCodecs, remoteCodecs }) }),
  startRecording: (roomId: string) =>
    apiCall<{ success: boolean; recording: any }>(`/rooms/${roomId}/recording/start`, { method: 'POST' }),
  stopRecording: (recordingId: string) =>
    apiCall<{ success: boolean }>(`/recordings/${recordingId}/stop`, { method: 'POST' }),
  getRoomRecordings: (roomId: string) =>
    apiCall<{ success: boolean; recordings: any[] }>(`/rooms/${roomId}/recordings`),
  getScreenShareConfig: (contentType: 'motion' | 'detail' | 'text') =>
    apiCall<{ success: boolean; config: any }>(`/webrtc/screenshare?contentType=${contentType}`),

  // ── Latency Optimization ──
  selectEdgeNode: (clientRegion: string, features?: string[]) =>
    apiCall<{ success: boolean; node: EdgeNode; estimatedLatencyMs: number }>('/edge/select', { method: 'POST', body: JSON.stringify({ clientRegion, features }) }),
  getEdgeTopology: () =>
    apiCall<{ success: boolean; nodes: EdgeNode[]; totalCapacity: number; activeNodes: number }>('/edge/topology'),
  getConnectionPoolConfig: (tier: 'free' | 'pro' | 'enterprise') =>
    apiCall<{ success: boolean; config: any }>(`/pool/config?tier=${tier}`),
  computeDelta: (previous: Record<string, any>, current: Record<string, any>) =>
    apiCall<{ success: boolean; delta: Record<string, any>; removedKeys: string[]; compressionRatio: number }>('/delta', { method: 'POST', body: JSON.stringify({ previous, current }) }),
  getPriorityQueues: () =>
    apiCall<{ success: boolean; queues: any[] }>('/priority-queues'),
  computeAdaptiveBitrate: (bwe: BandwidthEstimate, currentBitrate: number, jitterBuffer?: any) =>
    apiCall<{ success: boolean; targetBitrate: number; action: string; reason: string; newJitterTarget: number }>('/abr', { method: 'POST', body: JSON.stringify({ bwe, currentBitrate, jitterBuffer }) }),
  getJitterBufferConfig: (condition: 'excellent' | 'good' | 'fair' | 'poor') =>
    apiCall<{ success: boolean; config: any }>(`/jitter-buffer?condition=${condition}`),
  getMetrics: (tenantId: string) =>
    apiCall<{ success: boolean; metrics: RealtimeMetrics }>(`/metrics?tenantId=${tenantId}`),
  getMediaDefaults: () =>
    apiCall<{ success: boolean; mediaConfig: any; jitterBuffer: any }>('/media/defaults')
};

// ─── React Hooks ─────────────────────────────────────────────────────

/** Managed WebSocket connection with auto-reconnect and heartbeat */
export function useWebSocket(url: string, options: {
  protocols?: string[];
  autoConnect?: boolean;
  heartbeatInterval?: number;
  maxReconnects?: number;
  onMessage?: (frame: WebSocketFrame) => void;
  onStateChange?: (state: ConnectionState) => void;
} = {}) {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketFrame | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxReconnects = options.maxReconnects ?? 10;

  const updateState = useCallback((s: ConnectionState) => {
    setState(s);
    options.onStateChange?.(s);
  }, [options.onStateChange]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    updateState('connecting');
    try {
      const ws = new WebSocket(url, options.protocols);
      ws.onopen = () => {
        updateState('connected');
        reconnectCountRef.current = 0;
        // Start heartbeat
        const interval = options.heartbeatInterval ?? 25000;
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, interval);
      };
      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data) as WebSocketFrame;
          setLastMessage(frame);
          options.onMessage?.(frame);
        } catch { /* binary frame or non-JSON */ }
      };
      ws.onclose = () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        if (reconnectCountRef.current < maxReconnects) {
          updateState('reconnecting');
          const delay = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000) + Math.random() * 1000;
          reconnectCountRef.current++;
          setTimeout(connect, delay);
        } else {
          updateState('disconnected');
        }
      };
      ws.onerror = () => { ws.close(); };
      wsRef.current = ws;
    } catch {
      updateState('disconnected');
    }
  }, [url, options.protocols, maxReconnects]);

  const disconnect = useCallback(() => {
    reconnectCountRef.current = maxReconnects; // Prevent auto-reconnect
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    wsRef.current?.close();
    updateState('disconnected');
  }, [maxReconnects]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (options.autoConnect !== false) connect();
    return () => { disconnect(); };
  }, [url]);

  return { state, lastMessage, connect, disconnect, send, reconnectCount: reconnectCountRef.current };
}

/** Session management hook */
export function useSession(tenantId: string) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(false);

  const create = useCallback(async (options?: any) => {
    setLoading(true);
    try {
      const result = await realtimeClient.createSession(tenantId, options);
      setSession(result.session);
      return result.session;
    } finally { setLoading(false); }
  }, [tenantId]);

  const terminate = useCallback(async (reason?: string) => {
    if (!session) return;
    await realtimeClient.terminateSession(session.sessionId, reason);
    setSession(null);
  }, [session]);

  const refresh = useCallback(async () => {
    if (!session) return;
    const result = await realtimeClient.getSession(session.sessionId);
    if (result.session) setSession(result.session);
  }, [session]);

  return { session, loading, create, terminate, refresh };
}

/** Presence tracking hook */
export function usePresence(tenantId: string, userIds: string[], pollInterval: number = 10000) {
  const [presence, setPresence] = useState<Record<string, PresenceInfo>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (userIds.length === 0) return;
    try {
      const result = await realtimeClient.getPresenceBatch(tenantId, userIds);
      setPresence(result.presence);
    } finally { setLoading(false); }
  }, [tenantId, userIds.join(',')]);

  const updateMyPresence = useCallback(async (update: Partial<PresenceInfo>) => {
    const result = await realtimeClient.updatePresence(tenantId, update);
    setPresence(prev => ({ ...prev, [result.presence.userId]: result.presence }));
  }, [tenantId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollInterval);
    return () => clearInterval(interval);
  }, [refresh, pollInterval]);

  return { presence, loading, refresh, updateMyPresence };
}

/** WebRTC room management hook */
export function useMediaRoom(roomId: string | null) {
  const [room, setRoom] = useState<RoomConfig | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [recording, setRecording] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const [roomRes, partRes] = await Promise.all([
        realtimeClient.getRoom(roomId),
        realtimeClient.getRoomParticipants(roomId)
      ]);
      setRoom(roomRes.room);
      setParticipants(partRes.participants);
    } finally { setLoading(false); }
  }, [roomId]);

  const join = useCallback(async (sessionId: string, role?: SessionRole) => {
    if (!roomId) return;
    const result = await realtimeClient.joinRoom(roomId, sessionId, role);
    await loadRoom();
    return result.participant;
  }, [roomId, loadRoom]);

  const leave = useCallback(async () => {
    if (!roomId) return;
    await realtimeClient.leaveRoom(roomId);
    await loadRoom();
  }, [roomId, loadRoom]);

  const startRec = useCallback(async () => {
    if (!roomId) return;
    const result = await realtimeClient.startRecording(roomId);
    setRecording(result.recording);
    return result.recording;
  }, [roomId]);

  const stopRec = useCallback(async () => {
    if (!recording) return;
    await realtimeClient.stopRecording(recording.id);
    setRecording(null);
  }, [recording]);

  useEffect(() => { loadRoom(); }, [loadRoom]);

  return { room, participants, recording, loading, join, leave, startRecording: startRec, stopRecording: stopRec, refresh: loadRoom };
}

/** TURN server allocation hook */
export function useTurnServers(clientRegion: string) {
  const [servers, setServers] = useState<TurnServer[]>([]);
  const [credentials, setCredentials] = useState<any>(null);
  const [clusterHealth, setClusterHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const allocate = useCallback(async (options?: { protocols?: TurnProtocol[]; count?: number }) => {
    setLoading(true);
    try {
      const result = await realtimeClient.allocateTurnServers(clientRegion, options);
      setServers(result.servers);
      setCredentials(result.credentials);
      return result;
    } finally { setLoading(false); }
  }, [clientRegion]);

  const refreshHealth = useCallback(async () => {
    const result = await realtimeClient.getTurnClusterHealth();
    setClusterHealth(result.cluster);
  }, []);

  useEffect(() => { allocate(); refreshHealth(); }, [allocate]);

  return { servers, credentials, clusterHealth, loading, allocate, refreshHealth };
}

/** Bandwidth estimation and adaptive bitrate hook */
export function useBandwidthEstimation() {
  const [estimate, setEstimate] = useState<BandwidthEstimate | null>(null);
  const [abrDecision, setAbrDecision] = useState<any>(null);
  const samplesRef = useRef<any[]>([]);

  const addSample = useCallback((sample: { timestamp: number; bytesReceived: number; rtt: number; packetsLost: number; packetsReceived: number }) => {
    samplesRef.current.push(sample);
    if (samplesRef.current.length > 30) samplesRef.current = samplesRef.current.slice(-30);
  }, []);

  const computeEstimate = useCallback(async () => {
    if (samplesRef.current.length < 2) return;
    const result = await realtimeClient.estimateBandwidth(samplesRef.current);
    setEstimate(result.estimate);
    return result.estimate;
  }, []);

  const computeABR = useCallback(async (currentBitrate: number, jitterBuffer?: any) => {
    if (!estimate) return;
    const result = await realtimeClient.computeAdaptiveBitrate(estimate, currentBitrate, jitterBuffer);
    setAbrDecision(result);
    return result;
  }, [estimate]);

  return { estimate, abrDecision, addSample, computeEstimate, computeABR };
}

/** Real-time metrics dashboard hook */
export function useRealtimeMetrics(tenantId: string, pollInterval: number = 5000) {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [edgeTopology, setEdgeTopology] = useState<{ nodes: EdgeNode[]; totalCapacity: number; activeNodes: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      const [metricsRes, topoRes] = await Promise.all([
        realtimeClient.getMetrics(tenantId),
        realtimeClient.getEdgeTopology()
      ]);
      setMetrics(metricsRes.metrics);
      setEdgeTopology(topoRes);
    };
    load();
    const interval = setInterval(load, pollInterval);
    return () => clearInterval(interval);
  }, [tenantId, pollInterval]);

  return { metrics, edgeTopology };
}
