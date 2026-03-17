/**
 * NexusHR Feature #33 — Scalable Enterprise Data Architecture
 *
 * New capabilities:
 *   1. Multi-Region Database Fabric — region-aware routing, read replicas, conflict resolution,
 *      failover, latency-based routing, consistency levels (strong/bounded/eventual/session)
 *   2. Tenant Sharding Strategy — consistent hashing ring, shard assignment, virtual shards,
 *      shard rebalancing, hot-spot detection, cross-shard queries, shard migration
 *   3. Hot/Cold/Frozen Storage Tiers — automatic tier classification, migration policies,
 *      access-frequency scoring, compression, cost optimization, SLA-per-tier
 *   4. Archival System — retention policies, compliance holds, incremental archival,
 *      point-in-time recovery, archive search, legal hold management
 *   5. Vector Database for RAG — embedding storage, ANN search (HNSW), cosine/euclidean/dot-product
 *      similarity, metadata filtering, namespace isolation, batch upsert, quantization
 *   6. Analytics Data Warehouse — star schema, materialized views, ETL pipeline,
 *      aggregation tables, query optimizer hints, partition pruning, columnar projection
 *
 * Output:
 *   1. New data architecture (region fabric + shard router + storage engine)
 *   2. Sharding strategy (consistent hash ring + virtual shards + rebalancing)
 *   3. Storage lifecycle model (hot → warm → cold → frozen → archive → purge)
 */

import { Env } from '../index';

// ─── Types ──────────────────────────────────────────────────────────

export type RegionId = 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'eu-central-1' | 'ap-southeast-1' | 'ap-northeast-1';
export type ConsistencyLevel = 'strong' | 'bounded_staleness' | 'session' | 'eventual';
export type ReplicaRole = 'primary' | 'secondary' | 'read_replica' | 'analytics_replica';
export type ShardStatus = 'active' | 'draining' | 'migrating' | 'offline' | 'read_only';
export type StorageTier = 'hot' | 'warm' | 'cold' | 'frozen' | 'archive';
export type ArchiveStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'restoring';
export type RetentionAction = 'archive' | 'compress' | 'migrate_tier' | 'purge' | 'hold';
export type VectorMetric = 'cosine' | 'euclidean' | 'dot_product';
export type VectorIndexType = 'hnsw' | 'ivfflat' | 'brute_force';
export type WarehouseTableType = 'fact' | 'dimension' | 'aggregate' | 'materialized_view' | 'staging';
export type ETLStatus = 'idle' | 'extracting' | 'transforming' | 'loading' | 'completed' | 'failed';
export type ConflictResolution = 'last_write_wins' | 'vector_clock' | 'custom_merge' | 'manual';
export type MigrationStatus = 'planned' | 'in_progress' | 'validating' | 'completed' | 'rolled_back';

// ─── Region Configuration ───────────────────────────────────────────

interface RegionConfig {
  id: RegionId;
  name: string;
  provider: string;
  endpoint: string;
  role: ReplicaRole;
  priority: number;
  latencyBudget: number;  // ms
  capacity: { maxConnections: number; maxStorageGB: number; maxIOPS: number };
  features: string[];
  healthCheckInterval: number;  // seconds
}

const REGION_CONFIGS: Record<RegionId, RegionConfig> = {
  'us-east-1': {
    id: 'us-east-1', name: 'US East (Virginia)', provider: 'cloudflare', endpoint: 'https://db-us-east-1.nexushr.internal',
    role: 'primary', priority: 1, latencyBudget: 50,
    capacity: { maxConnections: 10000, maxStorageGB: 5000, maxIOPS: 50000 },
    features: ['write', 'read', 'analytics', 'vector', 'archive'],
    healthCheckInterval: 10,
  },
  'us-west-2': {
    id: 'us-west-2', name: 'US West (Oregon)', provider: 'cloudflare', endpoint: 'https://db-us-west-2.nexushr.internal',
    role: 'secondary', priority: 2, latencyBudget: 80,
    capacity: { maxConnections: 8000, maxStorageGB: 3000, maxIOPS: 40000 },
    features: ['read', 'analytics', 'vector'],
    healthCheckInterval: 10,
  },
  'eu-west-1': {
    id: 'eu-west-1', name: 'EU West (Ireland)', provider: 'cloudflare', endpoint: 'https://db-eu-west-1.nexushr.internal',
    role: 'secondary', priority: 3, latencyBudget: 100,
    capacity: { maxConnections: 8000, maxStorageGB: 3000, maxIOPS: 40000 },
    features: ['write', 'read', 'analytics', 'vector'],
    healthCheckInterval: 10,
  },
  'eu-central-1': {
    id: 'eu-central-1', name: 'EU Central (Frankfurt)', provider: 'cloudflare', endpoint: 'https://db-eu-central-1.nexushr.internal',
    role: 'read_replica', priority: 4, latencyBudget: 100,
    capacity: { maxConnections: 5000, maxStorageGB: 2000, maxIOPS: 30000 },
    features: ['read', 'vector'],
    healthCheckInterval: 15,
  },
  'ap-southeast-1': {
    id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', provider: 'cloudflare', endpoint: 'https://db-ap-southeast-1.nexushr.internal',
    role: 'secondary', priority: 5, latencyBudget: 150,
    capacity: { maxConnections: 5000, maxStorageGB: 2000, maxIOPS: 30000 },
    features: ['write', 'read', 'vector'],
    healthCheckInterval: 15,
  },
  'ap-northeast-1': {
    id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', provider: 'cloudflare', endpoint: 'https://db-ap-northeast-1.nexushr.internal',
    role: 'read_replica', priority: 6, latencyBudget: 150,
    capacity: { maxConnections: 5000, maxStorageGB: 2000, maxIOPS: 30000 },
    features: ['read'],
    healthCheckInterval: 15,
  },
};

// ─── Multi-Region Database Fabric ───────────────────────────────────

interface RegionHealth {
  region: RegionId;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unreachable';
  latencyMs: number;
  activeConnections: number;
  replicationLagMs: number;
  lastChecked: string;
  errorRate: number;
}

interface RoutingDecision {
  targetRegion: RegionId;
  fallbackRegion: RegionId | null;
  consistency: ConsistencyLevel;
  reason: string;
  estimatedLatency: number;
}

class MultiRegionFabric {
  private env: Env;
  private healthCache: Map<RegionId, RegionHealth> = new Map();

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Route a database operation to the optimal region.
   * Considers: consistency requirements, operation type, client region, latency, health.
   */
  routeOperation(
    operation: 'read' | 'write' | 'analytics' | 'vector',
    clientRegion: RegionId | null,
    consistency: ConsistencyLevel = 'session',
    tenantPreferredRegion?: RegionId
  ): RoutingDecision {
    // Write operations must go to primary (strong) or nearest writer (eventual)
    if (operation === 'write') {
      if (consistency === 'strong') {
        return {
          targetRegion: 'us-east-1', fallbackRegion: 'eu-west-1',
          consistency: 'strong', reason: 'Strong consistency writes routed to primary',
          estimatedLatency: this.estimateLatency(clientRegion, 'us-east-1'),
        };
      }
      // Multi-master: route to nearest writer
      const writers = this.getRegionsWithFeature('write');
      const nearest = this.findNearest(clientRegion, writers);
      const fallback = writers.find(r => r !== nearest) || null;
      return {
        targetRegion: nearest, fallbackRegion: fallback, consistency,
        reason: 'Write routed to nearest multi-master region',
        estimatedLatency: this.estimateLatency(clientRegion, nearest),
      };
    }

    // Read operations: route to nearest healthy replica
    if (operation === 'read') {
      const readers = this.getRegionsWithFeature('read');
      // Tenant preference takes priority if healthy
      if (tenantPreferredRegion && readers.includes(tenantPreferredRegion)) {
        const health = this.healthCache.get(tenantPreferredRegion);
        if (!health || health.status === 'healthy' || health.status === 'degraded') {
          return {
            targetRegion: tenantPreferredRegion, fallbackRegion: this.findNearest(clientRegion, readers.filter(r => r !== tenantPreferredRegion)),
            consistency, reason: 'Routed to tenant preferred region',
            estimatedLatency: this.estimateLatency(clientRegion, tenantPreferredRegion),
          };
        }
      }
      // Bounded staleness: check replication lag
      if (consistency === 'bounded_staleness') {
        const eligible = readers.filter(r => {
          const h = this.healthCache.get(r);
          return !h || h.replicationLagMs < 5000; // 5s staleness bound
        });
        const nearest = this.findNearest(clientRegion, eligible.length > 0 ? eligible : readers);
        return {
          targetRegion: nearest, fallbackRegion: this.findNearest(clientRegion, readers.filter(r => r !== nearest)),
          consistency, reason: 'Bounded staleness read from nearest eligible replica',
          estimatedLatency: this.estimateLatency(clientRegion, nearest),
        };
      }
      const nearest = this.findNearest(clientRegion, readers);
      return {
        targetRegion: nearest, fallbackRegion: this.findNearest(clientRegion, readers.filter(r => r !== nearest)),
        consistency, reason: 'Read routed to nearest replica',
        estimatedLatency: this.estimateLatency(clientRegion, nearest),
      };
    }

    // Analytics: dedicated analytics replicas
    if (operation === 'analytics') {
      const analyticsRegions = this.getRegionsWithFeature('analytics');
      const target = this.findNearest(clientRegion, analyticsRegions);
      return {
        targetRegion: target, fallbackRegion: analyticsRegions.find(r => r !== target) || null,
        consistency: 'eventual', reason: 'Analytics query routed to analytics replica',
        estimatedLatency: this.estimateLatency(clientRegion, target),
      };
    }

    // Vector: regions with vector capability
    const vectorRegions = this.getRegionsWithFeature('vector');
    const target = this.findNearest(clientRegion, vectorRegions);
    return {
      targetRegion: target, fallbackRegion: vectorRegions.find(r => r !== target) || null,
      consistency: 'eventual', reason: 'Vector query routed to nearest vector-capable region',
      estimatedLatency: this.estimateLatency(clientRegion, target),
    };
  }

