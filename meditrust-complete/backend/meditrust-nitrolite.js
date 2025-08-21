// meditrust-nitrolite.js - FIXED VERSION
const WebSocket = require('ws');
const { ethers } = require('ethers');
const express = require('express');
const cors = require('cors');

// YOUR CONFIGURATION
const CLEARNODE_URL = 'wss://clearnet.yellow.com/ws';
const PRIVATE_KEY = 'c04a758a61ebe607df0a1529bb85ebbcb08b73341048bda40fbb924ff5d60ba3';
const ADDRESS = '0x650419964C948c3ae289747AF048775816D50C09';

// Setup
const wallet = new ethers.Wallet(PRIVATE_KEY);
let ws = null;
let isConnected = false;
let activeSessions = new Map();
let pendingRewards = new Map();

// Express server
const app = express();
app.use(cors());
app.use(express.json());

// Connect to ClearNode (simplified for now)
function connectToClearNode() {
  return new Promise((resolve) => {
    console.log('🔄 Attempting to connect to ClearNode...');
    
    // For now, we'll simulate the connection
    // The actual ClearNode might need different auth
    setTimeout(() => {
      isConnected = true;
      console.log('✅ Simulated connection established');
      console.log('📝 Note: Using local state management for demo');
      resolve();
    }, 1000);
  });
}

// API Endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    clearNode: isConnected ? 'simulated' : 'disconnected',
    activeSessions: activeSessions.size,
    pendingRewards: pendingRewards.size,
    wallet: ADDRESS
  });
});

app.post('/api/register', async (req, res) => {
  try {
    const { batchId, drugName, ingredients } = req.body;
    const finalBatchId = batchId || `BATCH-${Date.now()}`;
    
    // Create a simulated session ID
    const sessionId = `session_${finalBatchId}_${Date.now()}`;
    activeSessions.set(finalBatchId, sessionId);
    
    console.log(`📦 Registered batch: ${finalBatchId}`);
    
    res.json({
      success: true,
      batch: {
        batchId: finalBatchId,
        drugName: drugName || 'Test Medicine',
        ingredients: ingredients || 'Active Ingredients',
        createdAt: Date.now(),
        sessionId: sessionId.slice(0, 20) + '...'
      },
      message: 'Batch registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/verify', async (req, res) => {
  try {
    const { batchId, scanner } = req.body;
    const sessionId = activeSessions.get(batchId);
    
    if (!sessionId) {
      return res.json({
        valid: false,
        reward: 0,
        message: 'Batch not found. Please register first.'
      });
    }
    
    const scannerAddress = scanner || ADDRESS;
    const key = `${scannerAddress}_${batchId}`;
    const lastScan = pendingRewards.get(key);
    const now = Date.now();
    
    // Check 24-hour cooldown
    if (lastScan && now - lastScan < 24 * 60 * 60 * 1000) {
      return res.json({
        valid: true,
        reward: 0,
        message: 'Already scanned within 24 hours. No reward.'
      });
    }
    
    // Record the scan
    pendingRewards.set(key, now);
    
    console.log(`✅ Verified: ${batchId} by ${scannerAddress.slice(0, 10)}...`);
    
    res.json({
      valid: true,
      reward: 1,
      message: 'Verification successful! Earned 1 MEDI token',
      sessionId: sessionId.slice(0, 20) + '...'
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/report', async (req, res) => {
  try {
    const { batchId, evidence } = req.body;
    const sessionId = activeSessions.get(batchId);
    
    if (!sessionId) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    console.log(`🚨 Report submitted for ${batchId}: ${evidence}`);
    
    res.json({
      success: true,
      message: 'Report submitted. You may earn 10 MEDI tokens if verified.',
      sessionId: sessionId.slice(0, 20) + '...'
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sessions', (req, res) => {
  const sessions = Array.from(activeSessions.entries()).map(([batchId, sessionId]) => ({
    batchId,
    sessionId: sessionId.slice(0, 30) + '...',
    status: 'active',
    createdAt: new Date().toISOString()
  }));
  
  res.json({
    sessions,
    totalRewards: pendingRewards.size
  });
});

app.post('/api/close/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const sessionId = activeSessions.get(batchId);
    
    if (!sessionId) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    activeSessions.delete(batchId);
    console.log(`🔒 Closed session for ${batchId}`);
    
    res.json({
      success: true,
      message: 'Session closed successfully',
      sessionId: sessionId.slice(0, 20) + '...'
    });
  } catch (error) {
    console.error('Close error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the application
async function start() {
  try {
    console.log('🏥 Starting MediTrust...');
    console.log('👛 Wallet:', ADDRESS);
    
    // Connect to ClearNode (simulated for now)
    await connectToClearNode();
    
    const PORT = 5000;
    app.listen(PORT, () => {
      console.log(`\n✅ MediTrust API running on port ${PORT}`);
      console.log('\n📍 Test URLs:');
      console.log(`  http://localhost:${PORT}/health`);
      console.log(`  http://localhost:${PORT}/api/sessions`);
      console.log('\n💡 Test commands:');
      console.log('  curl http://localhost:5000/health');
      console.log('\n🔄 System ready for medicine registration and verification!');
    });
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  if (ws) ws.close();
  process.exit(0);
});

// Start the application
start();