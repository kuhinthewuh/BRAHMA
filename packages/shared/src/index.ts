import { z } from 'zod';

// Mission State Machine
export const MissionStatusSchema = z.enum([
  'CREATED',
  'DETECTING',
  'INVESTIGATING',
  'ROOT_CAUSE_CONFIRMED',
  'REMEDIATING',
  'VERIFYING',
  'AWAITING_APPROVAL',
  'DEPLOYING',
  'COMPLETED',
  'FAILED',
  'REJECTED',
]);
export type MissionStatus = z.infer<typeof MissionStatusSchema>;

export const WorkerStatusSchema = z.enum([
  'CREATED',
  'WORKING',
  'WAITING',
  'COMPLETED',
  'FAILED',
  'RECOVERING',
  'REPLACED',
  'RETIRED',
]);
export type WorkerStatus = z.infer<typeof WorkerStatusSchema>;

// Entities
export const HypothesisSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  confidence: z.number(),
  expectedInformationGain: z.number(),
  estimatedCost: z.number(),
  priority: z.number(),
  status: z.enum(['PENDING', 'ACTIVE', 'PRUNED', 'CONFIRMED', 'REJECTED']),
});
export type Hypothesis = z.infer<typeof HypothesisSchema>;

export const WorkerSchema = z.object({
  workerId: z.string(),
  missionId: z.string(),
  role: z.string(),
  mission: z.string(),
  status: WorkerStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  parentWorkerId: z.string().optional(),
  strategy: z.string().optional(),
  toolAccess: z.array(z.string()),
  progress: z.number().default(0),
  confirmedEvidence: z.array(z.string()),
  currentHypothesis: z.string().optional(),
  nextAction: z.string().optional(),
  checkpointId: z.string().optional(),
  failureCount: z.number().default(0),
  toolCalls: z.number().default(0),
  durationMs: z.number().default(0),
});
export type Worker = z.infer<typeof WorkerSchema>;

// Events
export const BrahmaEventTypeSchema = z.enum([
  'mission.created', 'mission.started', 'mission.state_changed',
  'telemetry.snapshot',
  'mcp.tool_started', 'mcp.tool_completed', 'mcp.tool_failed',
  'hypothesis.created', 'hypothesis.ranked', 'hypothesis.pruned',
  'worker.spawned', 'worker.state_changed', 'worker.checkpointed',
  'worker.failed', 'worker.recovery_started', 'worker.recovered',
  'worker.replaced', 'worker.retired',
  'evidence.added', 'root_cause.confirmed',
  'remediation.started', 'remediation.candidate_created',
  'sandbox.started', 'sandbox.test_result', 'sandbox.benchmark_result',
  'sandbox.completed', 'sandbox.failed',
  'approval.requested', 'approval.approved', 'approval.rejected',
  'deployment.started', 'deployment.completed', 'deployment.failed',
  'production.verified',
  'metrics.updated', 'mission.completed', 'mission.failed',
  'chaos.injected'
]);
export type BrahmaEventType = z.infer<typeof BrahmaEventTypeSchema>;

export const BrahmaEventSchema = z.object({
  id: z.string(),
  missionId: z.string(),
  timestamp: z.string(),
  type: BrahmaEventTypeSchema,
  source: z.object({
    kind: z.enum(['mother', 'worker', 'mcp', 'sandbox', 'system', 'human']),
    id: z.string().optional(),
  }),
  severity: z.enum(['debug', 'info', 'success', 'warning', 'error']),
  title: z.string(),
  message: z.string().optional(),
  data: z.any().optional(),
});
export type BrahmaEvent = z.infer<typeof BrahmaEventSchema>;

export const SandboxResultSchema = z.object({
  testsPassed: z.number(),
  testsTotal: z.number(),
  integrationPassed: z.boolean(),
  baselineLatencyMs: z.number(),
  candidateLatencyMs: z.number(),
  speedup: z.number(),
  correctnessPassed: z.boolean(),
  benchmarkRuns: z.number(),
  medianLatencyMs: z.number(),
  artifactRefs: z.array(z.string()),
});
export type SandboxResult = z.infer<typeof SandboxResultSchema>;
