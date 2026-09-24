# Honey Chain: PS 26021 Hackathon Prototype

## 1. Project Overview
Honey Chain is a blockchain-based system for honey traceability and smart beekeeping management.

## 2. Problem Statement
PS 26021: "Honey Chain: A blockchain-based system for honey traceability and smart beekeeping management."

## 3. Architecture
The system consists of:
- **IoT Simulator**: Generates temperature, humidity, and weight metrics for hives.
- **FastAPI Backend**: Handles data ingestion, AI inference, and blockchain/IPFS integration.
- **Next.js Frontend**: Provides Beekeeper, Admin Command Center, and Consumer Verification portals.
- **PostgreSQL**: Stores relational data (Hives, Users, Clusters).
- **Blockchain/IPFS**: Generates decentralized provenance (Mocked for demo).

## 4. Features
- IoT Telemetry & Yield Prediction
- AI Colony Health Analytics (YOLO Varroa Scanner)
- Blockchain Provenance & Honey Batches
- IPFS Metadata Pinning
- Consumer Verification Portal via QR Code
- KVIC Admin Command Center

## 5. Tech Stack
- Frontend: Next.js, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, PyTest
- Blockchain: Hardhat, Solidity (ERC-721)
- Deployment: Docker, Docker Compose

## 8. Local Setup & 9. Docker Setup
```bash
# Start the full stack (Frontend, Backend, DB)
docker compose up -d --build
```
- Frontend: `http://localhost:3005`
- Backend API: `http://localhost:8005`

## 15. Demo Instructions
To completely reset the system for a fresh presentation:
```bash
python3 backend/seed_demo.py
```
Start the IoT simulator in a specific scenario:
```bash
python3 iot/simulator/simulator.py --scenario HIGH_TEMPERATURE
```

## 17. Mock vs Real Integrations
- **Blockchain**: Configured via `BLOCKCHAIN_MODE=demo` (uses deterministic mock hashes to prevent network delays).
- **IPFS**: Configured via `IPFS_MODE=demo` (generates deterministic IPFS CIDs).
- **AI**: The YOLO inference endpoint acts as a prototype returning simulated bounding boxes based on the hackathon constraints.

## 18. Known Limitations
- IPFS pinning is currently a local mock.
- Sepolia minting is abstracted but disabled in demo mode to prevent gas issues.
- The AI model is a lightweight heuristic/mock substitute for a full production weight model.
