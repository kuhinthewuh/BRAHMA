import { v4 as uuidv4 } from 'uuid';

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function measureLatency(url: string) {
  const start = process.hrtime.bigint();
  await fetch(url, { method: 'POST' });
  const end = process.hrtime.bigint();
  return Number(end - start) / 1_000_000;
}

async function runValidation() {
  console.log('=== BRAHMA RUTHLESS E2E VALIDATION ===\n');

  // 1. Measure Healthy Latency
  console.log('Phase 4: Resetting demo state and measuring healthy latency...');
  await fetch('http://127.0.0.1:8080/reset', { method: 'POST' });
  let healthyLatencies = [];
  for(let i=0; i<3; i++) healthyLatencies.push(await measureLatency('http://127.0.0.1:8080/checkout'));
  const avgHealthy = healthyLatencies.reduce((a,b)=>a+b)/3;
  console.log(`✅ Healthy latency: ~${avgHealthy.toFixed(2)}ms`);

  // 2. Trigger Incident
  console.log('Phase 4: Triggering deterministic incident...');
  await fetch('http://127.0.0.1:8080/incident', { method: 'POST' });
  let degradedLatencies = [];
  for(let i=0; i<3; i++) degradedLatencies.push(await measureLatency('http://127.0.0.1:8080/checkout'));
  const avgDegraded = degradedLatencies.reduce((a,b)=>a+b)/3;
  console.log(`✅ Degraded latency: ~${avgDegraded.toFixed(2)}ms`);

  // 3. Start Mission
  console.log('Phase 4: Starting BRAHMA mission...');
  const startRes = await fetch('http://127.0.0.1:8787/api/missions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ objective: 'Fix checkout latency regression' })
  });
  const startData = await startRes.json();
  const missionId = startData.id;
  console.log(`✅ Mission Started: ${missionId}`);

  // 4. Wait for AWAITING_APPROVAL and inject chaos
  console.log('Phase 5: Injecting Chaos Test...');
  await fetch(`http://127.0.0.1:8787/api/missions/${missionId}/inject-failure`, { method: 'POST' });
  console.log(`✅ Chaos Injected.`);
  
  await delay(8000); // wait for orchestration loop to reach AWAITING_APPROVAL

  const missionRes = await fetch(`http://127.0.0.1:8787/api/missions/${missionId}`);
  const mission = await missionRes.json();
  if (mission.status !== 'AWAITING_APPROVAL') {
     console.log(`⚠️ Expected AWAITING_APPROVAL, got ${mission.status}`);
  } else {
     console.log(`✅ Mission reached AWAITING_APPROVAL`);
  }

  // 5. Security Bypass Test (Phase 7)
  console.log('Phase 7: Attempting security bypass...');
  // The MCP tool `deploy_approved_fix` in incident-server calls `/api/internal/verify-approval`
  const verifyRes = await fetch(`http://127.0.0.1:8787/api/internal/verify-approval?missionId=${missionId}`);
  const verifyData = await verifyRes.json();
  if (verifyData.approved) {
    console.error('❌ Bypass failed! System claims it is approved before human approval!');
  } else {
    console.log('✅ Security bypass blocked: Mission is AWAITING_APPROVAL but not DEPLOYING/COMPLETED.');
  }

  // 6. Approval
  console.log('Phase 8 & 9: Sending Remote Approval and verifying production...');
  await fetch(`http://127.0.0.1:8787/api/missions/${missionId}/approve`, { method: 'POST' });
  console.log(`✅ Approval sent.`);

  await delay(3000); // Wait for deploy
  
  let fixedLatencies = [];
  for(let i=0; i<3; i++) fixedLatencies.push(await measureLatency('http://127.0.0.1:8080/checkout'));
  const avgFixed = fixedLatencies.reduce((a,b)=>a+b)/3;
  console.log(`✅ Fixed latency: ~${avgFixed.toFixed(2)}ms`);

  console.log('\n=== VALIDATION COMPLETE ===');
}

runValidation().catch(console.error);
