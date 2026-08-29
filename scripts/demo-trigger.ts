import http from 'http';
import fs from 'fs';
import path from 'path';

const action = process.argv[2]; // 'incident' or 'reset'
if (!action || (action !== 'incident' && action !== 'reset')) {
  console.error('Usage: tsx demo-trigger.ts <incident|reset>');
  process.exit(1);
}

if (action === 'reset') {
  const source = path.join('demo', 'checkout-service', 'fixtures', 'requestMatcher.broken.ts');
  const target = path.join('demo', 'checkout-service', 'src', 'requestMatcher.ts');
  try {
    fs.copyFileSync(source, target);
    console.log('✅ Source file reset to broken state.');
  } catch (e) {
    console.error('❌ Failed to copy broken fixture:', e.message);
  }
}

const url = `http://localhost:8080/${action}`;
console.log(`Triggering ${action} via ${url}...`);

const req = http.request(url, { method: 'POST' }, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log(`\x1b[32m✅ Success! Demo ${action} triggered.\x1b[0m`);
      try {
        const parsed = JSON.parse(body);
        if (parsed.status) {
          console.log(`Service Status: ${parsed.status}`);
        }
        if (parsed.latency) {
          console.log(`Service Latency: ${parsed.latency}ms`);
        }
      } catch (e) {
        // Ignore parse error
      }
      process.exit(0);
    } else {
      console.error(`\x1b[31m❌ Failed to trigger ${action}. Status: ${res.statusCode}\x1b[0m`);
      console.error(body);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error(`\x1b[31m❌ Error: Failed to trigger ${action}. Is the checkout service running?\x1b[0m`);
  console.error(err.message);
  process.exit(1);
});

req.end();
