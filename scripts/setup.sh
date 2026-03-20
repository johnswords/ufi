#!/usr/bin/env bash
set -euo pipefail

echo "=== UFI MedEnt — Setup ==="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: node is required. Install via nvm or brew."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required. Run: npm install -g pnpm"; exit 1; }
command -v ollama >/dev/null 2>&1 || { echo "Warning: ollama not found. Install from https://ollama.com for LLM extraction."; }

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Check Ollama model
if command -v ollama >/dev/null 2>&1; then
  if ollama list 2>/dev/null | grep -q "glm-4.7-flash"; then
    echo "Ollama model glm-4.7-flash found."
  else
    echo "Pulling Ollama model glm-4.7-flash (19GB)..."
    echo "You can skip this and set OLLAMA_MODEL to use a different model."
    ollama pull glm-4.7-flash:latest || echo "Warning: Failed to pull model. Set OLLAMA_MODEL env var to use a different model."
  fi
fi

# Type check
echo "Type-checking..."
pnpm typecheck

echo ""
echo "Setup complete. Run ./scripts/start.sh to start the web demo."
echo "Or run: pnpm test to verify everything works."
