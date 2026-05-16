#!/usr/bin/env bash
set -euo pipefail
echo "🛑 Stopping OPS INTELLIGENCE PLATFORM..."
docker compose down --remove-orphans
echo "✅ All services stopped."
