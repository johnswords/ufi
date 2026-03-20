#!/usr/bin/env bash
set -euo pipefail

PID_FILE=".ufi-demo.pid"
PORT="${PORT:-3000}"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping UFI MedEnt demo (PID $PID)..."
    kill "$PID" 2>/dev/null
    # Wait up to 5 seconds for graceful shutdown
    for i in $(seq 1 5); do
      if ! kill -0 "$PID" 2>/dev/null; then
        break
      fi
      sleep 1
    done
    # Force kill if still running
    if kill -0 "$PID" 2>/dev/null; then
      kill -9 "$PID" 2>/dev/null
    fi
    echo "Stopped."
  else
    echo "Process $PID not running (stale PID file)."
  fi
  rm -f "$PID_FILE"
else
  # Fallback: kill anything on the port
  PIDS=$(lsof -ti:"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "No PID file found. Killing process(es) on port $PORT..."
    echo "$PIDS" | xargs kill -9 2>/dev/null
    echo "Stopped."
  else
    echo "UFI MedEnt demo is not running."
  fi
fi
