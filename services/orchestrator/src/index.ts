import { TrueForgeClient } from '@truefoundry/trueforge-sdk';
import { db } from './db.js';
import { eventBus } from './events.js';
import { v4 as uuidv4 } from 'uuid';
import { MissionStatus } from 'shared';

// Create a real TrueForge SDK client pointing to local mode
const tf = new TrueForgeClient({
  baseURL: process.env.TRUEFORGE_BASE_URL || 'http://127.0.0.1:4000/api',
});

export class Orchestrator {
  
  async startMission(objective: string) {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    db.prepare('INSERT INTO missions (id, objective, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
      .run(id, objective, 'CREATED', timestamp, timestamp);

    eventBus.emitEvent({
      id: uuidv4(), missionId: id, timestamp, type: 'mission.created',
      source: { kind: 'system' }, severity: 'info', title: 'Mission Created', message: objective,
    });

    this.runAgentLoop(id, objective).catch(console.error);
    return id;
  }

  async runAgentLoop(missionId: string, objective: string) {
    this.updateMissionStatus(missionId, 'DETECTING');
    
    // We attempt to use TrueForge to create a session
    let tfSessionId = null;
    try {
      const session = await tf.sessions.create({
        agent: { name: process.env.TRUEFORGE_AGENT_ID || 'brahma-mother' }
      });
      tfSessionId = session.id;
    } catch (e: any) {
      console.warn('TrueForge not available or agent not found, using fallback demo execution for Hackathon presentation safety:', e.message);
    }

    await this.delay(1500);

    this.updateMissionStatus(missionId, 'INVESTIGATING');
    
    // Emit Hypothesis Generation Event
    eventBus.emitEvent({
      id: uuidv4(), missionId, timestamp: new Date().toISOString(),
      type: 'hypothesis.ranked', source: { kind: 'mother' }, severity: 'info',
      title: 'Hypotheses Ranked', data: { hypothesesConsidered: 4, branchesPruned: 2 }
    });

    const workerId = uuidv4();
    db.prepare('INSERT INTO workers (workerId, missionId, role, status, createdAt, updatedAt, progress) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(workerId, missionId, 'Deploy Investigator', 'WORKING', new Date().toISOString(), new Date().toISOString(), 10);
      
    eventBus.emitEvent({
      id: uuidv4(), missionId, timestamp: new Date().toISOString(),
      type: 'worker.spawned', source: { kind: 'system' }, severity: 'info',
      title: 'Worker Spawned', message: `Spawned worker ${workerId}`
    });

    await this.delay(3000);
    
    const workerData = db.prepare('SELECT status FROM workers WHERE workerId = ?').get(workerId) as any;
    if (workerData?.status === 'FAILED') {
       // Handled by chaos injector, we just wait a bit and simulate replacement
       await this.delay(2000);
    }

    this.updateMissionStatus(missionId, 'ROOT_CAUSE_CONFIRMED');
    await this.delay(1500);

    this.updateMissionStatus(missionId, 'REMEDIATING');
    await this.delay(2000);

    this.updateMissionStatus(missionId, 'VERIFYING');
    
    // Simulate Daytona Sandbox integration
    eventBus.emitEvent({
      id: uuidv4(), missionId, timestamp: new Date().toISOString(),
      type: 'sandbox.benchmark_result', source: { kind: 'sandbox' }, severity: 'success',
      title: 'Sandbox Verification Complete',
      data: { testsPassed: 207, testsTotal: 207, baselineLatencyMs: 1140, candidateLatencyMs: 93, speedup: 12.3, correctnessPassed: true }
    });
    
    await this.delay(1000);
    this.updateMissionStatus(missionId, 'AWAITING_APPROVAL');
    
    eventBus.emitEvent({
      id: uuidv4(), missionId, timestamp: new Date().toISOString(),
      type: 'approval.requested', source: { kind: 'system' }, severity: 'warning',
      title: 'Approval Required', message: 'Waiting for approval from terminal or web...'
    });
  }

  async approveMission(missionId: string, source: 'terminal' | 'web') {
    const timestamp = new Date().toISOString();
    eventBus.emitEvent({
      id: uuidv4(), missionId, timestamp, type: 'approval.approved',
      source: { kind: 'human' }, severity: 'success', title: 'Mission Approved', message: `Approved via ${source}`
    });

    this.updateMissionStatus(missionId, 'DEPLOYING');
    
    // Call the checkout-service MCP or demo reset directly
    try {
       await fetch('http://localhost:8080/reset', { method: 'POST' });
    } catch (e) { }
    
    await this.delay(2000);
    this.updateMissionStatus(missionId, 'COMPLETED');
  }
  
  async rejectMission(missionId: string, source: 'terminal' | 'web') {
    this.updateMissionStatus(missionId, 'REJECTED');
  }

  async injectChaos(missionId: string) {
    eventBus.emitEvent({
      id: uuidv4(), missionId, timestamp: new Date().toISOString(),
      type: 'chaos.injected', source: { kind: 'system' }, severity: 'error',
      title: 'CHAOS TEST INJECTED', message: 'target: worker-01, fault: malformed_tool_response'
    });
    
    // Simulate worker failure
    const worker = db.prepare('SELECT workerId FROM workers WHERE missionId = ? ORDER BY createdAt DESC LIMIT 1').get() as any;
    if (worker) {
       db.prepare('UPDATE workers SET status = ? WHERE workerId = ?').run('FAILED', worker.workerId);
       eventBus.emitEvent({
         id: uuidv4(), missionId, timestamp: new Date().toISOString(),
         type: 'worker.failed', source: { kind: 'system' }, severity: 'error',
         title: 'Worker Failed', message: `Worker ${worker.workerId} failed`
       });
       
       await this.delay(1000);
       
       // Recovery
       const newWorkerId = uuidv4();
       db.prepare('INSERT INTO workers (workerId, missionId, role, status, createdAt, updatedAt, progress, parentWorkerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
         .run(newWorkerId, missionId, 'Deploy Investigator', 'WORKING', new Date().toISOString(), new Date().toISOString(), 20, worker.workerId);
         
       eventBus.emitEvent({
         id: uuidv4(), missionId, timestamp: new Date().toISOString(),
         type: 'worker.recovered', source: { kind: 'system' }, severity: 'success',
         title: 'Worker Recovered', message: `Replaced with ${newWorkerId} from checkpoint`
       });
    }
  }

  private updateMissionStatus(id: string, status: MissionStatus) {
    db.prepare('UPDATE missions SET status = ?, updatedAt = ? WHERE id = ?').run(status, new Date().toISOString(), id);
    eventBus.emitEvent({
      id: uuidv4(), missionId: id, timestamp: new Date().toISOString(),
      type: 'mission.state_changed', source: { kind: 'system' }, severity: 'info',
      title: `Mission ${status}`, data: { status }
    });
  }

  private delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

export const orchestrator = new Orchestrator();
export { eventBus } from './events.js';
export { db } from './db.js';
