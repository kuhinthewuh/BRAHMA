import Database from 'better-sqlite3';
import { join } from 'path';

export const db = new Database(process.env.BRAHMA_DB_PATH || join(process.cwd(), 'brahma.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    objective TEXT,
    status TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    contextData TEXT
  );

  CREATE TABLE IF NOT EXISTS workers (
    workerId TEXT PRIMARY KEY,
    missionId TEXT,
    role TEXT,
    status TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    parentWorkerId TEXT,
    progress INTEGER,
    confirmedEvidence TEXT,
    currentHypothesis TEXT,
    nextAction TEXT,
    checkpointId TEXT,
    failureCount INTEGER,
    FOREIGN KEY(missionId) REFERENCES missions(id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    missionId TEXT,
    timestamp TEXT,
    type TEXT,
    sourceKind TEXT,
    sourceId TEXT,
    severity TEXT,
    title TEXT,
    message TEXT,
    data TEXT
  );
  
  CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    workerId TEXT,
    missionId TEXT,
    timestamp TEXT,
    data TEXT
  );
  
  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    missionId TEXT,
    status TEXT,
    requestedAt TEXT,
    resolvedAt TEXT,
    resolvedBy TEXT
  );
`);
