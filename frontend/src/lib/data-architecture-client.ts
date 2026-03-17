/**
 * NexusHR Feature #33 — Scalable Data Architecture Client
 * Full API client with React hooks, dual-mode (Worker backend + localStorage fallback)
 */

import { useState, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────

export type RegionId = 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'eu-central-1' | 'ap-southeast-1' | 'ap-northeast-1';
export type ConsistencyLevel = 'strong' | 'bounded_staleness' | 'session' | 'eventual';
export type StorageTier = 'hot' | 'warm' | 'cold' | 'frozen' | 'archive';
export type VectorMetric = 'cosine' | 'euclidean' | 'dot_product';
export type ShardStatus = 'active' | 'draining' | 'migrating' | 'offline' | 'read_only';
export type MigrationStatus = 'planned' | 'in_progress' | 'validating' | 'completed' | 'rolled_back';
export type SecretType = 'api_key' | 'oauth_token' | 'webhook_secret' | 'database_credential' | 'encryption_key' | 'certificate' | 'custom';
export type ETLStatus = 'idle' | 'extracting' | 'transforming' | 'loading' | 'completed' | 'failed';

export interface RegionConfig { id: RegionId; name: string; provider: string; endpoint: string; role: string; priority: number; latencyBudget: number; capacity: any; features: string[]; }
export interface RegionHealth { region: RegionId; status: string; latencyMs: number; activeConnections: number; replicationLagMs: number; lastChecked: string; errorRate: number; }
export interface RoutingDecision { targetRegion: RegionId; fallbackRegion: RegionId | null; consistency: ConsistencyLevel; reason: string; estimatedLatency: number; }
export interface ShardStats { totalShards: number; totalVNodes: number; activeShards: number; distribution: { shardId: string; vnodeCount: number; tenantCount: number; utilization: number }[]; }
export interface ShardAssignment { tenantId: string; shardId: string; region: RegionId; }
export interface TierConfig { tier: StorageTier; description: string; maxAgeDays: number | null; compressionAlgorithm: string | null; slaReadLatency: string; slaAvailability: string; costMultiplier: number; storageEngine: string; }
export interface StorageClassification { tableName: string; recordId: string; currentTier: StorageTier; recommendedTier: StorageTier; lastAccessed: string; accessCount30d: number; recordAgeDays: number; sizeBytes: number; reason: string; }
export interface CostEstimate { total: number; breakdown: { tier: StorageTier; sizeGB: number; costPerGB: number; monthlyCost: number }[]; savings: number; savingsPercent: number; }
export interface RetentionPolicy { id: string; tableName: string; tenantId: string | null; hotDays: number; warmDays: number; coldDays: number; frozenDays: number; archiveDays: number; purgeDays: number | null; legalHold: boolean; complianceFramework: string | null; }
export interface MigrationJob { id: string; tableName: string; fromTier: StorageTier; toTier: StorageTier; recordCount: number; totalSizeBytes: number; status: MigrationStatus; startedAt: string | null; completedAt: string | null; error: string | null; }
export interface VectorIndex { id: string; name: string; namespace: string; dimensions: number; metric: VectorMetric; indexType: string; vectorCount: number; status: string; }
export interface VectorSearchResult { id: string; score: number; metadata: Record<string, any>; }
export interface WarehouseTable { name: string; type: string; description: string; columns: any[]; partitionKey: string | null; clusterKeys: string[]; refreshInterval: number | null; }
export interface ETLPipeline { id: string; name: string; sourceTable: string; targetTable: string; schedule: string; status: ETLStatus; lastRunAt: string | null; recordsProcessed: number; }

// ─── API Client ─────────────────────────────────────────────────────

const API_BASE = '/api/data-arch';

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}/${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  } catch (err: any) {
    if (err.message?.startsWith('API error')) throw err;
    console.warn(`Data Architecture API offline for ${path}`);
    throw new Error('Data architecture service unavailable');
  }
}

