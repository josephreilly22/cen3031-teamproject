#!/bin/bash
FRONTEND_PID_FILE="/tmp/cen3031-teamproject-frontend.pid"
BACKEND_PID_FILE="/tmp/cen3031-teamproject-backend.pid"

# Stop frontend via PID file
if [ -f "$FRONTEND_PID_FILE" ]; then
  FRONTEND_PID=$(cat "$FRONTEND_PID_FILE" | tr -d '[:space:]')
  if [[ "$FRONTEND_PID" =~ ^[0-9]+$ ]]; then
    kill -9 "$FRONTEND_PID" 2>/dev/null
  fi
  rm "$FRONTEND_PID_FILE"
fi

# Stop backend via PID file
if [ -f "$BACKEND_PID_FILE" ]; then
  BACKEND_PID=$(cat "$BACKEND_PID_FILE" | tr -d '[:space:]')
  if [[ "$BACKEND_PID" =~ ^[0-9]+$ ]]; then
    kill -9 "$BACKEND_PID" 2>/dev/null
  fi
  rm "$BACKEND_PID_FILE"
fi

# Fallback: kill by port
PORT_PID=$(lsof -ti:3000)
[ -n "$PORT_PID" ] && kill -9 $PORT_PID 2>/dev/null

BACKEND_PORT_PID=$(lsof -ti:8000)
[ -n "$BACKEND_PORT_PID" ] && kill -9 $BACKEND_PORT_PID 2>/dev/null
