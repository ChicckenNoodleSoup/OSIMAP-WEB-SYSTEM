#!/bin/bash
for port in 3000 3002 5000; do
  if lsof -ti :$port > /dev/null 2>&1; then
    lsof -ti :$port | xargs kill -9
    echo "✅ Killed port $port"
  else
    echo "⚠️  Port $port not in use"
  fi
done
