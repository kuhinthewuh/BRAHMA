import Fastify from 'fastify';
import cors from '@fastify/cors';
import { orchestrator, db, eventBus } from 'orchestrator';

const fastify = Fastify({ logger: false });
fastify.register(cors);

fastify.get('/health', async () => {
  return { status: 'ok', service: 'brahma-api' };
});

fastify.post('/api/missions', async (request, reply) => {
  const { objective } = request.body as { objective: string };
  const id = await orchestrator.startMission(objective);
  return { id, status: 'STARTED' };
});

fastify.get('/api/missions', async () => {
  return db.prepare('SELECT * FROM missions ORDER BY createdAt DESC').all();
});

fastify.get('/api/missions/:id', async (request: any) => {
  const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(request.params.id);
  if (!mission) throw new Error('Mission not found');
  return mission;
});

fastify.get('/api/missions/:id/workers', async (request: any) => {
  return db.prepare('SELECT * FROM workers WHERE missionId = ?').all(request.params.id);
});

fastify.get('/api/missions/:id/events', async (request: any) => {
  return db.prepare('SELECT * FROM events WHERE missionId = ? ORDER BY timestamp ASC').all(request.params.id);
});

fastify.get('/api/missions/:id/metrics', async (request: any) => {
  return { status: 'MOCK_METRICS' };
});

fastify.get('/api/missions/:id/artifacts', async (request: any) => {
  return [];
});

fastify.post('/api/missions/:id/approve', async (request: any) => {
  await orchestrator.approveMission(request.params.id, 'web');
  return { success: true };
});

fastify.post('/api/missions/:id/reject', async (request: any) => {
  await orchestrator.rejectMission(request.params.id, 'web');
  return { success: true };
});

fastify.post('/api/missions/:id/inject-failure', async (request: any) => {
  await orchestrator.injectChaos(request.params.id);
  return { success: true };
});

fastify.get('/api/internal/verify-approval', async (request: any) => {
  const mission = db.prepare('SELECT status FROM missions WHERE id = ?').get(request.query.missionId) as any;
  return { approved: mission?.status === 'DEPLOYING' || mission?.status === 'COMPLETED' };
});

fastify.post('/api/demo/incident', async () => {
  try {
    const res = await fetch('http://localhost:8080/incident', { method: 'POST' });
    return await res.json();
  } catch (e) {
    return { error: 'Failed to contact demo service' };
  }
});

fastify.post('/api/demo/reset', async () => {
  try {
    const res = await fetch('http://localhost:8080/reset', { method: 'POST' });
    return await res.json();
  } catch (e) {
    return { error: 'Failed to contact demo service' };
  }
});

fastify.get('/api/missions/:id/stream', (request: any, reply: any) => {
  const missionId = request.params.id;
  
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  
  // Send past events
  const pastEvents = db.prepare('SELECT * FROM events WHERE missionId = ? ORDER BY timestamp ASC').all(missionId);
  for (const event of pastEvents) {
    const e = event as any;
    // ensure source is object since SQLite returns it as strings in our schema
    const evPayload = { ...e, source: { kind: e.sourceKind, id: e.sourceId } };
    reply.raw.write(`data: ${JSON.stringify(evPayload)}\n\n`);
  }

  const listener = (event: any) => {
    if (event.missionId === missionId) {
      db.prepare('INSERT OR IGNORE INTO events (id, missionId, timestamp, type, sourceKind, sourceId, severity, title, message, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(event.id, event.missionId, event.timestamp, event.type, event.source.kind, event.source.id, event.severity, event.title, event.message, event.data ? JSON.stringify(event.data) : null);
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  };

  eventBus.onEvent(listener);

  request.raw.on('close', () => {
    eventBus.removeListener('brahma_event', listener);
  });
});

const start = async () => {
  try {
    const port = Number(process.env.BRAHMA_PORT) || 8787;
    await fastify.listen({ port });
    console.log(`BRAHMA API listening on port ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
start();
