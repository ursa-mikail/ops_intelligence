# OPS INTELLIGENCE PLATFORM

A real-time operations intelligence dashboard with full-stack search, autocomplete, compliance reporting, and strategic analytics.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript + React 18 + Vite |
| Backend | Go 1.22 + Chi router + WebSockets |
| Database | PostgreSQL 16 with rich seed data |
| Infra | Docker Compose |

## Features

- **Real-time autocomplete** from DB via WebSocket
- **Checklist search** — retain and combine multiple search terms
- **Smart result cards** — sorted by match count, grayed where no match
- **Compliance Heatmap** — SOC2, HIPAA, GDPR readiness + remediation
- **Cost Intelligence** — compute/storage/platform/monitoring/network
- **Incident Analytics** — time-series charts of frequency and intensity
- **CVE Vulnerability List** — filterable, sortable, exportable
- **System Drift Tracker** — location, what changed, delta stats
- **Team Dynamics** — performance metrics and human factors
- **Top Risks, Gaps, Blockers** — executive risk board
- **Deliverables & Upgrades** — system update tracking
- **Predictive Analytics** — trend forecasting
- **CSV Export** — every category downloadable

## Quick Start

```bash
./up.sh      # Build, seed DB, start all services
./down.sh    # Stop services
./clean.sh   # Full clean (volumes, images, containers, ports)
```

## Ports

| Service | Port |
|---------|------|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

## Project Structure

```
ops-intelligence/
├── README.md
├── docker-compose.yml
├── up.sh / down.sh / clean.sh
├── frontend/          # TypeScript React Vite app
│   └── src/
│       ├── components/search/     # Autocomplete + checklist
│       ├── components/dashboard/  # Summary boxes + cards
│       └── components/reporting/  # All report tabs
├── backend/           # Go Chi API + WebSocket server
│   └── internal/
│       ├── db/        # Postgres queries
│       ├── handlers/  # HTTP + WS handlers
│       └── models/    # Data models
└── db/
    ├── migrations/    # Schema SQL
    └── seeds/         # Rich seed data
```