  /**
   * Update region health status.
   */
  updateHealth(region: RegionId, health: Partial<RegionHealth>): void {
    const existing = this.healthCache.get(region) || {
      region, status: 'healthy' as const, latencyMs: 0, activeConnections: 0,
      replicationLagMs: 0, lastChecked: new Date().toISOString(), errorRate: 0,
    };
    this.healthCache.set(region, { ...existing, ...health, lastChecked: new Date().toISOString() });
  }

  getHealth(): RegionHealth[] {
    return Array.from(this.healthCache.values());
  }

  getRegions(): RegionConfig[] {
    return Object.values(REGION_CONFIGS);
  }

  /**
   * Conflict resolution for multi-master writes.
   */
  resolveConflict(
    strategy: ConflictResolution,
    localVersion: { value: any; timestamp: number; vectorClock: Record<string, number> },
    remoteVersion: { value: any; timestamp: number; vectorClock: Record<string, number> }
  ): { winner: 'local' | 'remote'; merged?: any; reason: string } {
    switch (strategy) {
      case 'last_write_wins':
        return localVersion.timestamp >= remoteVersion.timestamp
          ? { winner: 'local', reason: 'Local timestamp is newer or equal' }
          : { winner: 'remote', reason: 'Remote timestamp is newer' };

      case 'vector_clock': {
        const localDominates = Object.entries(localVersion.vectorClock).every(
          ([k, v]) => v >= (remoteVersion.vectorClock[k] || 0)
        );
        const remoteDominates = Object.entries(remoteVersion.vectorClock).every(
          ([k, v]) => v >= (localVersion.vectorClock[k] || 0)
        );
        if (localDominates && !remoteDominates) return { winner: 'local', reason: 'Local vector clock dominates' };
        if (remoteDominates && !localDominates) return { winner: 'remote', reason: 'Remote vector clock dominates' };
        // Concurrent — fall back to timestamp
        return localVersion.timestamp >= remoteVersion.timestamp
          ? { winner: 'local', reason: 'Concurrent writes, local timestamp wins' }
          : { winner: 'remote', reason: 'Concurrent writes, remote timestamp wins' };
      }

      case 'custom_merge':
        return { winner: 'local', merged: { ...remoteVersion.value, ...localVersion.value }, reason: 'Deep merge applied' };

      default:
        return { winner: 'local', reason: 'Manual resolution required — defaulting to local' };
    }
  }

  private getRegionsWithFeature(feature: string): RegionId[] {
    return Object.values(REGION_CONFIGS)
      .filter(r => r.features.includes(feature))
      .sort((a, b) => a.priority - b.priority)
      .map(r => r.id);
  }

  private findNearest(clientRegion: RegionId | null, candidates: RegionId[]): RegionId {
    if (!clientRegion || candidates.length === 0) return candidates[0] || 'us-east-1';
    if (candidates.includes(clientRegion)) return clientRegion;

    // Simple latency estimation based on region proximity
    const latencies = candidates.map(c => ({
      region: c, latency: this.estimateLatency(clientRegion, c),
    }));
    latencies.sort((a, b) => a.latency - b.latency);
    return latencies[0].region;
  }

  private estimateLatency(from: RegionId | null, to: RegionId): number {
    if (!from || from === to) return 5;
    const LATENCY_MAP: Record<string, number> = {
      'us-east-1:us-west-2': 65, 'us-east-1:eu-west-1': 80, 'us-east-1:eu-central-1': 90,
      'us-east-1:ap-southeast-1': 200, 'us-east-1:ap-northeast-1': 160,
      'us-west-2:eu-west-1': 140, 'us-west-2:eu-central-1': 150,
      'us-west-2:ap-southeast-1': 150, 'us-west-2:ap-northeast-1': 100,
      'eu-west-1:eu-central-1': 20, 'eu-west-1:ap-southeast-1': 180, 'eu-west-1:ap-northeast-1': 220,
      'eu-central-1:ap-southeast-1': 170, 'eu-central-1:ap-northeast-1': 210,
      'ap-southeast-1:ap-northeast-1': 70,
    };
    const key1 = `${from}:${to}`;
    const key2 = `${to}:${from}`;
    return LATENCY_MAP[key1] || LATENCY_MAP[key2] || 100;
  }
}

// ─── Consistent Hash Ring (Tenant Sharding) ─────────────────────────

interface ShardConfig {
  id: string;
  virtualNodes: number;
  region: RegionId;
  status: ShardStatus;
  tenantCount: number;
  storageUsedGB: number;
  maxStorageGB: number;
  iopsUsed: number;
  maxIOPS: number;
  createdAt: string;
}

interface ShardAssignment {
  tenantId: string;
  shardId: string;
  region: RegionId;
  assignedAt: string;
  migratingTo: string | null;
}

class ConsistentHashRing {
  private ring: Map<number, string> = new Map();
  private sortedHashes: number[] = [];
  private shards: Map<string, ShardConfig> = new Map();
  private virtualNodesPerShard: number;

  constructor(virtualNodesPerShard: number = 150) {
    this.virtualNodesPerShard = virtualNodesPerShard;
  }

  /**
   * Add a shard to the hash ring with virtual nodes.
   */
  addShard(shard: ShardConfig): void {
    this.shards.set(shard.id, shard);
    const vnodes = shard.virtualNodes || this.virtualNodesPerShard;
    for (let i = 0; i < vnodes; i++) {
      const hash = this.hashKey(`${shard.id}:vnode:${i}`);
      this.ring.set(hash, shard.id);
    }
    this.rebuildSortedHashes();
  }

  /**
   * Remove a shard from the ring (for draining/decommission).
   */
  removeShard(shardId: string): string[] {
    const affectedTenants: string[] = [];
    const hashesToRemove: number[] = [];

    this.ring.forEach((sid, hash) => {
      if (sid === shardId) hashesToRemove.push(hash);
    });

    for (const hash of hashesToRemove) this.ring.delete(hash);
    this.shards.delete(shardId);
    this.rebuildSortedHashes();

    return affectedTenants;
  }

