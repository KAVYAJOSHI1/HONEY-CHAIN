# Honey Chain

Blockchain-backed honey traceability and smart beekeeping management — hackathon prototype for **PS 26021** (KVIC).

IoT hive sensors stream temperature, humidity and weight; an explainable health model, an IsolationForest anomaly detector and a Varroa frame inspector score every colony; at harvest, each batch is hashed, pinned to IPFS and minted as an ERC-721 token; consumers scan the jar's QR code to verify origin and integrity.

| Portal | URL | For |
|---|---|---|
| Landing | `/` | Overview, live stats, verify-a-batch |
| Hive fleet | `/beekeeper` | Fleet table, sensor simulator, open alerts |
| Hive workspace | `/beekeeper/hives/:id` | Live telemetry chart (WebSocket), health breakdown, frame inspection, yield forecast, batch minting + QR |
| Apiaries | `/beekeeper/apiary` | Per-cluster map, benchmarks, downloadable report |
| AI insights / Alerts | `/ai-insights`, `/alerts` | Recommendations, health ranking, alert triage |
| KVIC command center | `/admin` | National map, disease surveillance, recent batches |
| Batch registry | `/admin/batches` | Search, QR codes, revocation |
| Analytics · Compare · Security · Audit | `/admin/*` | Real metrics, CSV exports, integrity checks, audit trail |
| System health | `/system-health` | Live status of every service |
| Consumer passport | `/consumer/:batchId`, `/verify` | Public verification page the QR code opens |

## Architecture

```
iot/simulator ──HTTP──▶ backend (FastAPI) ──▶ PostgreSQL / SQLite
                           │  ├─ app/intelligence.py   health score, yield, recommendations
                           │  ├─ app/ai/               IsolationForest + prototype Varroa detector
                           │  ├─ app/services.py       IPFS + blockchain (demo or Sepolia)
                           │  └─ WebSocket /ws/hives/:id, /ws/alerts
frontend (Next.js 14) ◀──REST + WS──┘
blockchain/ (Hardhat)  HoneyBatch.sol — ERC-721 + AccessControl (BEEKEEPER_ROLE, KVIC_ROLE)
```

## Quick start (Docker)

```bash
cp .env.example .env          # optional — defaults run in demo mode
docker compose up -d --build
```

- Frontend: http://localhost:3005
- API + interactive docs: http://localhost:8005/docs

The database is seeded automatically on first start (3 apiaries, 18 hives, 2 weeks of telemetry, 5 batches). The `iot-simulator` service streams readings for five hives. Use **Reset demo** in the top bar to restore the dataset.

## Local development

**Backend** (Python 3.12):

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010     # SQLite at backend/honeychain.db, auto-seeded
python seed_demo.py                           # optional: reset + reseed
```

**Frontend** (Node 18.17+):

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8010" > .env.local
npm run dev                                   # http://localhost:3000
```

**IoT simulator**:

```bash
python iot/simulator/simulator.py --scenario NORMAL --hives 1,2,3 --interval 5
# scenarios: NORMAL, HIGH_TEMPERATURE, HIGH_HUMIDITY, WEIGHT_INCREASE, WEIGHT_DROP, ABNORMAL_HIVE, DEVICE_OFFLINE, DEMO_MODE
```

The hive fleet page also has a one-click **Sensor simulator** that injects the same scenarios into any hive.

## Tests

```bash
cd backend && pytest               # 43 API tests
cd frontend && npm run lint && npm run build   # type-check + lint are enforced in the build
cd blockchain && npm test          # 5 contract tests
```

## Demo script

1. **Hive fleet** → pick Hive #3 in the simulator → *Heatwave*. The hive drops to Critical; an alert appears.
2. Open **Hive #3** → *Sample: infested*. Mite detections are drawn on the frame; the Varroa factor falls and a recommendation appears.
3. *Harvest & mint batch* → choose a floral source → mint. Download the QR code or open the passport.
4. On the **passport**, expand *Demo: test tamper detection* → *Tamper with record* → verification fails with a hash mismatch → *Restore original*.
5. **Batch registry** → revoke the batch → the passport now shows a KVIC recall.
6. **Alerts** → resolve the heatwave alert; the hive's health score recovers.
7. **Analytics** → export CSVs or the apiary report; ask **HoneyBot** “Varroa risk”.

## Configuration

See [`.env.example`](.env.example). Key variables:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | SQLite `backend/honeychain.db` | Any SQLAlchemy URL |
| `FRONTEND_URL` | `http://localhost:3000` | Base URL encoded in batch QR codes |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `AUTO_SEED` | `true` | Seed demo data when the DB is empty |
| `BLOCKCHAIN_MODE` | `demo` | `sepolia` to mint real tokens |
| `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, `CONTRACT_ADDRESS` | — | Required for `sepolia` mode |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8010` | Frontend → API (build-time) |

### Going on-chain (Sepolia)

```bash
cd blockchain && npm install
npm run deploy:sepolia        # uses SEPOLIA_RPC_URL + PRIVATE_KEY from ../.env; grants BEEKEEPER_ROLE to the deployer
# then set CONTRACT_ADDRESS=<printed address> and BLOCKCHAIN_MODE=sepolia, and restart the backend
python backend/check.py       # verifies RPC, bytecode, balance and roles
```

In Sepolia mode the backend mints via `mintBatch`, reads the token id from the `BatchMinted` event, calls `revokeBatch` on revocation, and links transactions to Etherscan on the passport. If the chain call fails, the batch is recorded as `demo` rather than silently claiming an on-chain anchor.

## Prototype limitations

- **Varroa detector** is simulated: results are deterministic per image (and per preset), but no trained YOLO model runs.
- **Health and yield models** are transparent rules; the anomaly detector is an IsolationForest fitted on a synthetic healthy baseline.
- **IPFS** CIDs are deterministic mocks (`IPFS_MODE=demo`).
- **No authentication**: role portals are open, and *Reset demo* / tamper endpoints are demo-only features — do not expose this deployment publicly.
- Sepolia integration is implemented but was not exercised against a live network during this revision.
