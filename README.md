# Watchtower NOC Dashboard

Self-hosted Network Operations Center dashboard providing real-time visualization and monitoring of network infrastructure.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Interactive Topology Canvas** - Draggable network nodes with automatic position persistence
- **Real-time Monitoring** - WebSocket-based live updates for device status, alerts, and metrics
- **LibreNMS Integration** - Device status, health metrics, interface statistics, CDP/LLDP discovery
- **Proxmox Integration** - VM/container monitoring with CPU and memory stats
- **Auto-Discovery** - Automatic topology building from CDP/LLDP neighbor data
- **Speedtest Widget** - Scheduled internet speed testing with CSV logging
- **Alert Management** - Real-time alerts with severity levels and toast notifications

## Quick Start

### Production (Proxmox LXC)

Deploy directly to Proxmox with a single command:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/solomonneas/watchtower/main/install/create-lxc.sh)
```

### Development

```bash
# Backend (Terminal 1)
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Terminal 2)
cd frontend && npm install
npm run dev -- --host
```

Open http://localhost:5173

**Note:** Local development requires Redis running. LibreNMS/Proxmox integrations require network access to those services.

## Tech Stack

**Backend:** FastAPI, Redis, httpx, APScheduler, bcrypt, PyJWT, Pydantic

**Frontend:** Vite, React 18, React Flow (@xyflow/react), Tailwind CSS, Recharts, Zustand

**Infrastructure:** Proxmox LXC (Ubuntu 24.04), Nginx, systemd

## Configuration

Copy example configs and customize:

```bash
cp config/config.example.yaml config/config.yaml
cp config/topology.example.yaml config/topology.yaml
```

- `config/config.yaml` - Credentials for LibreNMS, Proxmox, notifications
- `config/topology.yaml` - Network topology definitions (or use auto-discovery)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/topology | Full topology with live data |
| GET | /api/devices | All devices with status |
| GET | /api/device/{id} | Single device details |
| GET | /api/alerts | Active alerts |
| GET | /api/vms | Proxmox VMs with metrics |
| GET | /api/speedtest | Latest speedtest result |
| POST | /api/speedtest/trigger | Run manual speedtest |
| GET | /api/speedtest/export | Download speedtest CSV |
| GET | /api/discovery/preview | Preview auto-discovered devices |
| POST | /api/discovery/sync | Sync discovered devices to topology |
| GET | /api/diagnostics/scheduler | View polling job status |
| POST | /api/diagnostics/poll/now | Trigger immediate poll |
| WS | /ws/updates | Real-time event stream |

## Polling Schedule

| Data | Interval | Description |
|------|----------|-------------|
| Device Status | 30s | Up/down state, uptime |
| Interfaces | 60s | Port statistics, utilization |
| Health | 60s | CPU/memory metrics |
| Proxmox | 60s | Node and VM stats |
| Alerts | 30s | Active alert status |
| CDP/LLDP Links | 5min | Neighbor discovery |
| Speedtest | 15min | Internet speed (if enabled) |

## WebSocket Events

```json
{"type": "device_status_change", "changes": [...]}
{"type": "new_alerts", "alerts": [...]}
{"type": "alerts_resolved", "alert_ids": [...]}
{"type": "speedtest_result", "result": {...}}
```

## Project Status

**Phases 1-6 Complete:**
- Core dashboard with interactive topology canvas
- LibreNMS integration (devices, health, interfaces, alerts)
- Proxmox VM monitoring
- Real-time WebSocket updates
- CDP/LLDP auto-discovery
- Speedtest widget with CSV logging

**Upcoming:**
- Phase 7: Authentication (JWT login, protected routes)
- Phase 8: Settings modal UI

## License

MIT
