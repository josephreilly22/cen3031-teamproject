#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/../../src/frontend" && pwd)"
FRONTEND_PID_FILE="/tmp/cen3031-teamproject-frontend.pid"

# Kill anything already on port 3000
PORT_PID=$(lsof -ti:3000)
if [ -n "$PORT_PID" ]; then
  kill -9 $PORT_PID 2>/dev/null
  sleep 1
fi

# Start frontend
cd "$FRONTEND_DIR"
PORT=3000 BROWSER=none npm start &
echo $! > "$FRONTEND_PID_FILE"

# Open browser after frontend has time to start
sleep 6
open "http://localhost:3000"
