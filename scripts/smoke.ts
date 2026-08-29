import 'dotenv/config';
import { TrueForge } from '@truefoundry/trueforge-sdk';

const client = new TrueForge({ environment: 'http://localhost:8790' });

async function run() {
  console.log('Registering MCP Server to TrueForge daemon...');
  
  try {
    await client.settings.mcpServers.createOrUpdate({
      manifest: {
        name: 'brahma-mcp',
        type: 'remote',
        description: 'Incident Server',
        url: 'http://localhost:8081/sse'
      }
    });

    console.log('Registering OpenAI Model Provider...');
    await client.settings.modelProviders.createOrUpdate({
      manifest: {
        type: 'openai',
        auth: {
          apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
        },
        models: [
          {
            modelId: 'gpt-4o-mini',
            name: 'gpt-4o-mini',
            properties: {}
          }
        ]
      }
    });
  } catch (err: any) {
    console.error(JSON.stringify(err, null, 2));
    throw err;
  }

  console.log('Creating TrueForge Session...');
  const session = await client.sessions.create({
    agent: {
      spec: {
        model: { name: 'openai/gpt-4o-mini' },
        mcpServers: [{ name: 'brahma-mcp', preload: true }]
      }
    }
  });
  
  console.log('Session response:', session);
  const sessionId = session.data.id;
  console.log('Executing model turn via TrueForge...');
  
  const stream = await client.sessions.createTurnStream(sessionId, {
    input: [
      { type: 'user.message', content: 'Call the get_recent_deploy tool from the brahma-mcp server and give me the commit hash.' }
    ]
  });

  let toolCalled = false;
  let done = false;

  for await (const chunk of stream) {
    console.log(`[CHUNK]`, JSON.stringify(chunk));
    if (chunk.type === 'tool.response') {
      toolCalled = true;
    } else if (chunk.type === 'turn.done') {
      done = true;
    }
  }

  if (toolCalled && done) {
    console.log(`\nTRUEFORGE LIVE: PASS`);
    console.log(`Session ID: ${sessionId}`);
    process.kill(process.pid, 'SIGKILL');
  } else {
    console.error('\nSmoke test failed. Missing tool call or completion event.');
    process.exitCode = 1;
    process.kill(process.pid, 'SIGKILL');
  }
}

run().catch((err) => {
  console.error('\nSmoke test failed with error:', err);
  process.exitCode = 1;
  process.kill(process.pid, 'SIGKILL');
});
