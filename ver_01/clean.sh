#!/usr/bin/env bash
set -euo pipefail
echo "🧹 Full clean — removing containers, volumes, images..."

docker compose down --remove-orphans --volumes 2>/dev/null || true
docker rmi ops-intelligence-frontend ops-intelligence-backend 2>/dev/null || true

# Free ports
for port in 3000 8080 5432; do
  pid=$(lsof -ti tcp:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "  Freeing port $port"
    kill -9 $pid 2>/dev/null || true
  fi
done

echo "✅ Clean complete. Run ./up.sh to start fresh."
