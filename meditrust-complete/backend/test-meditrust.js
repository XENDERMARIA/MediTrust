// test-meditrust.js
// Test the complete MediTrust flow with Nitrolite

const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testMediTrust() {
  console.log('🧪 Testing MediTrust with Nitrolite State Channels\n');
  
  try {
    // 1. Check system health
    console.log('1️⃣ Checking system health...');
    const health = await axios.get(`${API_URL}/health`);
    console.log('   Status:', health.data.status);
    console.log('   ClearNode:', health.data.clearNode);
    
    if (health.data.clearNode !== 'connected') {
      console.log('⚠️  Waiting for ClearNode connection...');
      await sleep(3000);
    }
    
    // 2. Register a medicine batch
    console.log('\n2️⃣ Registering medicine batch...');
    const batchId = `BATCH-${Date.now()}`;
    const registerResponse = await axios.post(`${API_URL}/api/register`, {
      batchId,
      drugName: 'Amoxicillin 500mg',
      ingredients: 'Amoxicillin trihydrate',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
    
    console.log('   Batch ID:', batchId);
    console.log('   Status:', registerResponse.data.message);
    
    // Wait for session creation
    await sleep(2000);
    
    // 3. Verify the medicine (simulate consumer scan)
    console.log('\n3️⃣ Verifying medicine (consumer scan)...');
    const verifyResponse = await axios.post(`${API_URL}/api/verify`, {
      batchId,
      scanner: '0x1234567890123456789012345678901234567890'
    });
    
    console.log('   Valid:', verifyResponse.data.valid);
    console.log('   Reward:', verifyResponse.data.reward, 'MEDI');
    console.log('   Message:', verifyResponse.data.message);
    
    // 4. Try scanning again (should hit cooldown)
    console.log('\n4️⃣ Trying to scan again (testing cooldown)...');
    const verifyAgain = await axios.post(`${API_URL}/api/verify`, {
      batchId,
      scanner: '0x1234567890123456789012345678901234567890'
    });
    
    console.log('   Reward:', verifyAgain.data.reward, 'MEDI');
    console.log('   Message:', verifyAgain.data.message);
    
    // 5. Report counterfeit (different user)
    console.log('\n5️⃣ Reporting suspected counterfeit...');
    const reportResponse = await axios.post(`${API_URL}/api/report`, {
      batchId,
      evidence: 'QR code looks tampered, packaging is different from original'
    });
    
    console.log('   Status:', reportResponse.data.message);
    
    // 6. Check active sessions
    console.log('\n6️⃣ Checking active sessions...');
    const sessions = await axios.get(`${API_URL}/api/sessions`);
    console.log('   Active sessions:', sessions.data.sessions.length);
    console.log('   Total rewards pending:', sessions.data.totalRewards);
    
    // 7. Close the batch session
    console.log('\n7️⃣ Closing batch session...');
    const closeResponse = await axios.post(`${API_URL}/api/close/${batchId}`);
    console.log('   Status:', closeResponse.data.message);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
console.log('Make sure meditrust-nitrolite.js is running first!');
console.log('Starting tests in 3 seconds...\n');

setTimeout(testMediTrust, 3000);