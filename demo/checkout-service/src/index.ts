import Fastify from 'fastify';
import { matchItems } from './requestMatcher.js';

const fastify = Fastify({ logger: false });

let highLoad = false;

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', highLoad };
});

fastify.post('/checkout', async (request, reply) => {
  const start = process.hrtime.bigint();
  
  // Dummy work: low load is 5 items, high load is 5000 items
  const count = highLoad ? 5000 : 5;
  const dummyIds = Array.from({ length: count }, (_, i) => `item-${Math.floor(Math.random() * 20000)}`);
  
  const items = matchItems(dummyIds);
  
  const end = process.hrtime.bigint();
  const latencyMs = Number(end - start) / 1_000_000;
  
  return { 
    success: true, 
    itemsMatched: items.length,
    latencyMs 
  };
});

fastify.post('/incident', async (request, reply) => {
  highLoad = true;
  return { status: 'incident_injected', highLoad: true };
});

fastify.post('/reset', async (request, reply) => {
  highLoad = false;
  return { status: 'reset_successful', highLoad: false };
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
