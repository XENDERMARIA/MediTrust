#!/bin/bash

# setup-meditrust-complete.sh
# Complete setup script for MediTrust with Nitrolite

echo "🏥 MediTrust + Nitrolite Complete Setup"
echo "======================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js detected: $(node --version)"
echo ""

# Create project structure
echo "📁 Creating project structure..."
mkdir -p meditrust-complete
cd meditrust-complete

# Create backend directory
mkdir -p backend
mkdir -p frontend/src
mkdir -p frontend/public
mkdir -p contracts
mkdir -p scripts
mkdir -p docs

# Create package.json for root
echo "📦 Setting up root package.json..."
cat > package.json << 'EOF'
{
  "name": "meditrust-complete",
  "version": "1.0.0",
  "description": "MediTrust with Nitrolite State Channels",
  "scripts": {
    "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install",
    "backend": "cd backend && node meditrust-nitrolite.js",
    "frontend": "cd frontend && npm run dev",
    "test": "cd backend && node test-meditrust.js",
    "dev": "concurrently \"npm run backend\" \"npm run frontend\"",
    "start": "npm run backend"
  },
  "dependencies": {
    "concurrently": "^7.6.0"
  }
}
EOF

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Setup backend
echo "🔧 Setting up backend..."
cd backend

# Create backend package.json
cat > package.json << 'EOF'
{
  "name": "meditrust-backend",
  "version": "1.0.0",
  "main": "meditrust-nitrolite.js",
  "scripts": {
    "start": "node meditrust-nitrolite.js",
    "test": "node test-meditrust.js"
  },
  "dependencies": {
    "@erc7824/nitrolite": "latest",
    "ethers": "5.7.2",
    "ws": "^8.14.2",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "axios": "^1.6.2",
    "qrcode": "^1.5.3",
    "dotenv": "^16.3.1"
  }
}
EOF

# Create .env file
cat > .env << 'EOF'
# Nitrolite Configuration
CLEARNODE_URL=wss://clearnet.yellow.com/ws
PRIVATE_KEY=c04a758a61ebe607df0a1529bb85ebbcb08b73341048bda40fbb924ff5d60ba3
ADDRESS=0x650419964C948c3ae289747AF048775816D50C09

# API Configuration
PORT=5000
NODE_ENV=development
EOF

# Save the main backend file
cat > meditrust-nitrolite.js << 'BACKEND_EOF'
// Copy the complete meditrust-nitrolite.js code here
// This is the main backend file with Nitrolite integration
const WebSocket = require('ws');
const {
  createAuthRequestMessage,
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  createAppSessionMessage,
  createApplicationMessage,
  createCloseAppSessionMessage,
  createGetChannelsMessage,
  createGetLedgerBalancesMessage,
  RPCMethod
} = require('@erc7824/nitrolite');
const { ethers } = require('ethers');
const express = require('express');
const cors = require('cors');

// [Rest of the backend code from the artifact above]
// Due to length, please copy the full backend code from the artifact
BACKEND_EOF

# Save the test file
cat > test-meditrust.js << 'TEST_EOF'
// Copy the test-meditrust.js code here
const axios = require('axios');
// [Rest of the test code from the artifact above]
TEST_EOF

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

cd ../frontend

# Setup frontend
echo "🎨 Setting up frontend..."

# Create frontend package.json
cat > package.json << 'EOF'
{
  "name": "meditrust-frontend",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "ethers": "^5.7.2",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
EOF

# Create vite config
cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
})
EOF

# Create index.html
cat > index.html << 'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MediTrust - Powered by Nitrolite</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

# Create main.jsx
cat > src/main.jsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# Note: App.jsx and App.css should be copied from the artifacts above

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

cd ..

# Create documentation
echo "📝 Creating documentation..."
cat > README.md << 'EOF'
# MediTrust with Nitrolite State Channels

## Quick Start

1. Start the backend:
```bash
npm run backend
```

2. Start the frontend (new terminal):
```bash
npm run frontend
```

3. Open browser:
```
http://localhost:3000
```

## Test the System

```bash
npm test
```

## API Endpoints

- GET /health - System health check
- POST /api/register - Register medicine batch
- POST /api/verify - Verify medicine
- POST /api/report - Report counterfeit
- GET /api/sessions - List active sessions
- POST /api/close/:batchId - Close batch session

## Features

- ✅ Off-chain medicine verification
- ✅ State channel rewards (1 MEDI per scan)
- ✅ Counterfeit reporting (10 MEDI reward)
- ✅ Zero gas fees for verifications
- ✅ Instant settlement

## Technology Stack

- Nitrolite Protocol (ERC-7824)
- Yellow Network ClearNode
- React Frontend
- Express Backend
- WebSocket Communication
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Copy the full backend code to backend/meditrust-nitrolite.js"
echo "2. Copy the full frontend code to frontend/src/App.jsx"
echo "3. Copy the CSS to frontend/src/App.css"
echo "4. Run: npm run backend"
echo "5. Run: npm run frontend (new terminal)"
echo ""
echo "🎉 Your MediTrust system is ready!"