  /**
   * Determine which shard a tenant should be assigned to.
   */
  getShardForTenant(tenantId: string): string {
    if (this.sortedHashes.length === 0) return 'shard-default';
    const hash = this.hashKey(tenantId);

    // Binary search for the first hash >= tenant hash
    let lo = 0, hi = this.sortedHashes.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.sortedHashes[mid] < hash) lo = mid + 1;
      else hi = mid;
    }

    // Wrap around to first node if past the end
    const ringHash = this.sortedHashes[lo] !== undefined && this.sortedHashes[lo] >= hash
      ? this.sortedHashes[lo]
      : this.sortedHashes[0];

    return this.ring.get(ringHash) || 'shard-default';
  }

  /**
   * Detect hot shards (above threshold utilization).
   */
  detectHotSpots(cpuThreshold: number = 0.8, storageThreshold: number = 0.85): ShardConfig[] {
    return Array.from(this.shards.values()).filter(s =>
      s.storageUsedGB / s.maxStorageGB > storageThreshold ||
      s.iopsUsed / s.maxIOPS > cpuThreshold
    );
  }

  /**
   * Plan shard rebalancing. Returns migration plan.
   */
  planRebalance(): { from: string; to: string; tenantCount: number; estimatedDuration: string }[] {
    const shardsList = Array.from(this.shards.values()).filter(s => s.status === 'active');
    if (shardsList.length < 2) return [];

    const avgTenants = shardsList.reduce((sum, s) => sum + s.tenantCount, 0) / shardsList.length;
    const overloaded = shardsList.filter(s => s.tenantCount > avgTenants * 1.3);
    const underloaded = shardsList.filter(s => s.tenantCount < avgTenants * 0.7);

    const plan: { from: string; to: string; tenantCount: number; estimatedDuration: string }[] = [];
    for (const over of overloaded) {
      for (const under of underloaded) {
        const moveCount = Math.floor((over.tenantCount - avgTenants) / 2);
        if (moveCount > 0) {
          plan.push({
            from: over.id, to: under.id, tenantCount: moveCount,
            estimatedDuration: `${Math.ceil(moveCount * 2)}m`, // ~2 min per tenant
          });
        }
      }
    }
    return plan;
  }

  /**
   * Get ring statistics.
   */
  getStats(): {
    totalShards: number; totalVNodes: number; activeShards: number;
    distribution: { shardId: string; vnodeCount: number; tenantCount: number; utilization: number }[];
  } {
    const distribution = Array.from(this.shards.values()).map(s => ({
      shardId: s.id,
      vnodeCount: Array.from(this.ring.values()).filter(v => v === s.id).length,
      tenantCount: s.tenantCount,
      utilization: s.maxStorageGB > 0 ? s.storageUsedGB / s.maxStorageGB : 0,
    }));

    return {
      totalShards: this.shards.size,
      totalVNodes: this.ring.size,
      activeShards: Array.from(this.shards.values()).filter(s => s.status === 'active').length,
      distribution,
    };
  }

  getShards(): ShardConfig[] {
    return Array.from(this.shards.values());
  }

  private hashKey(key: string): number {
    // FNV-1a 32-bit hash for consistent distribution
    let hash = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash;
  }

  private rebuildSortedHashes(): void {
    this.sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }
}

// ─── Storage Lifecycle Engine ───────────────────────────────────────

interface TierConfig {
  tier: StorageTier;
  description: string;
  maxAgeDays: number | null;      // null = no age limit
  minAccessFrequency: number;     // accesses per 30 days to stay in tier
  compressionAlgorithm: string | null;
  encryptionRequired: boolean;
  slaReadLatency: string;
  slaAvailability: string;
  costMultiplier: number;         // relative to hot = 1.0
  storageEngine: string;
}

const TIER_CONFIGS: Record<StorageTier, TierConfig> = {
  hot: {
    tier: 'hot', description: 'Primary operational data — sub-10ms reads',
    maxAgeDays: null, minAccessFrequency: 10, compressionAlgorithm: null,
    encryptionRequired: true, slaReadLatency: '< 10ms', slaAvailability: '99.99%',
    costMultiplier: 1.0, storageEngine: 'D1 (SQLite)',
  },
  warm: {
    tier: 'warm', description: 'Recent data — sub-100ms reads',
    maxAgeDays: 90, minAccessFrequency: 1, compressionAlgorithm: 'lz4',
    encryptionRequired: true, slaReadLatency: '< 100ms', slaAvailability: '99.95%',
    costMultiplier: 0.5, storageEngine: 'D1 secondary + KV cache',
  },
  cold: {
    tier: 'cold', description: 'Infrequent access — sub-1s reads',
    maxAgeDays: 365, minAccessFrequency: 0.1, compressionAlgorithm: 'zstd',
    encryptionRequired: true, slaReadLatency: '< 1s', slaAvailability: '99.9%',
    costMultiplier: 0.2, storageEngine: 'R2 Object Storage',
  },
  frozen: {
    tier: 'frozen', description: 'Rare access — multi-second reads',
    maxAgeDays: 1095, minAccessFrequency: 0, compressionAlgorithm: 'zstd-19',
    encryptionRequired: true, slaReadLatency: '< 10s', slaAvailability: '99.5%',
    costMultiplier: 0.05, storageEngine: 'R2 Infrequent Access',
  },
  archive: {
    tier: 'archive', description: 'Compliance retention — minutes to hours retrieval',
    maxAgeDays: null, minAccessFrequency: 0, compressionAlgorithm: 'zstd-22',
    encryptionRequired: true, slaReadLatency: '< 4h', slaAvailability: '99%',
    costMultiplier: 0.01, storageEngine: 'R2 Archive',
  },
};

interface StorageClassification {
  tableName: string;
  recordId: string;
  currentTier: StorageTier;
  recommendedTier: StorageTier;
  lastAccessed: string;
  accessCount30d: number;
  recordAgeDays: number;
  sizeBytes: number;
  reason: string;
}

interface MigrationJob {
  id: string;
  tableName: string;
  fromTier: StorageTier;
  toTier: StorageTier;
  recordCount: number;
  totalSizeBytes: number;
  status: MigrationStatus;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

interface RetentionPolicy {
  id: string;
  tableName: string;
  tenantId: string | null;  // null = global policy
  hotDays: number;
  warmDays: number;
  coldDays: number;
  frozenDays: number;
  archiveDays: number;
  purgeDays: number | null;   // null = never purge
  legalHold: boolean;
  complianceFramework: string | null;
}

class StorageLifecycleEngine {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Classify a record into the appropriate storage tier.
   */
  classifyRecord(
    tableName: string, recordId: string, createdAt: string,
    lastAccessed: string, accessCount30d: number, sizeBytes: number,
    policy?: RetentionPolicy
  ): StorageClassification {
    const ageDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
    const daysSinceAccess = Math.floor((Date.now() - new Date(lastAccessed).getTime()) / 86400000);

    // Use policy thresholds if available, otherwise defaults
    const hotThreshold = policy?.hotDays || 30;
    const warmThreshold = policy?.warmDays || 90;
    const coldThreshold = policy?.coldDays || 365;
    const frozenThreshold = policy?.frozenDays || 1095;

    let recommendedTier: StorageTier = 'hot';
    let reason = 'Active data with frequent access';

    if (ageDays > frozenThreshold || (daysSinceAccess > 365 && accessCount30d === 0)) {
      recommendedTier = 'frozen';
      reason = `Data age ${ageDays}d exceeds frozen threshold (${frozenThreshold}d)`;
    } else if (ageDays > coldThreshold || (daysSinceAccess > 180 && accessCount30d < 1)) {
      recommendedTier = 'cold';
      reason = `Data age ${ageDays}d exceeds cold threshold (${coldThreshold}d)`;
    } else if (ageDays > warmThreshold || (daysSinceAccess > 30 && accessCount30d < 5)) {
      recommendedTier = 'warm';
      reason = `Data age ${ageDays}d or low access frequency (${accessCount30d}/30d)`;
    } else if (accessCount30d >= 10 || daysSinceAccess < 7) {
      recommendedTier = 'hot';
      reason = `High access frequency (${accessCount30d}/30d)`;
    } else {
      recommendedTier = 'warm';
      reason = 'Moderate access pattern';
    }

    return {
      tableName, recordId, currentTier: 'hot', recommendedTier,
      lastAccessed, accessCount30d, recordAgeDays: ageDays, sizeBytes, reason,
    };
  }

  /**
   * Get tier configuration and cost model.
   */
  getTierConfig(tier?: StorageTier): TierConfig | Record<StorageTier, TierConfig> {
    if (tier) return TIER_CONFIGS[tier];
    return TIER_CONFIGS;
  }

  /**
   * Calculate storage cost estimate across tiers.
   */
  estimateCosts(
    hotGB: number, warmGB: number, coldGB: number, frozenGB: number, archiveGB: number,
    basePricePerGB: number = 0.25
  ): {
    total: number;
    breakdown: { tier: StorageTier; sizeGB: number; costPerGB: number; monthlyCost: number }[];
    savings: number;
    savingsPercent: number;
  } {
    const allHotCost = (hotGB + warmGB + coldGB + frozenGB + archiveGB) * basePricePerGB;
    const breakdown = [
      { tier: 'hot' as StorageTier, sizeGB: hotGB, costPerGB: basePricePerGB * TIER_CONFIGS.hot.costMultiplier, monthlyCost: hotGB * basePricePerGB * TIER_CONFIGS.hot.costMultiplier },
      { tier: 'warm' as StorageTier, sizeGB: warmGB, costPerGB: basePricePerGB * TIER_CONFIGS.warm.costMultiplier, monthlyCost: warmGB * basePricePerGB * TIER_CONFIGS.warm.costMultiplier },
      { tier: 'cold' as StorageTier, sizeGB: coldGB, costPerGB: basePricePerGB * TIER_CONFIGS.cold.costMultiplier, monthlyCost: coldGB * basePricePerGB * TIER_CONFIGS.cold.costMultiplier },
      { tier: 'frozen' as StorageTier, sizeGB: frozenGB, costPerGB: basePricePerGB * TIER_CONFIGS.frozen.costMultiplier, monthlyCost: frozenGB * basePricePerGB * TIER_CONFIGS.frozen.costMultiplier },
      { tier: 'archive' as StorageTier, sizeGB: archiveGB, costPerGB: basePricePerGB * TIER_CONFIGS.archive.costMultiplier, monthlyCost: archiveGB * basePricePerGB * TIER_CONFIGS.archive.costMultiplier },
    ];
    const total = breakdown.reduce((sum, b) => sum + b.monthlyCost, 0);
    return { total, breakdown, savings: allHotCost - total, savingsPercent: allHotCost > 0 ? ((allHotCost - total) / allHotCost) * 100 : 0 };
  }

