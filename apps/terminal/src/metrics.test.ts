import test from 'node:test';
import assert from 'node:assert';
import { deriveMissionMetrics } from './metrics';
import { BrahmaEvent } from 'shared';

test('derives 0 chaos metrics for clean mission', () => {
  const events: BrahmaEvent[] = [
    { type: 'worker.spawned', timestamp: '2026-08-29T00:00:00Z', source: { kind: 'orchestrator' }, severity: 'info', title: 'spawned' }
  ];
  
  const metrics = deriveMissionMetrics(events);
  
  assert.strictEqual(metrics.failures, 0);
  assert.strictEqual(metrics.recoveries, 0);
  assert.strictEqual(metrics.stateLost, 0);
  assert.strictEqual(metrics.totalWorkersCreated, 1);
  assert.strictEqual(metrics.branchesPruned, 0);
});

test('derives accurate chaos metrics for injected failure', () => {
  const events: BrahmaEvent[] = [
    { type: 'worker.spawned', timestamp: '2026-08-29T00:00:00Z', source: { kind: 'orchestrator' }, severity: 'info', title: 'spawned' },
    { type: 'worker.failed', timestamp: '2026-08-29T00:00:01Z', source: { kind: 'worker' }, severity: 'error', title: 'failed' },
    { type: 'worker.recovered', timestamp: '2026-08-29T00:00:02Z', source: { kind: 'orchestrator' }, severity: 'info', title: 'recovered' }
  ];
  
  const metrics = deriveMissionMetrics(events);
  
  assert.strictEqual(metrics.failures, 1);
  assert.strictEqual(metrics.recoveries, 1);
  assert.strictEqual(metrics.stateLost, 0);
  assert.strictEqual(metrics.totalWorkersCreated, 2);
  assert.strictEqual(metrics.branchesPruned, 1);
});
