#!/bin/bash
# scripts/test-models.sh
# Test different Ollama models with dogfood for comparison

set -e

echo "=========================================="
echo "  Model Comparison Test"
echo "=========================================="
echo ""

# Models to test
MODELS=("llama3.2" "qwen2.5-coder" "mistral" "gemma2")

# Get a sample job match
echo "Getting job matches..."
MATCHES=$(dogfood match --json 2>/dev/null)
FIRST_JOB=$(echo "$MATCHES" | jq -r '.categories.qualified[0]')

if [ "$FIRST_JOB" == "null" ]; then
    echo "No job matches found. Run:"
    echo "  dogfood analyze --path ~/Code --json --save"
    echo "  dogfood jobs --ingest data/sample-jobs.json"
    exit 1
fi

JOB_ID=$(echo "$FIRST_JOB" | jq -r '.id')
COMPANY=$(echo "$FIRST_JOB" | jq -r '.company')
TITLE=$(echo "$FIRST_JOB" | jq -r '.title')

echo "Test job: $COMPANY - $TITLE"
echo ""

# Test prompt
TEST_PROMPT="Given this job match, write a 2-sentence summary of why this candidate is a good fit:

$FIRST_JOB

Be concise and specific."

# Test each model
for MODEL in "${MODELS[@]}"; do
    echo "----------------------------------------"
    echo "Testing: $MODEL"
    echo "----------------------------------------"

    # Check if model is available
    if ! ollama list 2>/dev/null | grep -q "$MODEL"; then
        echo "  ⚠ Model not installed. Run: ollama pull $MODEL"
        continue
    fi

    # Time the response
    START=$(date +%s.%N)
    RESPONSE=$(echo "$TEST_PROMPT" | ollama run "$MODEL" 2>/dev/null)
    END=$(date +%s.%N)
    DURATION=$(echo "$END - $START" | bc)

    echo "Response ($DURATION seconds):"
    echo "$RESPONSE" | head -5
    echo ""
done

echo "=========================================="
echo "  Test Complete"
echo "=========================================="
echo ""
echo "To pull missing models:"
for MODEL in "${MODELS[@]}"; do
    if ! ollama list 2>/dev/null | grep -q "$MODEL"; then
        echo "  ollama pull $MODEL"
    fi
done
