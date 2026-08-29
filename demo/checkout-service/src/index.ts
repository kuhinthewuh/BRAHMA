import Fastify from 'fastify';
import { matchItems, setIncidentMode, incidentMode } from './requestMatcher.js';

const fastify = Fastify({ logger: false });

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', incidentMode };
});

fastify.post('/checkout', async (request, reply) => {
  const start = process.hrtime.bigint();
  
  // Dummy work
  const items = matchItems(['item-150', 'item-4999', 'item-8000', 'item-1234', 'item-19000']);
  
  const end = process.hrtime.bigint();
  const latencyMs = Number(end - start) / 1_000_000;
  
  return { 
    success: true, 
    itemsMatched: items.length,
    latencyMs 
  };
});

fastify.post('/incident', async (request, reply) => {
  setIncidentMode(true);
  return { status: 'incident_injected', incidentMode: true };
});

fastify.post('/reset', async (request, reply) => {
  setIncidentMode(false);
  return { status: 'reset_successful', incidentMode: false };
});

const start = async () => {
  try {
    const port = Number(process.env.CHECKOUT_PORT) || 8080;
    await fastify.listen({ port });
    console.log(`Checkout demo service listening on port ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
start();
