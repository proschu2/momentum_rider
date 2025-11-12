// Test script to verify CORS configuration in Docker
const http = require('http');

const testUrls = [
  'http://localhost:3000/health',
  'http://localhost:3000/api/health',
  'http://localhost:3000/api/momentum/SPY'
];

function testCors(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000'
      }
    }, (res) => {
      console.log(`\nTesting: ${url}`);
      console.log(`Status: ${res.statusCode}`);
      console.log(`CORS Headers:`);
      console.log(`  Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin']}`);
      console.log(`  Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods']}`);
      console.log(`  Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers']}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`Response: ${JSON.stringify(jsonData, null, 2).substring(0, 200)}...`);
        } catch {
          console.log(`Response: ${data.substring(0, 200)}...`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`\nTesting: ${url}`);
      console.log(`Error: ${err.message}`);
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing CORS configuration...');
  console.log('Make sure the Docker container is running on port 3000');
  
  for (const url of testUrls) {
    await testCors(url);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }
  
  console.log('\nCORS test completed!');
}

runTests().catch(console.error);