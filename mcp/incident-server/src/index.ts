import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const server = new Server({
  name: 'incident-server',
  version: '1.0.0',
}, {
  capabilities: { tools: {} }
});

const CHECKOUT_DIR = path.resolve(process.cwd(), '../../demo/checkout-service');

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_alert',
        description: 'Get the active PagerDuty alert for the checkout service',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_recent_deploy',
        description: 'Get details about the most recent deployment',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_runtime_profile',
        description: 'Get the current CPU/Latency profile of the service',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_current_code',
        description: 'Read a source code file from the checkout service',
        inputSchema: {
          type: 'object',
          properties: { filename: { type: 'string' } },
          required: ['filename']
        }
      },
      {
        name: 'deploy_approved_fix',
        description: 'Deploy a fix. Will fail if human approval is not granted in the orchestrator.',
        inputSchema: {
          type: 'object',
          properties: {
            missionId: { type: 'string' },
            patchedCode: { type: 'string' },
            filename: { type: 'string' }
          },
          required: ['missionId', 'patchedCode', 'filename']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === 'get_alert') {
      return {
        content: [{ type: 'text', text: JSON.stringify({
          service: 'checkout-api',
          alert: 'High Latency / Timeout',
          severity: 'SEV-1',
          metric: 'p95 latency > 1000ms',
          time: new Date().toISOString()
        }, null, 2) }]
      };
    }

    if (request.params.name === 'get_recent_deploy') {
      return {
        content: [{ type: 'text', text: JSON.stringify({
          commit: '92ac17f',
          author: 'dev@brahma.internal',
          message: 'Refactor request matcher for upcoming inventory feature',
          filesChanged: ['src/requestMatcher.ts']
        }, null, 2) }]
      };
    }

    if (request.params.name === 'get_runtime_profile') {
      let latency = 1200;
      try {
        const res = await fetch('http://localhost:8080/checkout', { method: 'POST' });
        const data = await res.json();
        latency = data.latencyMs;
      } catch (e) { /* ignore, use default */ }
      
      return {
        content: [{ type: 'text', text: JSON.stringify({
          avgLatencyMs: latency,
          hotPath: 'requestMatcher.ts -> matchItems()',
          cpuTimePercent: 92
        }, null, 2) }]
      };
    }

    if (request.params.name === 'get_current_code') {
      const { filename } = request.params.arguments as any;
      const fullPath = path.join(CHECKOUT_DIR, filename);
      if (!fs.existsSync(fullPath)) {
        return { content: [{ type: 'text', text: `File not found: ${filename}` }], isError: true };
      }
      const code = fs.readFileSync(fullPath, 'utf-8');
      return { content: [{ type: 'text', text: code }] };
    }

    if (request.params.name === 'deploy_approved_fix') {
      const { missionId, patchedCode, filename } = request.params.arguments as any;
      
      // Verify approval with BRAHMA backend API
      const BRAHMA_API = process.env.BRAHMA_API_URL || 'http://localhost:8787';
      try {
        const verifyRes = await fetch(`${BRAHMA_API}/api/internal/verify-approval?missionId=${missionId}`);
        if (!verifyRes.ok) {
          return { content: [{ type: 'text', text: `DEPLOY REJECTED: Mission ${missionId} is not in APPROVED state.` }], isError: true };
        }
        const data = await verifyRes.json();
        if (!data.approved) {
          return { content: [{ type: 'text', text: `DEPLOY REJECTED: Mission ${missionId} does not have human approval.` }], isError: true };
        }
      } catch (err) {
        return { content: [{ type: 'text', text: `DEPLOY REJECTED: Could not verify approval with BRAHMA backend.` }], isError: true };
      }

      const fullPath = path.join(CHECKOUT_DIR, filename);
      fs.writeFileSync(fullPath, patchedCode, 'utf-8');
      
      // Turn off incident mode in the running service
      try {
        await fetch('http://localhost:8080/reset', { method: 'POST' });
      } catch (e) { }

      return {
        content: [{ type: 'text', text: `DEPLOY SUCCESS: ${filename} has been updated and incident mode cleared.` }]
      };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }], isError: true };
  } catch (error: any) {
    return { content: [{ type: 'text', text: error.message }], isError: true };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Incident MCP Server running on stdio');
}
run().catch(console.error);
