// server/db/supabaseClient.js
// Supabase client provider supporting production (Supabase JS) and local/testing mock adapter

const { createClient } = require('@supabase/supabase-js');

// In-memory data store for testing or offline environments
class InMemoryStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.game_sessions = new Map();
    this.teams = new Map();
    this.team_progress = new Map();
    this.score_events = new Map();
    this.recovery_snapshots = new Map();
    this.admin_audit_logs = new Map();
    this.game_evidence = new Map();
    this.game_logs = new Map();
    this.game_chat = new Map();
    this.security_alerts = new Map();
  }

  getTable(name) {
    if (!this[name]) {
      this[name] = new Map();
    }
    return this[name];
  }
}

const memoryStore = new InMemoryStore();

// Chainable mock query builder mimicking Supabase PostgREST query builder
class MockQueryBuilder {
  constructor(tableName, store) {
    this.tableName = tableName;
    this.store = store;
    this.table = store.getTable(tableName);
    this.filters = [];
    this.selectedFields = null;
    this.orderConfig = null;
    this.limitCount = null;
    this.singleMode = false;
    this.operation = 'select'; // 'select' | 'insert' | 'update' | 'delete' | 'upsert'
    this.payload = null;
  }

  select(fields = '*') {
    this.selectedFields = fields;
    if (this.operation === 'select') {
      this.operation = 'select';
    }
    return this;
  }

  eq(column, value) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column, value) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  in(column, values) {
    this.filters.push({ type: 'in', column, values });
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orderConfig = { column, ascending };
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.singleMode = true;
    return this;
  }

  insert(recordOrRecords) {
    this.operation = 'insert';
    this.payload = recordOrRecords;
    return this;
  }

  update(updates) {
    this.operation = 'update';
    this.payload = updates;
    return this;
  }

  upsert(recordOrRecords) {
    this.operation = 'upsert';
    this.payload = recordOrRecords;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  async _execute() {
    if (this.operation === 'insert') {
      return this._executeInsert();
    }
    if (this.operation === 'update') {
      return this._executeUpdate();
    }
    if (this.operation === 'upsert') {
      return this._executeUpsert();
    }
    if (this.operation === 'delete') {
      return this._executeDelete();
    }
    return this._executeSelect();
  }

  _executeSelect() {
    let records = Array.from(this.table.values());

    for (const filter of this.filters) {
      if (filter.type === 'eq') {
        records = records.filter(r => r[filter.column] === filter.value);
      } else if (filter.type === 'neq') {
        records = records.filter(r => r[filter.column] !== filter.value);
      } else if (filter.type === 'in') {
        records = records.filter(r => filter.values.includes(r[filter.column]));
      }
    }

    if (this.orderConfig) {
      const { column, ascending } = this.orderConfig;
      records.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (valA === valB) {
          if (a.revision !== undefined && b.revision !== undefined) {
            return b.revision - a.revision;
          }
          return 0;
        }
        if (valA === null || valA === undefined) return ascending ? -1 : 1;
        if (valB === null || valB === undefined) return ascending ? 1 : -1;
        if (valA < valB) return ascending ? -1 : 1;
        return ascending ? 1 : -1;
      });
    }

    if (this.limitCount) {
      records = records.slice(0, this.limitCount);
    }

    if (this.singleMode) {
      if (records.length === 0) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
      }
      return { data: { ...records[0] }, error: null };
    }

    return { data: records.map(r => ({ ...r })), error: null };
  }

  _executeInsert() {
    const items = Array.isArray(this.payload) ? this.payload : [this.payload];
    const inserted = [];

    for (const item of items) {
      const cloned = { ...item };
      if (!cloned.id) {
        cloned.id = 'ID_' + Math.random().toString(36).substring(2, 10);
      }
      if (!cloned.created_at) {
        cloned.created_at = new Date().toISOString();
      }

      if (this.tableName === 'teams') {
        const key = `${cloned.session_id}_${cloned.id}`;
        this.table.set(key, cloned);
      } else if (this.tableName === 'score_events') {
        if (cloned.idempotency_key) {
          for (const existing of this.table.values()) {
            if (existing.idempotency_key === cloned.idempotency_key) {
              return { data: null, error: { message: 'Duplicate idempotency key', code: '23505' } };
            }
          }
        }
        this.table.set(cloned.id, cloned);
      } else if (this.tableName === 'team_progress') {
        const key = `${cloned.session_id}_${cloned.team_id}_${cloned.level_id}`;
        this.table.set(key, cloned);
      } else {
        this.table.set(cloned.id, cloned);
      }
      inserted.push(cloned);
    }

    if (this.singleMode) {
      return { data: inserted[0], error: null };
    }
    return { data: inserted, error: null };
  }

  _executeUpdate() {
    let records = Array.from(this.table.entries());

    for (const filter of this.filters) {
      if (filter.type === 'eq') {
        records = records.filter(([k, r]) => r[filter.column] === filter.value);
      } else if (filter.type === 'neq') {
        records = records.filter(([k, r]) => r[filter.column] !== filter.value);
      } else if (filter.type === 'in') {
        records = records.filter(([k, r]) => filter.values.includes(r[filter.column]));
      }
    }

    const updated = [];
    for (const [key, record] of records) {
      const newRecord = { ...record, ...this.payload, updated_at: new Date().toISOString() };
      this.table.set(key, newRecord);
      updated.push(newRecord);
    }

    if (this.singleMode) {
      return { data: updated[0] || null, error: null };
    }
    return { data: updated, error: null };
  }

  _executeUpsert() {
    const items = Array.isArray(this.payload) ? this.payload : [this.payload];
    const results = [];

    for (const item of items) {
      let key = item.id;
      if (this.tableName === 'teams') {
        key = `${item.session_id}_${item.id}`;
      } else if (this.tableName === 'team_progress') {
        key = `${item.session_id}_${item.team_id}_${item.level_id}`;
      }
      const existing = this.table.get(key) || {};
      const merged = { ...existing, ...item, updated_at: new Date().toISOString() };
      this.table.set(key, merged);
      results.push(merged);
    }

    return { data: Array.isArray(this.payload) ? results : results[0], error: null };
  }

  _executeDelete() {
    let records = Array.from(this.table.entries());

    for (const filter of this.filters) {
      if (filter.type === 'eq') {
        records = records.filter(([k, r]) => r[filter.column] === filter.value);
      }
    }

    for (const [key] of records) {
      this.table.delete(key);
    }

    return { data: records.map(([k, r]) => r), error: null };
  }

  then(resolve, reject) {
    return Promise.resolve(this._execute()).then(resolve, reject);
  }
}

class MockSupabaseClient {
  constructor(store) {
    this.store = store;
  }

  from(tableName) {
    return new MockQueryBuilder(tableName, this.store);
  }

  channel(name) {
    return {
      on: () => this,
      subscribe: () => ({ unsubscribe: () => {} }),
      send: () => Promise.resolve()
    };
  }

  get channels() {
    return [];
  }

  async rpc(fnName, args = {}) {
    if (fnName === 'recalculate_team_score') {
      const { p_session_id, p_team_id } = args;
      const events = Array.from(this.store.getTable('score_events').values())
        .filter(e => e.session_id === p_session_id && e.team_id === p_team_id);
      const total = events.reduce((sum, e) => sum + (e.score_delta || 0), 0);
      const teamKey = `${p_session_id}_${p_team_id}`;
      const team = this.store.getTable('teams').get(teamKey);
      if (team) {
        team.score = total;
        team.updated_at = new Date().toISOString();
      }
      return { data: total, error: null };
    }
    return { data: null, error: null };
  }
}

// Client Factory
let serviceClientInstance = null;
let anonClientInstance = null;

function isUsingMockDatabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const forceMock = process.env.CYBER_MAFIA_USE_MOCK_DB === 'true';

  if (forceMock) return true;
  if (!url || !key) return true;
  return false;
}

function getDatabaseConfigStatus() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  const isMock = isUsingMockDatabase();

  return {
    isMock,
    provider: isMock ? 'in-memory-mock' : 'Supabase PostgreSQL',
    hasSupabaseUrl: !!url,
    hasServiceRoleKey: !!serviceKey,
    hasAnonKey: !!anonKey,
    hasAdminSecretKey: !!adminSecret,
    mockExplicitlyForced: process.env.CYBER_MAFIA_USE_MOCK_DB === 'true'
  };
}

function getServiceClient(options = {}) {
  const { forceNew = false, forceMock = false } = options;
  if (!forceNew && serviceClientInstance) return serviceClientInstance;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const explicitlyMock = forceMock || process.env.CYBER_MAFIA_USE_MOCK_DB === 'true';
  const explicitlyLive = process.env.CYBER_MAFIA_USE_MOCK_DB === 'false';

  if (url && key && !explicitlyMock) {
    serviceClientInstance = createClient(url, key, {
      auth: { persistSession: false }
    });
    return serviceClientInstance;
  }

  // If in production or explicitly requested live, NEVER fall back to mock
  if (isProduction || explicitlyLive) {
    const missing = [];
    if (!url) missing.push('SUPABASE_URL');
    if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(
      `Supabase connection error: Missing required environment variable(s): ${missing.join(', ')}. ` +
      `Production and live deployments require an active Supabase project.`
    );
  }

  // In development/test mode without credentials, use mock with clear console notification
  serviceClientInstance = new MockSupabaseClient(memoryStore);
  return serviceClientInstance;
}

function getAnonClient(options = {}) {
  const { forceNew = false, forceMock = false } = options;
  if (!forceNew && anonClientInstance) return anonClientInstance;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const explicitlyMock = forceMock || process.env.CYBER_MAFIA_USE_MOCK_DB === 'true';
  const explicitlyLive = process.env.CYBER_MAFIA_USE_MOCK_DB === 'false';

  if (url && key && !explicitlyMock) {
    anonClientInstance = createClient(url, key);
    return anonClientInstance;
  }

  if (isProduction || explicitlyLive) {
    const missing = [];
    if (!url) missing.push('SUPABASE_URL / VITE_SUPABASE_URL');
    if (!key) missing.push('SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY');
    throw new Error(
      `Supabase public client error: Missing required environment variable(s): ${missing.join(', ')}. ` +
      `Production and live deployments require an active Supabase project.`
    );
  }

  anonClientInstance = new MockSupabaseClient(memoryStore);
  return anonClientInstance;
}

function resetClientInstances() {
  serviceClientInstance = null;
  anonClientInstance = null;
}

function resetMemoryStore() {
  memoryStore.reset();
}

module.exports = {
  getServiceClient,
  getAnonClient,
  resetMemoryStore,
  resetClientInstances,
  isUsingMockDatabase,
  getDatabaseConfigStatus,
  memoryStore
};
