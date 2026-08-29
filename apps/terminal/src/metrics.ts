import { BrahmaEvent } from 'shared';

export function deriveMissionMetrics(events: BrahmaEvent[]) {
  const failures = events.filter(e => e.type === 'worker.failed').length;
  const recoveries = events.filter(e => e.type === 'worker.recovered').length;
  
  return {
    failures,
    recoveries,
    stateLost: 0,
    totalWorkersCreated: failures + 1,
    branchesPruned: failures
  };
}