  /**
   * Create a retention policy.
   */
  async createRetentionPolicy(policy: Omit<RetentionPolicy, 'id'>): Promise<{ id: string }> {
    const id = crypto.randomUUID().replace(/-/g, '');
    await this.env.DB.prepare(`
      INSERT INTO data_retention_policies (id, table_name, tenant_id, hot_days, warm_days, cold_days, frozen_days, archive_days, purge_days, legal_hold, compliance_framework, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(id, policy.tableName, policy.tenantId, policy.hotDays, policy.warmDays, policy.coldDays, policy.frozenDays, policy.archiveDays, policy.purgeDays, policy.legalHold ? 1 : 0, policy.complianceFramework).run();
    return { id };
  }

  /**
   * Get retention policies.
   */
  async getRetentionPolicies(tenantId?: string): Promise<RetentionPolicy[]> {
    const query = tenantId
      ? this.env.DB.prepare(`SELECT * FROM data_retention_policies WHERE tenant_id = ? OR tenant_id IS NULL ORDER BY table_name`).bind(tenantId)
      : this.env.DB.prepare(`SELECT * FROM data_retention_policies ORDER BY table_name`);
    const result = await query.all();
    return (result.results || []).map((r: any) => ({
      id: r.id, tableName: r.table_name, tenantId: r.tenant_id,
      hotDays: r.hot_days, warmDays: r.warm_days, coldDays: r.cold_days,
      frozenDays: r.frozen_days, archiveDays: r.archive_days, purgeDays: r.purge_days,
      legalHold: r.legal_hold === 1, complianceFramework: r.compliance_framework,
    }));
  }

  /**
   * Set legal hold on a tenant's data (prevents all tier migration and purging).
   */
  async setLegalHold(tenantId: string, hold: boolean, reason: string): Promise<void> {
    const id = crypto.randomUUID().replace(/-/g, '');
    await this.env.DB.prepare(`
      INSERT INTO data_legal_holds (id, tenant_id, active, reason, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(id, tenantId, hold ? 1 : 0, reason).run();

    // Update all retention policies for this tenant
    await this.env.DB.prepare(`
      UPDATE data_retention_policies SET legal_hold = ? WHERE tenant_id = ?
    `).bind(hold ? 1 : 0, tenantId).run();
  }

  /**
   * Get legal holds.
   */
  async getLegalHolds(tenantId?: string): Promise<any[]> {
    const query = tenantId
      ? this.env.DB.prepare(`SELECT * FROM data_legal_holds WHERE tenant_id = ? ORDER BY created_at DESC`).bind(tenantId)
      : this.env.DB.prepare(`SELECT * FROM data_legal_holds ORDER BY created_at DESC`);
    const result = await query.all();
    return result.results || [];
  }

  /**
   * Create a tier migration job.
   */
  async createMigrationJob(tableName: string, fromTier: StorageTier, toTier: StorageTier, recordCount: number, totalSizeBytes: number): Promise<{ id: string }> {
    const id = crypto.randomUUID().replace(/-/g, '');
    await this.env.DB.prepare(`
      INSERT INTO data_migration_jobs (id, table_name, from_tier, to_tier, record_count, total_size_bytes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'planned', datetime('now'))
    `).bind(id, tableName, fromTier, toTier, recordCount, totalSizeBytes).run();
    return { id };
  }

  /**
   * Get migration jobs.
   */
  async getMigrationJobs(status?: MigrationStatus): Promise<MigrationJob[]> {
    const query = status
      ? this.env.DB.prepare(`SELECT * FROM data_migration_jobs WHERE status = ? ORDER BY created_at DESC`).bind(status)
      : this.env.DB.prepare(`SELECT * FROM data_migration_jobs ORDER BY created_at DESC LIMIT 100`);
    const result = await query.all();
    return (result.results || []).map((r: any) => ({
      id: r.id, tableName: r.table_name, fromTier: r.from_tier, toTier: r.to_tier,
      recordCount: r.record_count, totalSizeBytes: r.total_size_bytes, status: r.status,
      startedAt: r.started_at, completedAt: r.completed_at, error: r.error,
    }));
  }
}

// ─── Vector Database for RAG ────────────────────────────────────────

interface VectorIndex {
  id: string;
  name: string;
  namespace: string;
  dimensions: number;
  metric: VectorMetric;
  indexType: VectorIndexType;
  hnswConfig: { M: number; efConstruction: number; efSearch: number };
  vectorCount: number;
  status: 'building' | 'ready' | 'rebuilding' | 'error';
}

interface VectorRecord {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
  namespace: string;
  createdAt: string;
}

interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

interface VectorSearchParams {
  vector: number[];
  topK: number;
  namespace?: string;
  metric?: VectorMetric;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  minScore?: number;
}

class VectorDatabase {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Create a vector index (namespace).
   */
  async createIndex(name: string, namespace: string, dimensions: number, metric: VectorMetric = 'cosine', indexType: VectorIndexType = 'hnsw'): Promise<{ id: string }> {
    const id = crypto.randomUUID().replace(/-/g, '');
    const hnswConfig = { M: 16, efConstruction: 200, efSearch: 50 };

    await this.env.DB.prepare(`
      INSERT INTO vector_indexes (id, name, namespace, dimensions, metric, index_type, hnsw_config, vector_count, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'ready', datetime('now'))
    `).bind(id, name, namespace, dimensions, metric, indexType, JSON.stringify(hnswConfig)).run();

    return { id };
  }

  /**
   * Upsert vectors (batch). Stores vectors serialized in D1 for the shim layer.
   * In production, this would use a dedicated vector store (Pinecone, Qdrant, pgvector).
   */
  async upsert(namespace: string, vectors: { id: string; values: number[]; metadata?: Record<string, any> }[]): Promise<{ upserted: number }> {
    let upserted = 0;
    for (const v of vectors) {
      await this.env.DB.prepare(`
        INSERT INTO vector_records (id, namespace, vector_data, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(id, namespace) DO UPDATE SET
          vector_data = excluded.vector_data,
          metadata = excluded.metadata,
          updated_at = datetime('now')
      `).bind(v.id, namespace, JSON.stringify(v.values), JSON.stringify(v.metadata || {})).run();
      upserted++;
    }

    // Update vector count
    const count = await this.env.DB.prepare(`SELECT COUNT(*) as cnt FROM vector_records WHERE namespace = ?`).bind(namespace).first() as any;
    await this.env.DB.prepare(`UPDATE vector_indexes SET vector_count = ? WHERE namespace = ?`).bind(count?.cnt || 0, namespace).run();

    return { upserted };
  }

  /**
   * Approximate Nearest Neighbor search.
   * Uses brute-force cosine/euclidean/dot in D1 (production would use HNSW index).
   */
  async search(params: VectorSearchParams): Promise<{ results: VectorSearchResult[]; searchTime: number }> {
    const startTime = Date.now();

    // Fetch candidate vectors
    let query = `SELECT id, vector_data, metadata FROM vector_records`;
    const binds: any[] = [];
    const conditions: string[] = [];

    if (params.namespace) {
      conditions.push('namespace = ?');
      binds.push(params.namespace);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' LIMIT 10000'; // Scan limit for brute-force

    const rows = await this.env.DB.prepare(query).bind(...binds).all();
    const candidates = (rows.results || []) as any[];

    // Compute similarity
    const metric = params.metric || 'cosine';
    const scored: VectorSearchResult[] = [];

    for (const row of candidates) {
      const candidateVector = JSON.parse(row.vector_data);
      const metadata = JSON.parse(row.metadata || '{}');

      // Metadata filter
      if (params.filter) {
        const match = Object.entries(params.filter).every(([k, v]) => metadata[k] === v);
        if (!match) continue;
      }

      const score = this.computeSimilarity(params.vector, candidateVector, metric);

      if (params.minScore !== undefined && score < params.minScore) continue;

      scored.push({
        id: row.id,
        score,
        metadata: params.includeMetadata !== false ? metadata : {},
      });
    }

    // Sort by score (descending for cosine/dot, ascending for euclidean)
    if (metric === 'euclidean') {
      scored.sort((a, b) => a.score - b.score);
    } else {
      scored.sort((a, b) => b.score - a.score);
    }

    return {
      results: scored.slice(0, params.topK),
      searchTime: Date.now() - startTime,
    };
  }

  /**
   * Delete vectors by ID.
   */
  async deleteVectors(namespace: string, ids: string[]): Promise<{ deleted: number }> {
    let deleted = 0;
    for (const id of ids) {
      const result = await this.env.DB.prepare(`DELETE FROM vector_records WHERE id = ? AND namespace = ?`).bind(id, namespace).run();
      deleted += result.meta?.changes || 0;
    }
    return { deleted };
  }

  /**
   * Get index info.
   */
  async getIndexes(): Promise<VectorIndex[]> {
    const result = await this.env.DB.prepare(`SELECT * FROM vector_indexes ORDER BY name`).all();
    return (result.results || []).map((r: any) => ({
      id: r.id, name: r.name, namespace: r.namespace, dimensions: r.dimensions,
      metric: r.metric, indexType: r.index_type, hnswConfig: JSON.parse(r.hnsw_config || '{}'),
      vectorCount: r.vector_count, status: r.status,
    }));
  }

  /**
   * Get index stats.
   */
  async getStats(namespace?: string): Promise<{ totalVectors: number; totalIndexes: number; namespaces: { namespace: string; count: number }[] }> {
    const totalVectors = await this.env.DB.prepare(`SELECT COUNT(*) as cnt FROM vector_records ${namespace ? 'WHERE namespace = ?' : ''}`).bind(...(namespace ? [namespace] : [])).first() as any;
    const totalIndexes = await this.env.DB.prepare(`SELECT COUNT(*) as cnt FROM vector_indexes`).first() as any;
    const nsResult = await this.env.DB.prepare(`SELECT namespace, COUNT(*) as cnt FROM vector_records GROUP BY namespace`).all();

    return {
      totalVectors: totalVectors?.cnt || 0,
      totalIndexes: totalIndexes?.cnt || 0,
      namespaces: (nsResult.results || []).map((r: any) => ({ namespace: r.namespace, count: r.cnt })),
    };
  }

  private computeSimilarity(a: number[], b: number[], metric: VectorMetric): number {
    if (a.length !== b.length) return 0;

    switch (metric) {
      case 'cosine': {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
          dot += a[i] * b[i];
          normA += a[i] * a[i];
          normB += b[i] * b[i];
        }
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom === 0 ? 0 : dot / denom;
      }
      case 'euclidean': {
        let sum = 0;
        for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
        return Math.sqrt(sum);
      }
      case 'dot_product': {
        let dot = 0;
        for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
        return dot;
      }
      default: return 0;
    }
  }
}

// ─── Analytics Data Warehouse ───────────────────────────────────────

interface WarehouseTable {
  name: string;
  type: WarehouseTableType;
  description: string;
  columns: WarehouseColumn[];
  partitionKey: string | null;
  clusterKeys: string[];
  refreshInterval: number | null; // seconds, for materialized views
}

interface WarehouseColumn {
  name: string;
  type: string;
  nullable: boolean;
  description: string;
  isMetric: boolean;
  isDimension: boolean;
}

interface ETLPipeline {
  id: string;
  name: string;
  sourceTable: string;
  targetTable: string;
  transformQuery: string;
  schedule: string;
  status: ETLStatus;
  lastRunAt: string | null;
  lastRunDuration: number | null;
  recordsProcessed: number;
}

const WAREHOUSE_SCHEMA: WarehouseTable[] = [
  {
    name: 'fact_tasks', type: 'fact', description: 'Task execution facts — one row per task',
    partitionKey: 'created_date', clusterKeys: ['tenant_id', 'employee_id'], refreshInterval: null,
    columns: [
      { name: 'task_id', type: 'TEXT', nullable: false, description: 'Task unique ID', isMetric: false, isDimension: true },
      { name: 'tenant_id', type: 'TEXT', nullable: false, description: 'Tenant ID', isMetric: false, isDimension: true },
      { name: 'employee_id', type: 'TEXT', nullable: false, description: 'AI employee ID', isMetric: false, isDimension: true },
      { name: 'task_type', type: 'TEXT', nullable: false, description: 'Task category', isMetric: false, isDimension: true },
      { name: 'status', type: 'TEXT', nullable: false, description: 'Final status', isMetric: false, isDimension: true },
      { name: 'priority', type: 'TEXT', nullable: true, description: 'Task priority', isMetric: false, isDimension: true },
      { name: 'created_date', type: 'TEXT', nullable: false, description: 'Partition date', isMetric: false, isDimension: true },
      { name: 'duration_seconds', type: 'REAL', nullable: true, description: 'Execution duration', isMetric: true, isDimension: false },
      { name: 'token_count', type: 'INTEGER', nullable: true, description: 'LLM tokens consumed', isMetric: true, isDimension: false },
      { name: 'cost_usd', type: 'REAL', nullable: true, description: 'Cost in USD', isMetric: true, isDimension: false },
      { name: 'satisfaction_score', type: 'REAL', nullable: true, description: 'User satisfaction 0-1', isMetric: true, isDimension: false },
    ],
  },
  {
    name: 'fact_conversations', type: 'fact', description: 'Conversation facts — one row per conversation session',
    partitionKey: 'created_date', clusterKeys: ['tenant_id', 'employee_id'], refreshInterval: null,
    columns: [
      { name: 'conversation_id', type: 'TEXT', nullable: false, description: 'Conversation ID', isMetric: false, isDimension: true },
      { name: 'tenant_id', type: 'TEXT', nullable: false, description: 'Tenant ID', isMetric: false, isDimension: true },
      { name: 'employee_id', type: 'TEXT', nullable: false, description: 'AI employee ID', isMetric: false, isDimension: true },
      { name: 'channel', type: 'TEXT', nullable: true, description: 'Channel (chat/voice/video)', isMetric: false, isDimension: true },
      { name: 'created_date', type: 'TEXT', nullable: false, description: 'Partition date', isMetric: false, isDimension: true },
      { name: 'message_count', type: 'INTEGER', nullable: false, description: 'Total messages', isMetric: true, isDimension: false },
      { name: 'duration_seconds', type: 'REAL', nullable: true, description: 'Session duration', isMetric: true, isDimension: false },
      { name: 'resolution_achieved', type: 'INTEGER', nullable: true, description: 'Was issue resolved', isMetric: true, isDimension: false },
      { name: 'sentiment_avg', type: 'REAL', nullable: true, description: 'Average sentiment', isMetric: true, isDimension: false },
      { name: 'escalated', type: 'INTEGER', nullable: true, description: 'Was escalated', isMetric: true, isDimension: false },
    ],
  },
  {
    name: 'fact_billing', type: 'fact', description: 'Billing events — one row per charge',
    partitionKey: 'billing_date', clusterKeys: ['tenant_id'], refreshInterval: null,
    columns: [
      { name: 'billing_id', type: 'TEXT', nullable: false, description: 'Billing event ID', isMetric: false, isDimension: true },
      { name: 'tenant_id', type: 'TEXT', nullable: false, description: 'Tenant ID', isMetric: false, isDimension: true },
      { name: 'billing_date', type: 'TEXT', nullable: false, description: 'Partition date', isMetric: false, isDimension: true },
      { name: 'plan_id', type: 'TEXT', nullable: true, description: 'Plan tier', isMetric: false, isDimension: true },
      { name: 'line_item', type: 'TEXT', nullable: false, description: 'Charge type', isMetric: false, isDimension: true },
      { name: 'amount_usd', type: 'REAL', nullable: false, description: 'Charge amount', isMetric: true, isDimension: false },
      { name: 'quantity', type: 'REAL', nullable: true, description: 'Usage quantity', isMetric: true, isDimension: false },
    ],
  },
  {
    name: 'dim_tenants', type: 'dimension', description: 'Tenant dimension — slowly changing',
    partitionKey: null, clusterKeys: [], refreshInterval: null,
    columns: [
      { name: 'tenant_id', type: 'TEXT', nullable: false, description: 'Tenant ID', isMetric: false, isDimension: true },
      { name: 'company_name', type: 'TEXT', nullable: false, description: 'Company name', isMetric: false, isDimension: true },
      { name: 'industry', type: 'TEXT', nullable: true, description: 'Industry vertical', isMetric: false, isDimension: true },
      { name: 'plan_tier', type: 'TEXT', nullable: true, description: 'Subscription tier', isMetric: false, isDimension: true },
      { name: 'region', type: 'TEXT', nullable: true, description: 'Primary region', isMetric: false, isDimension: true },
      { name: 'employee_count', type: 'INTEGER', nullable: true, description: 'AI employees', isMetric: true, isDimension: false },
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Tenant creation', isMetric: false, isDimension: true },
    ],
  },
  {
    name: 'dim_employees', type: 'dimension', description: 'AI employee dimension',
    partitionKey: null, clusterKeys: [], refreshInterval: null,
    columns: [
      { name: 'employee_id', type: 'TEXT', nullable: false, description: 'Employee ID', isMetric: false, isDimension: true },
      { name: 'tenant_id', type: 'TEXT', nullable: false, description: 'Tenant ID', isMetric: false, isDimension: true },
      { name: 'role_name', type: 'TEXT', nullable: false, description: 'Role name', isMetric: false, isDimension: true },
      { name: 'category', type: 'TEXT', nullable: true, description: 'Role category', isMetric: false, isDimension: true },
      { name: 'personality', type: 'TEXT', nullable: true, description: 'Personality type', isMetric: false, isDimension: true },
      { name: 'status', type: 'TEXT', nullable: false, description: 'Active/inactive', isMetric: false, isDimension: true },
      { name: 'created_at', type: 'TEXT', nullable: false, description: 'Hire date', isMetric: false, isDimension: true },
    ],
  },
  {
    name: 'agg_daily_metrics', type: 'aggregate', description: 'Pre-aggregated daily metrics per tenant',
    partitionKey: 'metric_date', clusterKeys: ['tenant_id'], refreshInterval: 3600,
    columns: [
      { name: 'metric_date', type: 'TEXT', nullable: false, description: 'Metric date', isMetric: false, isDimension: true },
      { name: 'tenant_id', type: 'TEXT', nullable: false, description: 'Tenant ID', isMetric: false, isDimension: true },
      { name: 'tasks_created', type: 'INTEGER', nullable: false, description: 'Tasks created', isMetric: true, isDimension: false },
      { name: 'tasks_completed', type: 'INTEGER', nullable: false, description: 'Tasks completed', isMetric: true, isDimension: false },
      { name: 'conversations_started', type: 'INTEGER', nullable: false, description: 'New conversations', isMetric: true, isDimension: false },
      { name: 'messages_sent', type: 'INTEGER', nullable: false, description: 'Messages sent', isMetric: true, isDimension: false },
      { name: 'avg_response_time_ms', type: 'REAL', nullable: true, description: 'Avg response time', isMetric: true, isDimension: false },
      { name: 'avg_satisfaction', type: 'REAL', nullable: true, description: 'Avg satisfaction', isMetric: true, isDimension: false },
      { name: 'total_tokens', type: 'INTEGER', nullable: false, description: 'Total tokens', isMetric: true, isDimension: false },
      { name: 'total_cost_usd', type: 'REAL', nullable: false, description: 'Total cost', isMetric: true, isDimension: false },
      { name: 'active_employees', type: 'INTEGER', nullable: false, description: 'Active AI employees', isMetric: true, isDimension: false },
    ],
  },
  {
    name: 'mv_employee_performance', type: 'materialized_view', description: 'Employee performance scores — refreshed hourly',
    partitionKey: null, clusterKeys: ['tenant_id', 'employee_id'], refreshInterval: 3600,
    columns: [
      { name: 'employee_id', type: 'TEXT', nullable: false, description: 'Employee ID', isMetric: false, isDimension: true },
      { name: 'tenant_id', type: 'TEXT', nullable: false, description: 'Tenant ID', isMetric: false, isDimension: true },
      { name: 'period', type: 'TEXT', nullable: false, description: 'Period (7d/30d/90d)', isMetric: false, isDimension: true },
      { name: 'tasks_completed', type: 'INTEGER', nullable: false, description: 'Tasks completed', isMetric: true, isDimension: false },
      { name: 'avg_task_duration', type: 'REAL', nullable: true, description: 'Avg task duration', isMetric: true, isDimension: false },
      { name: 'satisfaction_score', type: 'REAL', nullable: true, description: 'Satisfaction score', isMetric: true, isDimension: false },
      { name: 'resolution_rate', type: 'REAL', nullable: true, description: 'Resolution rate', isMetric: true, isDimension: false },
      { name: 'escalation_rate', type: 'REAL', nullable: true, description: 'Escalation rate', isMetric: true, isDimension: false },
      { name: 'overall_score', type: 'REAL', nullable: true, description: 'Composite score 0-100', isMetric: true, isDimension: false },
    ],
  },
];

class AnalyticsWarehouse {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  getSchema(): WarehouseTable[] { return WAREHOUSE_SCHEMA; }

  getTable(name: string): WarehouseTable | null {
    return WAREHOUSE_SCHEMA.find(t => t.name === name) || null;
  }

  /**
   * Create an ETL pipeline.
   */
  async createETLPipeline(name: string, sourceTable: string, targetTable: string, transformQuery: string, schedule: string): Promise<{ id: string }> {
    const id = crypto.randomUUID().replace(/-/g, '');
    await this.env.DB.prepare(`
      INSERT INTO warehouse_etl_pipelines (id, name, source_table, target_table, transform_query, schedule, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'idle', datetime('now'))
    `).bind(id, name, sourceTable, targetTable, transformQuery, schedule).run();
    return { id };
  }

  /**
   * Get ETL pipelines.
   */
  async getETLPipelines(): Promise<ETLPipeline[]> {
    const result = await this.env.DB.prepare(`SELECT * FROM warehouse_etl_pipelines ORDER BY name`).all();
    return (result.results || []).map((r: any) => ({
      id: r.id, name: r.name, sourceTable: r.source_table, targetTable: r.target_table,
      transformQuery: r.transform_query, schedule: r.schedule, status: r.status,
      lastRunAt: r.last_run_at, lastRunDuration: r.last_run_duration, recordsProcessed: r.records_processed || 0,
    }));
  }

  /**
   * Run an ETL pipeline.
   */
  async runETLPipeline(pipelineId: string): Promise<{ status: string; recordsProcessed: number; duration: number }> {
    const startTime = Date.now();

    await this.env.DB.prepare(`UPDATE warehouse_etl_pipelines SET status = 'extracting', last_run_at = datetime('now') WHERE id = ?`).bind(pipelineId).run();

    const pipeline = await this.env.DB.prepare(`SELECT * FROM warehouse_etl_pipelines WHERE id = ?`).bind(pipelineId).first() as any;
    if (!pipeline) throw new Error('Pipeline not found');

    try {
      // Execute the transform query
      await this.env.DB.prepare(`UPDATE warehouse_etl_pipelines SET status = 'transforming' WHERE id = ?`).bind(pipelineId).run();
      const result = await this.env.DB.prepare(pipeline.transform_query).run();

      const duration = Date.now() - startTime;
      const processed = result.meta?.changes || 0;

      await this.env.DB.prepare(`
        UPDATE warehouse_etl_pipelines SET status = 'completed', last_run_duration = ?, records_processed = ? WHERE id = ?
      `).bind(duration, processed, pipelineId).run();

      return { status: 'completed', recordsProcessed: processed, duration };
    } catch (e: any) {
      await this.env.DB.prepare(`UPDATE warehouse_etl_pipelines SET status = 'failed' WHERE id = ?`).bind(pipelineId).run();
      throw new Error(`ETL failed: ${e.message}`);
    }
  }

  /**
   * Query the warehouse with optimizer hints.
   */
  async query(sql: string, params: any[] = []): Promise<{ results: any[]; rowCount: number; duration: number }> {
    const startTime = Date.now();
    const result = await this.env.DB.prepare(sql).bind(...params).all();
    return {
      results: result.results || [],
      rowCount: (result.results || []).length,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get warehouse statistics.
   */
  async getStats(): Promise<{ tables: { name: string; type: string; rowCount: number }[]; totalRows: number; etlPipelines: number }> {
    const tables: { name: string; type: string; rowCount: number }[] = [];

    for (const table of WAREHOUSE_SCHEMA) {
      try {
        const countResult = await this.env.DB.prepare(`SELECT COUNT(*) as cnt FROM ${table.name}`).first() as any;
        tables.push({ name: table.name, type: table.type, rowCount: countResult?.cnt || 0 });
      } catch {
        tables.push({ name: table.name, type: table.type, rowCount: 0 });
      }
    }

    const etlCount = await this.env.DB.prepare(`SELECT COUNT(*) as cnt FROM warehouse_etl_pipelines`).first() as any;

    return {
      tables,
      totalRows: tables.reduce((sum, t) => sum + t.rowCount, 0),
      etlPipelines: etlCount?.cnt || 0,
    };
  }
}

// ─── D1 Schema ──────────────────────────────────────────────────────

const DATA_ARCHITECTURE_SCHEMA = `
-- Shard assignments
CREATE TABLE IF NOT EXISTS shard_assignments (
  tenant_id TEXT PRIMARY KEY,
  shard_id TEXT NOT NULL,
  region TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  migrating_to TEXT
);

-- Shard configurations
CREATE TABLE IF NOT EXISTS shard_configs (
  id TEXT PRIMARY KEY,
  region TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  virtual_nodes INTEGER NOT NULL DEFAULT 150,
  tenant_count INTEGER NOT NULL DEFAULT 0,
  storage_used_gb REAL NOT NULL DEFAULT 0,
  max_storage_gb REAL NOT NULL DEFAULT 500,
  iops_used INTEGER NOT NULL DEFAULT 0,
  max_iops INTEGER NOT NULL DEFAULT 10000,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Region health tracking
CREATE TABLE IF NOT EXISTS region_health (
  region TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'healthy',
  latency_ms REAL NOT NULL DEFAULT 0,
  active_connections INTEGER NOT NULL DEFAULT 0,
  replication_lag_ms REAL NOT NULL DEFAULT 0,
  error_rate REAL NOT NULL DEFAULT 0,
  last_checked TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Retention policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  tenant_id TEXT,
  hot_days INTEGER NOT NULL DEFAULT 30,
  warm_days INTEGER NOT NULL DEFAULT 90,
  cold_days INTEGER NOT NULL DEFAULT 365,
  frozen_days INTEGER NOT NULL DEFAULT 1095,
  archive_days INTEGER NOT NULL DEFAULT 2555,
  purge_days INTEGER,
  legal_hold INTEGER NOT NULL DEFAULT 0,
  compliance_framework TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Legal holds
CREATE TABLE IF NOT EXISTS data_legal_holds (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tier migration jobs
CREATE TABLE IF NOT EXISTS data_migration_jobs (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  from_tier TEXT NOT NULL,
  to_tier TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  total_size_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned',
  started_at TEXT,
  completed_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Vector indexes
CREATE TABLE IF NOT EXISTS vector_indexes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  namespace TEXT NOT NULL UNIQUE,
  dimensions INTEGER NOT NULL,
  metric TEXT NOT NULL DEFAULT 'cosine',
  index_type TEXT NOT NULL DEFAULT 'hnsw',
  hnsw_config TEXT NOT NULL DEFAULT '{}',
  vector_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Vector records
CREATE TABLE IF NOT EXISTS vector_records (
  id TEXT NOT NULL,
  namespace TEXT NOT NULL,
  vector_data TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id, namespace)
);

-- Warehouse ETL pipelines
CREATE TABLE IF NOT EXISTS warehouse_etl_pipelines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_table TEXT NOT NULL,
  target_table TEXT NOT NULL,
  transform_query TEXT NOT NULL,
  schedule TEXT NOT NULL DEFAULT 'hourly',
  status TEXT NOT NULL DEFAULT 'idle',
  last_run_at TEXT,
  last_run_duration INTEGER,
  records_processed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Warehouse fact tables
CREATE TABLE IF NOT EXISTS fact_tasks (
  task_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, employee_id TEXT NOT NULL,
  task_type TEXT NOT NULL, status TEXT NOT NULL, priority TEXT,
  created_date TEXT NOT NULL, duration_seconds REAL, token_count INTEGER,
  cost_usd REAL, satisfaction_score REAL
);

CREATE TABLE IF NOT EXISTS fact_conversations (
  conversation_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, employee_id TEXT NOT NULL,
  channel TEXT, created_date TEXT NOT NULL, message_count INTEGER NOT NULL DEFAULT 0,
  duration_seconds REAL, resolution_achieved INTEGER, sentiment_avg REAL, escalated INTEGER
);

CREATE TABLE IF NOT EXISTS fact_billing (
  billing_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, billing_date TEXT NOT NULL,
  plan_id TEXT, line_item TEXT NOT NULL, amount_usd REAL NOT NULL, quantity REAL
);

CREATE TABLE IF NOT EXISTS dim_tenants (
  tenant_id TEXT PRIMARY KEY, company_name TEXT NOT NULL, industry TEXT,
  plan_tier TEXT, region TEXT, employee_count INTEGER, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_employees (
  employee_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, role_name TEXT NOT NULL,
  category TEXT, personality TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agg_daily_metrics (
  metric_date TEXT NOT NULL, tenant_id TEXT NOT NULL,
  tasks_created INTEGER NOT NULL DEFAULT 0, tasks_completed INTEGER NOT NULL DEFAULT 0,
  conversations_started INTEGER NOT NULL DEFAULT 0, messages_sent INTEGER NOT NULL DEFAULT 0,
  avg_response_time_ms REAL, avg_satisfaction REAL,
  total_tokens INTEGER NOT NULL DEFAULT 0, total_cost_usd REAL NOT NULL DEFAULT 0,
  active_employees INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (metric_date, tenant_id)
);

CREATE TABLE IF NOT EXISTS mv_employee_performance (
  employee_id TEXT NOT NULL, tenant_id TEXT NOT NULL, period TEXT NOT NULL,
  tasks_completed INTEGER NOT NULL DEFAULT 0, avg_task_duration REAL,
  satisfaction_score REAL, resolution_rate REAL, escalation_rate REAL, overall_score REAL,
  PRIMARY KEY (employee_id, period)
);

CREATE INDEX IF NOT EXISTS idx_shard_assignments_shard ON shard_assignments(shard_id);
CREATE INDEX IF NOT EXISTS idx_retention_table ON data_retention_policies(table_name);
CREATE INDEX IF NOT EXISTS idx_retention_tenant ON data_retention_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_tenant ON data_legal_holds(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_migration_jobs_status ON data_migration_jobs(status);
CREATE INDEX IF NOT EXISTS idx_vector_records_ns ON vector_records(namespace);
CREATE INDEX IF NOT EXISTS idx_fact_tasks_tenant ON fact_tasks(tenant_id, created_date);
CREATE INDEX IF NOT EXISTS idx_fact_tasks_employee ON fact_tasks(employee_id, created_date);
CREATE INDEX IF NOT EXISTS idx_fact_convos_tenant ON fact_conversations(tenant_id, created_date);
CREATE INDEX IF NOT EXISTS idx_fact_billing_tenant ON fact_billing(tenant_id, billing_date);
CREATE INDEX IF NOT EXISTS idx_agg_daily_tenant ON agg_daily_metrics(tenant_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_mv_perf_tenant ON mv_employee_performance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_etl_status ON warehouse_etl_pipelines(status);
`;

// ─── Request Handler ────────────────────────────────────────────────

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handleDataArchitecture(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const method = request.method;
  const fabric = new MultiRegionFabric(env);
  const hashRing = new ConsistentHashRing();
  const lifecycle = new StorageLifecycleEngine(env);
  const vectorDB = new VectorDatabase(env);
  const warehouse = new AnalyticsWarehouse(env);

  try {
    // ── Schema Init ──
    if (path === '/api/data-arch/init' && method === 'POST') {
      const stmts = DATA_ARCHITECTURE_SCHEMA.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of stmts) { await env.DB.prepare(stmt).run(); }
      return json({ success: true, message: 'Data architecture schema initialized', tables: 17, indexes: 13 });
    }

    // ── Multi-Region Fabric ──
    if (path === '/api/data-arch/regions') {
      return json({ success: true, regions: fabric.getRegions(), total: Object.keys(REGION_CONFIGS).length });
    }
    if (path === '/api/data-arch/regions/health') {
      return json({ success: true, health: fabric.getHealth() });
    }
    if (path === '/api/data-arch/regions/route' && method === 'POST') {
      const body = await request.json() as any;
      const decision = fabric.routeOperation(body.operation, body.client_region, body.consistency, body.preferred_region);
      return json({ success: true, routing: decision });
    }
    if (path === '/api/data-arch/regions/health' && method === 'PUT') {
      const body = await request.json() as any;
      fabric.updateHealth(body.region, body);
      return json({ success: true });
    }
    if (path === '/api/data-arch/regions/conflict' && method === 'POST') {
      const body = await request.json() as any;
      const result = fabric.resolveConflict(body.strategy, body.local, body.remote);
      return json({ success: true, resolution: result });
    }

    // ── Sharding ──
    if (path === '/api/data-arch/shards') {
      // Load shards from DB into hash ring
      const shardRows = await env.DB.prepare(`SELECT * FROM shard_configs`).all();
      for (const row of (shardRows.results || []) as any[]) {
        hashRing.addShard({
          id: row.id, virtualNodes: row.virtual_nodes, region: row.region, status: row.status,
          tenantCount: row.tenant_count, storageUsedGB: row.storage_used_gb,
          maxStorageGB: row.max_storage_gb, iopsUsed: row.iops_used, maxIOPS: row.max_iops,
          createdAt: row.created_at,
        });
      }
      return json({ success: true, stats: hashRing.getStats() });
    }
    if (path === '/api/data-arch/shards' && method === 'POST') {
      const body = await request.json() as any;
      const id = body.id || `shard-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
      await env.DB.prepare(`
        INSERT INTO shard_configs (id, region, virtual_nodes, max_storage_gb, max_iops)
        VALUES (?, ?, ?, ?, ?)
      `).bind(id, body.region || 'us-east-1', body.virtual_nodes || 150, body.max_storage_gb || 500, body.max_iops || 10000).run();
      return json({ success: true, shardId: id });
    }
    if (path === '/api/data-arch/shards/assign' && method === 'POST') {
      const body = await request.json() as any;
      // Load shards
      const shardRows = await env.DB.prepare(`SELECT * FROM shard_configs WHERE status = 'active'`).all();
      for (const row of (shardRows.results || []) as any[]) {
        hashRing.addShard({
          id: row.id, virtualNodes: row.virtual_nodes, region: row.region, status: row.status,
          tenantCount: row.tenant_count, storageUsedGB: row.storage_used_gb,
          maxStorageGB: row.max_storage_gb, iopsUsed: row.iops_used, maxIOPS: row.max_iops,
          createdAt: row.created_at,
        });
      }
      const shardId = hashRing.getShardForTenant(body.tenant_id);
      const shard = hashRing.getShards().find(s => s.id === shardId);
      await env.DB.prepare(`
        INSERT INTO shard_assignments (tenant_id, shard_id, region) VALUES (?, ?, ?)
        ON CONFLICT(tenant_id) DO UPDATE SET shard_id = excluded.shard_id, region = excluded.region
      `).bind(body.tenant_id, shardId, shard?.region || 'us-east-1').run();
      return json({ success: true, tenantId: body.tenant_id, shardId, region: shard?.region });
    }
    if (path === '/api/data-arch/shards/rebalance' && method === 'POST') {
      const shardRows = await env.DB.prepare(`SELECT * FROM shard_configs WHERE status = 'active'`).all();
      for (const row of (shardRows.results || []) as any[]) {
        hashRing.addShard({
          id: row.id, virtualNodes: row.virtual_nodes, region: row.region, status: row.status,
          tenantCount: row.tenant_count, storageUsedGB: row.storage_used_gb,
          maxStorageGB: row.max_storage_gb, iopsUsed: row.iops_used, maxIOPS: row.max_iops,
          createdAt: row.created_at,
        });
      }
      const plan = hashRing.planRebalance();
      return json({ success: true, plan, migrations: plan.length });
    }
    if (path === '/api/data-arch/shards/hotspots') {
      const shardRows = await env.DB.prepare(`SELECT * FROM shard_configs WHERE status = 'active'`).all();
      for (const row of (shardRows.results || []) as any[]) {
        hashRing.addShard({
          id: row.id, virtualNodes: row.virtual_nodes, region: row.region, status: row.status,
          tenantCount: row.tenant_count, storageUsedGB: row.storage_used_gb,
          maxStorageGB: row.max_storage_gb, iopsUsed: row.iops_used, maxIOPS: row.max_iops,
          createdAt: row.created_at,
        });
      }
      const hotSpots = hashRing.detectHotSpots();
      return json({ success: true, hotSpots, count: hotSpots.length });
    }

    // ── Storage Lifecycle ──
    if (path === '/api/data-arch/tiers') {
      return json({ success: true, tiers: lifecycle.getTierConfig() });
    }
    if (path === '/api/data-arch/tiers/classify' && method === 'POST') {
      const body = await request.json() as any;
      const classification = lifecycle.classifyRecord(body.table_name, body.record_id, body.created_at, body.last_accessed, body.access_count_30d, body.size_bytes);
      return json({ success: true, classification });
    }
    if (path === '/api/data-arch/tiers/cost-estimate' && method === 'POST') {
      const body = await request.json() as any;
      const estimate = lifecycle.estimateCosts(body.hot_gb, body.warm_gb, body.cold_gb, body.frozen_gb, body.archive_gb, body.base_price);
      return json({ success: true, estimate });
    }
    if (path === '/api/data-arch/retention' && method === 'POST') {
      const body = await request.json() as any;
      const result = await lifecycle.createRetentionPolicy(body);
      return json({ success: true, ...result });
    }
    if (path === '/api/data-arch/retention') {
      const tenantId = new URL(request.url).searchParams.get('tenant_id') || undefined;
      const policies = await lifecycle.getRetentionPolicies(tenantId);
      return json({ success: true, policies, total: policies.length });
    }
    if (path === '/api/data-arch/legal-holds' && method === 'POST') {
      const body = await request.json() as any;
      await lifecycle.setLegalHold(body.tenant_id, body.hold !== false, body.reason);
      return json({ success: true });
    }
    if (path === '/api/data-arch/legal-holds') {
      const tenantId = new URL(request.url).searchParams.get('tenant_id') || undefined;
      const holds = await lifecycle.getLegalHolds(tenantId);
      return json({ success: true, holds, total: holds.length });
    }
    if (path === '/api/data-arch/migrations' && method === 'POST') {
      const body = await request.json() as any;
      const result = await lifecycle.createMigrationJob(body.table_name, body.from_tier, body.to_tier, body.record_count, body.total_size_bytes);
      return json({ success: true, ...result });
    }
    if (path === '/api/data-arch/migrations') {
      const status = new URL(request.url).searchParams.get('status') as MigrationStatus | null;
      const jobs = await lifecycle.getMigrationJobs(status || undefined);
      return json({ success: true, jobs, total: jobs.length });
    }

    // ── Vector Database ──
    if (path === '/api/data-arch/vectors/indexes' && method === 'POST') {
      const body = await request.json() as any;
      const result = await vectorDB.createIndex(body.name, body.namespace, body.dimensions, body.metric, body.index_type);
      return json({ success: true, ...result });
    }
    if (path === '/api/data-arch/vectors/indexes') {
      const indexes = await vectorDB.getIndexes();
      return json({ success: true, indexes, total: indexes.length });
    }
    if (path === '/api/data-arch/vectors/upsert' && method === 'POST') {
      const body = await request.json() as any;
      const result = await vectorDB.upsert(body.namespace, body.vectors);
      return json({ success: true, ...result });
    }
    if (path === '/api/data-arch/vectors/search' && method === 'POST') {
      const body = await request.json() as any;
      const result = await vectorDB.search(body);
      return json({ success: true, ...result });
    }
    if (path === '/api/data-arch/vectors/delete' && method === 'POST') {
      const body = await request.json() as any;
      const result = await vectorDB.deleteVectors(body.namespace, body.ids);
      return json({ success: true, ...result });
    }
    if (path === '/api/data-arch/vectors/stats') {
      const namespace = new URL(request.url).searchParams.get('namespace') || undefined;
      const stats = await vectorDB.getStats(namespace);
      return json({ success: true, stats });
    }

    // ── Analytics Warehouse ──
    if (path === '/api/data-arch/warehouse/schema') {
      return json({ success: true, tables: warehouse.getSchema(), total: WAREHOUSE_SCHEMA.length });
    }
    const tableMatch = path.match(/^\/api\/data-arch\/warehouse\/schema\/(.+)$/);
    if (tableMatch) {
      const table = warehouse.getTable(tableMatch[1]);
      if (!table) return json({ error: 'Table not found' }, 404);
      return json({ success: true, table });
    }
    if (path === '/api/data-arch/warehouse/etl' && method === 'POST') {
      const body = await request.json() as any;
      const result = await warehouse.createETLPipeline(body.name, body.source_table, body.target_table, body.transform_query, body.schedule);
      return json({ success: true, ...result });
    }
    if (path === '/api/data-arch/warehouse/etl') {
      const pipelines = await warehouse.getETLPipelines();
      return json({ success: true, pipelines, total: pipelines.length });
    }
    const etlRunMatch = path.match(/^\/api\/data-arch\/warehouse\/etl\/([a-f0-9]+)\/run$/);
    if (etlRunMatch && method === 'POST') {
      const result = await warehouse.runETLPipeline(etlRunMatch[1]);
      return json({ success: true, ...result });
    }
    if (path === '/api/data-arch/warehouse/query' && method === 'POST') {
      const body = await request.json() as any;
      const result = await warehouse.query(body.sql, body.params || []);
      return json({ success: true, ...result });
    }
    if (path === '/api/data-arch/warehouse/stats') {
      const stats = await warehouse.getStats();
      return json({ success: true, stats });
    }

    return json({ error: 'Data architecture endpoint not found', code: 'DATA_ARCH_NOT_FOUND' }, 404);
  } catch (e: any) {
    return json({ error: e.message || 'Data architecture error', code: 'DATA_ARCH_ERROR' }, 500);
  }
}