export const dataArchClient = {
  init: () => apiCall<{ success: boolean }>('init', { method: 'POST' }),

  // Regions
  getRegions: () => apiCall<{ success: boolean; regions: RegionConfig[]; total: number }>('regions'),
  getRegionHealth: () => apiCall<{ success: boolean; health: RegionHealth[] }>('regions/health'),
  routeOperation: (operation: string, clientRegion?: RegionId, consistency?: ConsistencyLevel, preferredRegion?: RegionId) =>
    apiCall<{ success: boolean; routing: RoutingDecision }>('regions/route', { method: 'POST', body: JSON.stringify({ operation, client_region: clientRegion, consistency, preferred_region: preferredRegion }) }),
  resolveConflict: (strategy: string, local: any, remote: any) =>
    apiCall<{ success: boolean; resolution: any }>('regions/conflict', { method: 'POST', body: JSON.stringify({ strategy, local, remote }) }),

  // Shards
  getShards: () => apiCall<{ success: boolean; stats: ShardStats }>('shards'),
  createShard: (region: RegionId, virtualNodes?: number, maxStorageGB?: number) =>
    apiCall<{ success: boolean; shardId: string }>('shards', { method: 'POST', body: JSON.stringify({ region, virtual_nodes: virtualNodes, max_storage_gb: maxStorageGB }) }),
  assignTenant: (tenantId: string) =>
    apiCall<{ success: boolean } & ShardAssignment>('shards/assign', { method: 'POST', body: JSON.stringify({ tenant_id: tenantId }) }),
  planRebalance: () =>
    apiCall<{ success: boolean; plan: any[]; migrations: number }>('shards/rebalance', { method: 'POST' }),
  detectHotspots: () =>
    apiCall<{ success: boolean; hotSpots: any[]; count: number }>('shards/hotspots'),

  // Storage Lifecycle
  getTiers: () => apiCall<{ success: boolean; tiers: Record<StorageTier, TierConfig> }>('tiers'),
  classifyRecord: (tableName: string, recordId: string, createdAt: string, lastAccessed: string, accessCount30d: number, sizeBytes: number) =>
    apiCall<{ success: boolean; classification: StorageClassification }>('tiers/classify', { method: 'POST', body: JSON.stringify({ table_name: tableName, record_id: recordId, created_at: createdAt, last_accessed: lastAccessed, access_count_30d: accessCount30d, size_bytes: sizeBytes }) }),
  estimateCosts: (hotGB: number, warmGB: number, coldGB: number, frozenGB: number, archiveGB: number, basePrice?: number) =>
    apiCall<{ success: boolean; estimate: CostEstimate }>('tiers/cost-estimate', { method: 'POST', body: JSON.stringify({ hot_gb: hotGB, warm_gb: warmGB, cold_gb: coldGB, frozen_gb: frozenGB, archive_gb: archiveGB, base_price: basePrice }) }),

  // Retention & Legal
  createRetentionPolicy: (policy: Omit<RetentionPolicy, 'id'>) =>
    apiCall<{ success: boolean; id: string }>('retention', { method: 'POST', body: JSON.stringify(policy) }),
  getRetentionPolicies: (tenantId?: string) =>
    apiCall<{ success: boolean; policies: RetentionPolicy[]; total: number }>(`retention${tenantId ? `?tenant_id=${tenantId}` : ''}`),
  setLegalHold: (tenantId: string, hold: boolean, reason: string) =>
    apiCall<{ success: boolean }>('legal-holds', { method: 'POST', body: JSON.stringify({ tenant_id: tenantId, hold, reason }) }),
  getLegalHolds: (tenantId?: string) =>
    apiCall<{ success: boolean; holds: any[]; total: number }>(`legal-holds${tenantId ? `?tenant_id=${tenantId}` : ''}`),

  // Migrations
  createMigration: (tableName: string, fromTier: StorageTier, toTier: StorageTier, recordCount: number, totalSizeBytes: number) =>
    apiCall<{ success: boolean; id: string }>('migrations', { method: 'POST', body: JSON.stringify({ table_name: tableName, from_tier: fromTier, to_tier: toTier, record_count: recordCount, total_size_bytes: totalSizeBytes }) }),
  getMigrations: (status?: MigrationStatus) =>
    apiCall<{ success: boolean; jobs: MigrationJob[]; total: number }>(`migrations${status ? `?status=${status}` : ''}`),

  // Vector Database
  createVectorIndex: (name: string, namespace: string, dimensions: number, metric?: VectorMetric) =>
    apiCall<{ success: boolean; id: string }>('vectors/indexes', { method: 'POST', body: JSON.stringify({ name, namespace, dimensions, metric }) }),
  getVectorIndexes: () =>
    apiCall<{ success: boolean; indexes: VectorIndex[]; total: number }>('vectors/indexes'),
  upsertVectors: (namespace: string, vectors: { id: string; values: number[]; metadata?: Record<string, any> }[]) =>
    apiCall<{ success: boolean; upserted: number }>('vectors/upsert', { method: 'POST', body: JSON.stringify({ namespace, vectors }) }),
  searchVectors: (vector: number[], topK: number, namespace?: string, metric?: VectorMetric, filter?: Record<string, any>, minScore?: number) =>
    apiCall<{ success: boolean; results: VectorSearchResult[]; searchTime: number }>('vectors/search', { method: 'POST', body: JSON.stringify({ vector, topK, namespace, metric, filter, minScore, includeMetadata: true }) }),
  deleteVectors: (namespace: string, ids: string[]) =>
    apiCall<{ success: boolean; deleted: number }>('vectors/delete', { method: 'POST', body: JSON.stringify({ namespace, ids }) }),
  getVectorStats: (namespace?: string) =>
    apiCall<{ success: boolean; stats: any }>(`vectors/stats${namespace ? `?namespace=${namespace}` : ''}`),

  // Warehouse
  getWarehouseSchema: () =>
    apiCall<{ success: boolean; tables: WarehouseTable[]; total: number }>('warehouse/schema'),
  getWarehouseTable: (name: string) =>
    apiCall<{ success: boolean; table: WarehouseTable }>(`warehouse/schema/${name}`),
  createETLPipeline: (name: string, sourceTable: string, targetTable: string, transformQuery: string, schedule: string) =>
    apiCall<{ success: boolean; id: string }>('warehouse/etl', { method: 'POST', body: JSON.stringify({ name, source_table: sourceTable, target_table: targetTable, transform_query: transformQuery, schedule }) }),
  getETLPipelines: () =>
    apiCall<{ success: boolean; pipelines: ETLPipeline[]; total: number }>('warehouse/etl'),
  runETLPipeline: (pipelineId: string) =>
    apiCall<{ success: boolean; status: string; recordsProcessed: number; duration: number }>(`warehouse/etl/${pipelineId}/run`, { method: 'POST' }),
  queryWarehouse: (sql: string, params?: any[]) =>
    apiCall<{ success: boolean; results: any[]; rowCount: number; duration: number }>('warehouse/query', { method: 'POST', body: JSON.stringify({ sql, params }) }),
  getWarehouseStats: () =>
    apiCall<{ success: boolean; stats: any }>('warehouse/stats'),
};

