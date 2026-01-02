#!/bin/bash
# scripts/ollama-setup.sh
# Setup Ollama with recommended models for dogfood agent pipeline

set -e

echo "=========================================="
echo "  Dogfood Agent Setup - Ollama Models"
echo "=========================================="
echo ""

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Ollama not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ollama
    else
        curl -fsSL https://ollama.com/install.sh | sh
    fi
fi

# Start Ollama server if not running
if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "Starting Ollama server..."
    ollama serve &
    sleep 3
fi

echo ""
echo "Pulling recommended models..."
echo ""

# Core reasoning model
echo "[1/4] Pulling llama3.2 (reasoning, strategy)..."
ollama pull llama3.2

# Coding-focused model
echo "[2/4] Pulling qwen2.5-coder (code analysis)..."
ollama pull qwen2.5-coder

# Embedding model for RAG
echo "[3/4] Pulling nomic-embed-text (embeddings)..."
ollama pull nomic-embed-text

# Fast model for simple tasks
echo "[4/4] Pulling llama3.2:1b (fast classification)..."
ollama pull llama3.2:1b

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Available models:"
ollama list
echo ""
echo "Test with:"
echo "  ollama run llama3.2 'Hello, I am ready to help with job search!'"
echo ""
echo "Next steps:"
echo "  1. Run: dogfood analyze --path ~/Code --json --save"
echo "  2. Run: dogfood jobs --ingest data/sample-jobs.json"
echo "  3. Run: ./scripts/ollama-pipeline.sh"
