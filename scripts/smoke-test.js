const http = require('http');
const https = require('https');

const baseUrl = process.argv.includes('--url') 
  ? process.argv[process.argv.indexOf('--url') + 1] 
  : 'http://localhost:3000';

console.log(`\n==================================================`);
console.log(`   DELRAY ROCKS - AUTOMATED SMOKE TEST SUITE`);
console.log(`==================================================`);
console.log(`Target URL: ${baseUrl}\n`);

const routesToTest = [
  // Public Landing & Authentication Pages
  { path: '/', expectedStatus: [307, 200], name: 'Root Endpoint (Redirects to Login)' },
  { path: '/login', expectedStatus: [200], name: 'Login Page' },
  { path: '/coastal', expectedStatus: [200], name: 'Coastal Public Signup Page' },
  { path: '/coastal/proposal', expectedStatus: [200], name: 'Coastal Sponsorship Proposal' },

  // Unauthenticated Security Enforcement Checks (Must Redirect 307 to Login)
  { path: '/parent/dashboard', expectedStatus: [307], name: 'Parent Dashboard Auth Guard' },
  { path: '/parent/progress', expectedStatus: [307], name: 'Parent Progress Auth Guard' },
  { path: '/parent/reports', expectedStatus: [307], name: 'Parent Reports Auth Guard' },
  { path: '/coach/dashboard', expectedStatus: [307], name: 'Coach Dashboard Auth Guard' },
  { path: '/coach/coastal', expectedStatus: [307], name: 'Coach Coastal Auth Guard' },
  { path: '/coach/film', expectedStatus: [307], name: 'Coach Film Room Auth Guard' },
  { path: '/coach/roster', expectedStatus: [307], name: 'Coach Roster Auth Guard' },
  { path: '/coach/evaluate', expectedStatus: [307], name: 'Coach Evaluation Auth Guard' },
  { path: '/coach/playbook', expectedStatus: [307], name: 'Coach Playbook Auth Guard' },

  // API Endpoints & Security Checks
  { path: '/api/coastal/signup', method: 'GET', expectedStatus: [405], name: 'Coastal Signup GET (Method Not Allowed)' },
  { path: '/api/coastal/list', method: 'GET', expectedStatus: [401], name: 'Protected API Auth Protection (401 Unauthorized)' },
];

function fetchRoute(route) {
  return new Promise((resolve) => {
    const url = new URL(route.path, baseUrl);
    const client = url.protocol === 'https:' ? https : http;

    const options = {
      method: route.method || 'GET',
      timeout: 5000,
    };

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const passed = route.expectedStatus.includes(res.statusCode);
        resolve({
          name: route.name,
          path: route.path,
          method: options.method,
          status: res.statusCode,
          expectedStatus: route.expectedStatus.join(' or '),
          passed,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name: route.name,
        path: route.path,
        method: options.method,
        status: 'ERROR',
        error: err.message,
        passed: false,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: route.name,
        path: route.path,
        method: options.method,
        status: 'TIMEOUT',
        passed: false,
      });
    });

    req.end();
  });
}

async function runSmokeTests() {
  let passedCount = 0;
  let failedCount = 0;

  for (const route of routesToTest) {
    const result = await fetchRoute(route);
    if (result.passed) {
      passedCount++;
      console.log(`[PASS] ${result.method || 'GET'} ${result.path} - ${result.name} (Status: ${result.status})`);
    } else {
      failedCount++;
      console.log(`[FAIL] ${result.method || 'GET'} ${result.path} - ${result.name} (Expected: ${result.expectedStatus}, Got: ${result.status} ${result.error ? `- ${result.error}` : ''})`);
    }
  }

  console.log(`\n==================================================`);
  console.log(`   TEST SUMMARY: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log(`==================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSmokeTests();
