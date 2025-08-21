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
