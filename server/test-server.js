// Test script for the backend server
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

async function testBackend() {
  console.log('Testing backend server...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('   ✅ Health check:', healthData);

    // Test quote endpoint
    console.log('\n2. Testing quote endpoint...');
    const quoteResponse = await fetch(`${API_BASE}/quote/VTI`);
    const quoteData = await quoteResponse.json();
    console.log('   ✅ VTI Quote:', {
      price: quoteData.regularMarketPrice,
      change: quoteData.regularMarketChangePercent
    });

    // Test momentum endpoint
    console.log('\n3. Testing momentum endpoint...');
    const momentumResponse = await fetch(`${API_BASE}/momentum/VTI`);
    const momentumData = await momentumResponse.json();
    console.log('   ✅ VTI Momentum:', {
      average: momentumData.average,
      absoluteMomentum: momentumData.absoluteMomentum,
      periods: momentumData.periods
    });

    // Test batch momentum endpoint
    console.log('\n4. Testing batch momentum endpoint...');
    const batchResponse = await fetch(`${API_BASE}/momentum/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tickers: ['VTI', 'TLT', 'PDBC'] }),
    });
    const batchData = await batchResponse.json();
    console.log('   ✅ Batch Momentum Results:');
    batchData.forEach(result => {
      console.log(`      ${result.ticker}: ${result.average.toFixed(2)}% (${result.absoluteMomentum ? 'Positive' : 'Negative'})`);
    });

    console.log('\n✅ All backend tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('   Make sure the backend server is running on port 3001');
  }
}

testBackend();