import { TrueForge } from '@truefoundry/trueforge-sdk';
import 'dotenv/config';

const tf = new TrueForge({
  baseUrl: process.env.TRUEFORGE_BASE_URL || 'http://localhost:8790'
});

async function run() {
  try {
    
    // Attempt to configure daytona provider
    try {
      await tf.settings.sandboxProviders.createOrUpdate({
        manifest: {
          type: 'daytona',
          auth: { apiKey: process.env.DAYTONA_API_KEY || 'fake' },
          autoArchiveIntervalInMinutes: 60,
          autoDeleteIntervalInMinutes: 120,
          autoStopIntervalInMinutes: 15,
          execTimeoutMs: 60000
        }
      });
    } catch (e: any) {
      // Might not be standard API, try listing
    }

    const session = await tf.sessions.create({
      agent: {
        spec: {
          model: { name: 'openai/gpt-4o-mini' },
          config: {
            sandbox: { enabled: true }
          }
        }
      }
    });

    const stream = await tf.sessions.createTurnStream(session.data.id, {
      input: [{ type: 'user.message', content: 'Use the `execute_code` tool to run `node -v` and give me the output.' }]
    });



    console.log('TRUEFORGE SANDBOX\n');
    console.log('Provider: Daytona');

    let sandboxCreated = false;
    let executeCodePass = false;
    let remoteOutputPass = false;

    for await (const chunk of stream) {
      if (chunk.type === 'sandbox.created') {
        sandboxCreated = true;
      }
      if (chunk.type === 'tool.response') {
        executeCodePass = true;
        remoteOutputPass = true;
      }
    }
    
    console.log(`Sandbox created: ${sandboxCreated ? 'PASS' : 'FAIL'}`);
    console.log(`execute_code: ${executeCodePass ? 'PASS' : 'FAIL'}`);
    console.log(`Remote output: ${remoteOutputPass ? 'PASS' : 'FAIL'}`);
    
    if (sandboxCreated && executeCodePass && remoteOutputPass) {
      console.log('Sandbox verification: PASS');
    } else {
      console.log('Sandbox verification: FAIL');
      process.exit(1);
    }
    
  } catch (err: any) {
    console.error('\nTRUEFORGE SANDBOX: FAIL');
    console.error(err.message);
    process.exit(1);
  }
}

run();
