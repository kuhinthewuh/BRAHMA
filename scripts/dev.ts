import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import fs from 'fs';
import 'dotenv/config'; // Load .env file automatically

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

async function checkHttp(url: string) {
  return new Promise<boolean>((resolve) => {
    const req = http.get(url, (res) => {
      resolve(true); // Any response means it is listening
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function waitForHttp(url: string, name: string, timeoutMs: number = 30000) {
  console.log(`Waiting for ${name} at ${url}...`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkHttp(url)) {
      console.log(`\x1b[32m${name}       READY\x1b[0m`);
      return true;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  console.error(`\x1b[31mFAIL: ${name} failed to become ready.\x1b[0m`);
  return false;
}

async function start() {
  const argMode = process.argv[2];
  if (argMode === 'live') {
    process.env.BRAHMA_MODE = 'live';
  } else if (argMode === 'test') {
    process.env.BRAHMA_MODE = 'test';
  }
  
  const mode = process.env.BRAHMA_MODE || 'test';
  const childProcesses: ReturnType<typeof spawn>[] = [];

  console.log(`\nBRAHMA ${mode.toUpperCase()} STARTUP\n`);

  if (mode === 'live') {
    const isUp = await checkHttp('http://localhost:8790/api/health');
    if (!isUp) {
      const loaderPath = path.resolve(process.cwd(), 'register-loader.mjs');
      const cliPath = path.resolve(process.cwd(), 'node_modules/@truefoundry/trueforge/dist/cli.js');
      
      console.log('TRUEFORGE STARTUP\n');
      console.log(`Loader:\n${loaderPath}\n`);
      console.log(`CLI:\n${cliPath}\n`);
      console.log('Port:\n8790\n');

      if (!fs.existsSync(loaderPath)) {
        console.error(`\x1b[31mFAIL: Loader not found: ${loaderPath}\x1b[0m`);
        process.exit(1);
      }
      if (!fs.existsSync(cliPath)) {
        console.error(`\x1b[31mFAIL: CLI not found: ${cliPath}\x1b[0m`);
        process.exit(1);
      }

      console.log(`TrueForge daemon       STARTING`);

      const daemon = spawn(process.execPath, ['--import', require('url').pathToFileURL(loaderPath).href, cliPath, '--port', '8790'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        cwd: process.cwd()
      });
      childProcesses.push(daemon);
      
      const logStream = fs.createWriteStream(path.resolve(process.cwd(), 'trueforge-daemon.log'), { flags: 'a' });
      daemon.stdout?.pipe(logStream);
      daemon.stderr?.pipe(logStream);
      daemon.on('error', (err) => console.error(`[TF ERR] ${err.message}`));
      daemon.on('exit', (code) => {
        if (code !== 0 && code !== null) console.error(`[TF ERR] TrueForge daemon crashed with code ${code}`);
      });

      const healthy = await waitForHttp('http://localhost:8790/api/health', 'TrueForge daemon', 30000);
      if (!healthy) {
        console.error('\x1b[31mFAIL: TrueForge daemon failed to start.\x1b[0m');
        console.error('Refusing to silently fall back to mock mode in dev:live.');
        process.exit(1);
      }
    } else {
      console.log(`\x1b[32mTrueForge daemon       READY (Reusing existing)\x1b[0m`);
    }
  }

  const tsxCli = path.resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs');

  function spawnService(workspaceName: string, prefix: string, color: string) {
    const child = spawn(process.execPath, [tsxCli, 'src/index.ts'], {
      stdio: 'pipe',
      shell: false,
      cwd: path.resolve(process.cwd(), workspaceName),
      env: process.env // pass down BRAHMA_MODE
    });
    childProcesses.push(child);

    child.stdout?.on('data', () => {});
    child.stderr?.on('data', () => {});
    child.on('error', (err) => {
      console.error(`Failed to start ${workspaceName}:`, err);
    });

    return child;
  }

  // Start background services quietly
  spawnService('demo/checkout-service', 'CHK', '\x1b[34m');
  spawnService('mcp/incident-server', 'MCP', '\x1b[35m');
  spawnService('services/api', 'API', '\x1b[36m');

  const checkoutHealthy = await waitForHttp('http://localhost:8080/health', 'Checkout service');
  const mcpHealthy = await waitForHttp('http://localhost:8081/', 'Incident MCP');
  const apiHealthy = await waitForHttp('http://localhost:8787/health', 'BRAHMA API');

  if (!checkoutHealthy || !mcpHealthy || !apiHealthy) {
     console.error('\x1b[31mFAIL: One or more BRAHMA services failed to start.\x1b[0m');
     process.exit(1);
  }

  const terminal = spawn(process.execPath, [tsxCli, 'src/index.tsx'], {
    stdio: 'inherit',
    shell: false,
    cwd: path.resolve(process.cwd(), 'apps/terminal'),
    env: process.env
  });

  let shuttingDown = false;
  function cleanup() {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const child of childProcesses) {
      try { child.kill('SIGKILL'); } catch (e) {}
    }
    try { terminal.kill('SIGKILL'); } catch (e) {}
    process.exit(0);
  }

  terminal.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

start();
