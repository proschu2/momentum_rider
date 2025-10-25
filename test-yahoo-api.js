// Test script to figure out Yahoo Finance API usage
const YahooFinance = require('yahoo-finance2').default;

async function testYahooFinance() {
  try {
    const yahooFinance = new YahooFinance();

    console.log('Testing Yahoo Finance API...');

    // Try different method names that might exist
    const possibleMethods = ['quote', 'quoteSummary', 'historical', 'chart', 'search'];

    for (const method of possibleMethods) {
      if (typeof yahooFinance[method] === 'function') {
        console.log(`✓ Found method: ${method}`);

        try {
          const result = await yahooFinance[method]('VTI');
          console.log(`  ${method} result for VTI:`, typeof result === 'object' ? 'Object with keys: ' + Object.keys(result).join(', ') : result);
        } catch (e) {
          console.log(`  ${method} error:`, e.message);
        }
      } else {
        console.log(`✗ Method not found: ${method}`);
      }
    }

    // Check if there are static methods on the class
    console.log('\nChecking static methods:');
    console.log('Static methods on YahooFinance:', Object.keys(YahooFinance).filter(k => typeof YahooFinance[k] === 'function'));

  } catch (error) {
    console.error('Error:', error);
  }
}

testYahooFinance();