// frontend/src/App.jsx
// Complete React frontend for MediTrust with Nitrolite integration

import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import QRCode from 'qrcode';
import './App.css';

function App() {
  // State management
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [systemStatus, setSystemStatus] = useState({});
  const [batches, setBatches] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [qrCode, setQrCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  
  // Form states
  const [batchForm, setBatchForm] = useState({
    batchId: '',
    drugName: '',
    ingredients: '',
    expiryDate: ''
  });
  
  const [verifyForm, setVerifyForm] = useState({
    batchId: '',
    scanner: ''
  });

  const API_URL = 'http://localhost:5000';

  // Initialize and check system status
  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Connect to MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setAccount(accounts[0]);
        setConnected(true);
        setMessage('Wallet connected successfully!');
      } catch (error) {
        setMessage('Failed to connect wallet: ' + error.message);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  // Check system health
  const checkSystemHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      setSystemStatus({ status: 'offline', clearNode: 'disconnected' });
    }
  };

  // Load active sessions
  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  // Register medicine batch
  const registerBatch = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const batchData = {
        ...batchForm,
        batchId: batchForm.batchId || `BATCH-${Date.now()}`,
        expiryDate: new Date(batchForm.expiryDate).toISOString()
      };
      
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage(`✅ Batch registered: ${batchData.batchId}`);
        setBatches([...batches, result.batch]);
        
        // Generate QR code
        const qrData = {
          batchId: batchData.batchId,
          drugName: batchData.drugName,
          manufacturer: account || '0x650419964C948c3ae289747AF048775816D50C09',
          timestamp: Date.now()
        };
        
        const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
        setQrCode(qrDataUrl);
        
        // Clear form
        setBatchForm({
          batchId: '',
          drugName: '',
          ingredients: '',
          expiryDate: ''
        });
        
        // Reload sessions
        loadSessions();
      } else {
        setMessage(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Verify medicine
  const verifyMedicine = async (e) => {
    e.preventDefault();
    setLoading(true);
    setScanResult(null);
    
    try {
      const response = await fetch(`${API_URL}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: verifyForm.batchId,
          scanner: verifyForm.scanner || account || '0x0000000000000000000000000000000000000001'
        })
      });
      
      const result = await response.json();
      setScanResult(result);
      
      if (result.reward > 0) {
        setMessage(`🎉 Earned ${result.reward} MEDI token!`);
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage(`❌ Verification failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Report counterfeit
  const reportCounterfeit = async (batchId) => {
    setLoading(true);
    
    try {
      const evidence = prompt('Describe the issue with this medicine:');
      if (!evidence) return;
      
      const response = await fetch(`${API_URL}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, evidence })
      });
      
      const result = await response.json();
      setMessage(result.message);
    } catch (error) {
      setMessage(`❌ Report failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Close batch session
  const closeBatch = async (batchId) => {
    if (!confirm(`Close session for ${batchId}?`)) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/close/${batchId}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      setMessage(result.message);
      loadSessions();
    } catch (error) {
      setMessage(`❌ Close failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <h1>🏥 MediTrust</h1>
          <span className="subtitle">Powered by Nitrolite State Channels</span>
        </div>
        
        <div className="status-bar">
          <div className={`status-indicator ${systemStatus.clearNode === 'connected' ? 'connected' : 'disconnected'}`}>
            {systemStatus.clearNode === 'connected' ? '🟢' : '🔴'} ClearNode
          </div>
          <div className="status-indicator">
            📦 Sessions: {systemStatus.activeSessions || 0}
          </div>
          <div className="status-indicator">
            💰 Rewards: {systemStatus.pendingRewards || 0}
          </div>
        </div>
        
        <div className="wallet">
          {connected ? (
            <div className="account">
              {account?.slice(0, 6)}...{account?.slice(-4)}
            </div>
          ) : (
            <button onClick={connectWallet} className="connect-btn">
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''} 
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={activeTab === 'register' ? 'active' : ''} 
          onClick={() => setActiveTab('register')}
        >
          ➕ Register
        </button>
        <button 
          className={activeTab === 'verify' ? 'active' : ''} 
          onClick={() => setActiveTab('verify')}
        >
          🔍 Verify
        </button>
        <button 
          className={activeTab === 'sessions' ? 'active' : ''} 
          onClick={() => { setActiveTab('sessions'); loadSessions(); }}
        >
          📝 Sessions
        </button>
      </nav>

      {/* Message Display */}
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info'}`}>
          {message}
          <button onClick={() => setMessage('')}>✕</button>
        </div>
      )}

      {/* Main Content */}
      <main className="main">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <h2>System Overview</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Batches</h3>
                <div className="stat-value">{batches.length}</div>
              </div>
              <div className="stat-card">
                <h3>Active Sessions</h3>
                <div className="stat-value">{systemStatus.activeSessions || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Pending Rewards</h3>
                <div className="stat-value">{systemStatus.pendingRewards || 0} MEDI</div>
              </div>
              <div className="stat-card">
                <h3>Network Status</h3>
                <div className="stat-value">
                  {systemStatus.clearNode === 'connected' ? '✅ Online' : '❌ Offline'}
                </div>
              </div>
            </div>

            <div className="how-it-works">
              <h3>How MediTrust Works with Nitrolite</h3>
              <ol>
                <li>🏭 <strong>Manufacturer registers</strong> medicine batch → Creates state channel</li>
                <li>📱 <strong>Consumer scans</strong> QR code → Instant verification off-chain</li>
                <li>💰 <strong>Earn rewards</strong> → 1 MEDI per scan (no gas fees!)</li>
                <li>🚨 <strong>Report fakes</strong> → 10 MEDI for verified reports</li>
                <li>🔒 <strong>Settlement</strong> → Close channel when batch expires</li>
              </ol>
            </div>
          </div>
        )}

        {/* Register Tab */}
        {activeTab === 'register' && (
          <div className="register">
            <h2>Register Medicine Batch</h2>
            
            <form onSubmit={registerBatch} className="form">
              <div className="form-group">
                <label>Batch ID</label>
                <input
                  type="text"
                  placeholder="e.g., BATCH-001 (auto-generated if empty)"
                  value={batchForm.batchId}
                  onChange={(e) => setBatchForm({...batchForm, batchId: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Drug Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Amoxicillin 500mg"
                  value={batchForm.drugName}
                  onChange={(e) => setBatchForm({...batchForm, drugName: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Ingredients *</label>
                <textarea
                  placeholder="Active ingredients list"
                  value={batchForm.ingredients}
                  onChange={(e) => setBatchForm({...batchForm, ingredients: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Expiry Date *</label>
                <input
                  type="date"
                  value={batchForm.expiryDate}
                  onChange={(e) => setBatchForm({...batchForm, expiryDate: e.target.value})}
                  required
                />
              </div>
              
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Registering...' : 'Register Batch'}
              </button>
            </form>
            
            {qrCode && (
              <div className="qr-display">
                <h3>QR Code Generated</h3>
                <img src={qrCode} alt="Batch QR Code" />
                <p>Print this QR code on medicine packaging</p>
                <button onClick={() => {
                  const link = document.createElement('a');
                  link.download = `batch-${batchForm.batchId || 'qr'}.png`;
                  link.href = qrCode;
                  link.click();
                }}>
                  Download QR
                </button>
              </div>
            )}
          </div>
        )}

        {/* Verify Tab */}
        {activeTab === 'verify' && (
          <div className="verify">
            <h2>Verify Medicine</h2>
            
            <form onSubmit={verifyMedicine} className="form">
              <div className="form-group">
                <label>Batch ID *</label>
                <input
                  type="text"
                  placeholder="Enter batch ID from QR code"
                  value={verifyForm.batchId}
                  onChange={(e) => setVerifyForm({...verifyForm, batchId: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Scanner Address (optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty to use your address"
                  value={verifyForm.scanner}
                  onChange={(e) => setVerifyForm({...verifyForm, scanner: e.target.value})}
                />
              </div>
              
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Verifying...' : '🔍 Verify Medicine'}
              </button>
            </form>
            
            {scanResult && (
              <div className={`scan-result ${scanResult.valid ? 'valid' : 'invalid'}`}>
                <h3>{scanResult.valid ? '✅ Genuine Medicine' : '❌ Invalid/Expired'}</h3>
                <div className="result-details">
                  <p><strong>Status:</strong> {scanResult.valid ? 'Authentic' : 'Check Failed'}</p>
                  <p><strong>Reward:</strong> {scanResult.reward} MEDI</p>
                  <p><strong>Message:</strong> {scanResult.message}</p>
                  {scanResult.sessionId && (
                    <p><strong>Session:</strong> {scanResult.sessionId.slice(0, 10)}...</p>
                  )}
                </div>
                
                {!scanResult.valid && (
                  <button 
                    onClick={() => reportCounterfeit(verifyForm.batchId)}
                    className="report-btn"
                  >
                    🚨 Report as Counterfeit
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="sessions">
            <h2>Active State Channel Sessions</h2>
            
            {sessions.length === 0 ? (
              <p className="no-data">No active sessions. Register a batch to create one.</p>
            ) : (
              <div className="sessions-list">
                {sessions.map((session, index) => (
                  <div key={index} className="session-card">
                    <div className="session-header">
                      <h4>Batch: {session.batchId}</h4>
                      <span className={`status ${session.status}`}>{session.status}</span>
                    </div>
                    <div className="session-details">
                      <p><strong>Session ID:</strong> {session.sessionId.slice(0, 20)}...</p>
                      <p><strong>Created:</strong> {new Date(session.createdAt || Date.now()).toLocaleString()}</p>
                    </div>
                    <div className="session-actions">
                      <button 
                        onClick={() => closeBatch(session.batchId)}
                        className="close-btn"
                      >
                        🔒 Close Session
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button onClick={loadSessions} className="refresh-btn">
              🔄 Refresh Sessions
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>© 2025 MediTrust | Powered by Yellow Network Nitrolite Protocol</p>
          <p>Fighting counterfeit medicines with state channels</p>
        </div>
      </footer>
    </div>
  );
}

export default App;