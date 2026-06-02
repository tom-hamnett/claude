#!/bin/bash
echo "=== APEX PMO Starting ==="

cd /workspaces/claude 2>/dev/null || cd /home/user/claude

# Pull latest
git pull origin claude/setup-react-area-chart-RBJ8C 2>/dev/null

# Install deps if needed
[ -d node_modules ] || npm install

# Build frontend
npm run build 2>/dev/null

# Kill any existing server
pkill -f "node server/index.js" 2>/dev/null
sleep 1

# Start server in background
node server/index.js &
SERVER_PID=$!

# Wait for server to be ready
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s http://localhost:3001/api/programmes > /dev/null 2>&1; then
    echo "=== Server ready ==="
    break
  fi
  sleep 1
done

# Reclassify documents
echo "=== Reclassifying documents ==="
curl -s -X POST http://localhost:3001/api/programmes/ihg-pe/document-texts/reclassify 2>/dev/null
echo ""

echo "=== APEX PMO running on port 3001 ==="
echo "=== PID: $SERVER_PID ==="

# Keep running
wait $SERVER_PID
