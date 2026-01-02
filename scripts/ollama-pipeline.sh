#!/bin/bash
# scripts/ollama-pipeline.sh
# Complete job search pipeline using Ollama models locally

set -e

# Configuration
CODE_PATH="${CODE_PATH:-$HOME/Code}"
MODEL="${MODEL:-llama3.2}"
OUTPUT_DIR="${OUTPUT_DIR:-$HOME/.dogfood/applications}"
TOP_N="${TOP_N:-3}"

echo "=========================================="
echo "  Dogfood + Ollama Job Search Pipeline"
echo "=========================================="
echo ""
echo "Config:"
echo "  Code path: $CODE_PATH"
echo "  Model: $MODEL"
echo "  Output: $OUTPUT_DIR"
echo "  Top jobs: $TOP_N"
echo ""

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Check Ollama is running
if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "ERROR: Ollama not running. Start with: ollama serve"
    exit 1
fi

# Step 1: Analyze repositories
echo "[Step 1/5] Analyzing code repositories..."
SKILLS=$(dogfood analyze --path "$CODE_PATH" --json --save --quiet 2>/dev/null)
REPO_COUNT=$(echo "$SKILLS" | jq -r '.reposAnalyzed')
echo "  ✓ Analyzed $REPO_COUNT repositories"
echo ""

# Step 2: Get job matches
echo "[Step 2/5] Matching jobs to skills..."
MATCHES=$(dogfood match --json 2>/dev/null)
TOTAL_JOBS=$(echo "$MATCHES" | jq -r '.totalJobs')
WANT_COUNT=$(echo "$MATCHES" | jq -r '.categories.want | length')
QUALIFIED_COUNT=$(echo "$MATCHES" | jq -r '.categories.qualified | length')
echo "  ✓ Found $TOTAL_JOBS jobs"
echo "    - Want: $WANT_COUNT"
echo "    - Qualified: $QUALIFIED_COUNT"
echo ""

# Step 3: Ask Ollama to prioritize
echo "[Step 3/5] Asking $MODEL to prioritize jobs..."
PRIORITY_PROMPT="You are a career advisor helping a software developer find their next role.

Given these job matches, select the top $TOP_N jobs to apply for.
Consider: skill alignment, career growth potential, compensation, and company quality.

JOB MATCHES:
$MATCHES

INSTRUCTIONS:
1. Analyze each job against the candidate's skills
2. Select exactly $TOP_N jobs
3. Return ONLY the job IDs, one per line, in priority order
4. No explanations, just IDs

Example output format:
company-title-abc123
another-company-role-def456
third-company-position-ghi789"

TOP_JOBS=$(echo "$PRIORITY_PROMPT" | ollama run "$MODEL" 2>/dev/null | grep -E '^[a-z]' | head -n "$TOP_N")
echo "  ✓ Top $TOP_N jobs selected:"
echo "$TOP_JOBS" | while read -r job; do
    TITLE=$(echo "$MATCHES" | jq -r --arg id "$job" '.categories.qualified[] | select(.id | contains($id)) | "\(.company) - \(.title)"' 2>/dev/null || echo "$job")
    echo "    - $TITLE"
done
echo ""

# Step 4: Generate applications
echo "[Step 4/5] Generating applications..."
JOB_NUM=1
echo "$TOP_JOBS" | while read -r JOB_ID; do
    if [ -z "$JOB_ID" ]; then continue; fi

    echo "  [$JOB_NUM] Generating for: $JOB_ID"

    # Get prompts from dogfood
    PROMPTS=$(dogfood generate --job "$JOB_ID" --json 2>/dev/null)

    if [ "$(echo "$PROMPTS" | jq -r '.success')" != "true" ]; then
        echo "    ⚠ Could not find job: $JOB_ID"
        continue
    fi

    COMPANY=$(echo "$PROMPTS" | jq -r '.job.company')
    TITLE=$(echo "$PROMPTS" | jq -r '.job.title')
    SAFE_NAME=$(echo "${COMPANY}-${TITLE}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
    JOB_DIR="$OUTPUT_DIR/$SAFE_NAME"
    mkdir -p "$JOB_DIR"

    # Extract and save raw prompts
    echo "$PROMPTS" | jq -r '.prompts.resume' > "$JOB_DIR/resume-prompt.txt"
    echo "$PROMPTS" | jq -r '.prompts.coverLetter' > "$JOB_DIR/cover-letter-prompt.txt"

    # Generate resume with Ollama
    echo "    → Generating resume with $MODEL..."
    RESUME_PROMPT=$(cat "$JOB_DIR/resume-prompt.txt")
    echo "$RESUME_PROMPT" | ollama run "$MODEL" 2>/dev/null > "$JOB_DIR/resume.md"

    # Generate cover letter with Ollama
    echo "    → Generating cover letter with $MODEL..."
    COVER_PROMPT=$(cat "$JOB_DIR/cover-letter-prompt.txt")
    echo "$COVER_PROMPT" | ollama run "$MODEL" 2>/dev/null > "$JOB_DIR/cover-letter.md"

    echo "    ✓ Saved to: $JOB_DIR"
    JOB_NUM=$((JOB_NUM + 1))
done
echo ""

# Step 5: Summary
echo "[Step 5/5] Pipeline complete!"
echo ""
echo "=========================================="
echo "  Results"
echo "=========================================="
echo ""
echo "Applications generated in: $OUTPUT_DIR"
echo ""
ls -la "$OUTPUT_DIR" 2>/dev/null | tail -n +2
echo ""
echo "Next steps:"
echo "  1. Review generated resumes and cover letters"
echo "  2. Edit and personalize as needed"
echo "  3. Apply to jobs!"
echo ""
echo "To regenerate with different model:"
echo "  MODEL=qwen2.5-coder ./scripts/ollama-pipeline.sh"
