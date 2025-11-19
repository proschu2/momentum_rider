const portfolioService = require('./services/portfolioService');

async function testMomentumDebug() {
  try {
    console.log('=== Testing analyzeStrategy ONLY ===');
    const fullResult = await portfolioService.analyzeStrategy({
      strategy: { type: 'momentum', parameters: { topN: 1, includeIBIT: false, fallbackETF: 'SGOV' } },
      selectedETFs: ['GLDM'],
      additionalCapital: 10000,
      currentHoldings: []
    });

    console.log('fullResult GLDM has price:', 'GLDM' in fullResult.momentumScores ? 'price' in fullResult.momentumScores['GLDM'] : 'GLDM not found');
    console.log('fullResult momentumScores:', JSON.stringify(fullResult.momentumScores, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMomentumDebug();