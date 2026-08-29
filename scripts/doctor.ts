import { existsSync, readFileSync } from 'fs';
import path from 'path';

function checkEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return { passed: false, message: 'Missing .env file. Copy .env.example to .env and fill in required values.' };
  }
  const content = readFileSync(envPath, 'utf8');
  if (!content.includes('OPENAI_API_KEY')) return { passed: false, message: 'Missing OPENAI_API_KEY in .env' };
  if (!content.includes('DAYTONA_API_KEY')) return { passed: false, message: 'Missing DAYTONA_API_KEY in .env' };
  
  // Checking if they are filled
  const hasOpenAiKey = /OPENAI_API_KEY=.+/.test(content);
  const hasDaytonaKey = /DAYTONA_API_KEY=.+/.test(content);
  
  if (!hasOpenAiKey) return { passed: false, message: 'OPENAI_API_KEY is empty in .env' };
  if (!hasDaytonaKey) return { passed: false, message: 'DAYTONA_API_KEY is empty in .env' };

  return { passed: true, message: 'Environment variables present and populated' };
}

function checkNode() {
  const version = process.version;
  if (version.startsWith('v18') || version.startsWith('v20') || version.startsWith('v22') || version.startsWith('v24')) {
    return { passed: true, message: `Node version ${version} is compatible` };
  }
  return { passed: false, message: `Node version ${version} is not recommended (use v18, v20, v22, or v24)` };
}

function checkDependencies() {
  if (!existsSync(path.join(process.cwd(), 'node_modules'))) {
    return { passed: false, message: 'node_modules missing. Run npm install' };
  }
  return { passed: true, message: 'Dependencies installed' };
}

async function run() {
  console.log('Running BRAHMA Doctor...\n');
  const checks = [
    { name: 'Node.js Version', check: checkNode },
    { name: 'Environment File', check: checkEnv },
    { name: 'Dependencies', check: checkDependencies },
  ];

  let allPassed = true;
  for (const { name, check } of checks) {
    const { passed, message } = check();
    if (passed) {
      console.log(`\x1b[32m✅ ${name}:\x1b[0m ${message}`);
    } else {
      console.log(`\x1b[31m❌ ${name}:\x1b[0m ${message}`);
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('\n\x1b[32m🎉 All checks passed! Ready to develop.\x1b[0m');
    process.exit(0);
  } else {
    console.log('\n\x1b[33m⚠️  Some checks failed. Please fix the above issues.\x1b[0m');
    process.exit(1);
  }
}

run();