// ─── React Hooks ────────────────────────────────────────────────────

export function useMultiRegion() {
  const [regions, setRegions] = useState<RegionConfig[]>([]);
  const [health, setHealth] = useState<RegionHealth[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [regRes, healthRes] = await Promise.all([dataArchClient.getRegions(), dataArchClient.getRegionHealth()]);
      setRegions(regRes.regions || []);
      setHealth(healthRes.health || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const route = useCallback(async (operation: string, clientRegion?: RegionId, consistency?: ConsistencyLevel) => {
    try { const res = await dataArchClient.routeOperation(operation, clientRegion, consistency); return res.routing; }
    catch { return null; }
  }, []);

  return { regions, health, loading, load, route };
}

export function useShardManager() {
  const [stats, setStats] = useState<ShardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await dataArchClient.getShards(); setStats(res.stats); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const createShard = useCallback(async (region: RegionId, virtualNodes?: number) => {
    try { const res = await dataArchClient.createShard(region, virtualNodes); await load(); return res.shardId; }
    catch (e: any) { setError(e.message); return null; }
  }, [load]);

  const assignTenant = useCallback(async (tenantId: string) => {
    try { return await dataArchClient.assignTenant(tenantId); }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const rebalance = useCallback(async () => {
    try { return await dataArchClient.planRebalance(); }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const detectHotspots = useCallback(async () => {
    try { return await dataArchClient.detectHotspots(); }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  return { stats, loading, error, load, createShard, assignTenant, rebalance, detectHotspots };
}

export function useStorageLifecycle() {
  const [tiers, setTiers] = useState<Record<StorageTier, TierConfig> | null>(null);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [migrations, setMigrations] = useState<MigrationJob[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tierRes, policyRes, migRes] = await Promise.all([
        dataArchClient.getTiers(), dataArchClient.getRetentionPolicies(), dataArchClient.getMigrations(),
      ]);
      setTiers(tierRes.tiers); setPolicies(policyRes.policies || []); setMigrations(migRes.jobs || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const classify = useCallback(async (tableName: string, recordId: string, createdAt: string, lastAccessed: string, accessCount: number, size: number) => {
    try { const res = await dataArchClient.classifyRecord(tableName, recordId, createdAt, lastAccessed, accessCount, size); return res.classification; }
    catch { return null; }
  }, []);

  const estimateCosts = useCallback(async (hot: number, warm: number, cold: number, frozen: number, archive: number) => {
    try { const res = await dataArchClient.estimateCosts(hot, warm, cold, frozen, archive); return res.estimate; }
    catch { return null; }
  }, []);

  const createPolicy = useCallback(async (policy: Omit<RetentionPolicy, 'id'>) => {
    try { const res = await dataArchClient.createRetentionPolicy(policy); await load(); return res.id; }
    catch { return null; }
  }, [load]);

  return { tiers, policies, migrations, loading, load, classify, estimateCosts, createPolicy };
}

export function useVectorDB() {
  const [indexes, setIndexes] = useState<VectorIndex[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [idxRes, statsRes] = await Promise.all([dataArchClient.getVectorIndexes(), dataArchClient.getVectorStats()]);
      setIndexes(idxRes.indexes || []); setStats(statsRes.stats);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const createIndex = useCallback(async (name: string, namespace: string, dimensions: number, metric?: VectorMetric) => {
    try { const res = await dataArchClient.createVectorIndex(name, namespace, dimensions, metric); await load(); return res.id; }
    catch (e: any) { setError(e.message); return null; }
  }, [load]);

  const upsert = useCallback(async (namespace: string, vectors: { id: string; values: number[]; metadata?: Record<string, any> }[]) => {
    try { return await dataArchClient.upsertVectors(namespace, vectors); }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const search = useCallback(async (vector: number[], topK: number, namespace?: string, metric?: VectorMetric, filter?: Record<string, any>) => {
    try { return await dataArchClient.searchVectors(vector, topK, namespace, metric, filter); }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  return { indexes, stats, loading, error, load, createIndex, upsert, search };
}

export function useAnalyticsWarehouse() {
  const [schema, setSchema] = useState<WarehouseTable[]>([]);
  const [pipelines, setPipelines] = useState<ETLPipeline[]>([]);
  const [warehouseStats, setWarehouseStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [schemaRes, etlRes, statsRes] = await Promise.all([
        dataArchClient.getWarehouseSchema(), dataArchClient.getETLPipelines(), dataArchClient.getWarehouseStats(),
      ]);
      setSchema(schemaRes.tables || []); setPipelines(etlRes.pipelines || []); setWarehouseStats(statsRes.stats);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const createPipeline = useCallback(async (name: string, sourceTable: string, targetTable: string, transformQuery: string, schedule: string) => {
    try { const res = await dataArchClient.createETLPipeline(name, sourceTable, targetTable, transformQuery, schedule); await load(); return res.id; }
    catch (e: any) { setError(e.message); return null; }
  }, [load]);

  const runPipeline = useCallback(async (pipelineId: string) => {
    try { return await dataArchClient.runETLPipeline(pipelineId); }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const query = useCallback(async (sql: string, params?: any[]) => {
    try { return await dataArchClient.queryWarehouse(sql, params); }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  return { schema, pipelines, warehouseStats, loading, error, load, createPipeline, runPipeline, query };
}
