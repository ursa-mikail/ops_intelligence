#!/usr/bin/env bash
set -euo pipefail
echo ""
echo "╔══════════════════════════════════════╗"
echo "║   OPS INTELLIGENCE PLATFORM v2.0    ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Free ports
for port in 3000 8080 5432; do
  pids=$(lsof -ti tcp:$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  ⚠️  Freeing port $port..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 0.5
  fi
done

echo "🔨 Building images..."
docker compose down --remove-orphans --timeout 5 2>/dev/null || true
docker compose build

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Waiting for services to be healthy..."
timeout 60 bash -c 'until docker compose ps | grep -q "healthy"; do sleep 2; done' 2>/dev/null || true
sleep 3

echo ""
echo "✅ All services running:"
echo ""
echo "   🌐  Frontend  →  http://localhost:3000"
echo "   ⚙️   Backend   →  http://localhost:8080"
echo "   🐘  Postgres  →  localhost:5432"
echo ""
echo "   💡 Tip: Type in the search box to see real-time DB autocomplete"
echo "   📊 Click 'Intelligence Reports' for full analytics dashboard"
echo ""
echo "📋 Logs: docker compose logs -f"
echo ""
