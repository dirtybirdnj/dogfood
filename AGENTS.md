# Agent Integration Guide

This document describes how AI agents can use Dogfood programmatically for job search automation.

## Quick Start for Agents

Dogfood provides a non-interactive CLI that outputs JSON for easy parsing:

```bash
# All agentic commands use --json flag
dogfood <command> --json
```

## Available Commands

### 1. Analyze Code Repositories

Extract skills profile from local git repositories.

```bash
# Analyze current directory
dogfood analyze --json

# Analyze specific path and save profile
dogfood analyze --path ~/Code --json --save

# Quiet mode (suppress stderr)
dogfood analyze --path ~/Code --json --save --quiet
```

**Output:**
```json
{
  "success": true,
  "path": "/Users/example/Code",
  "reposFound": 25,
  "reposAnalyzed": 25,
  "profile": {
    "languages": { "TypeScript": {...}, "Python": {...} },
    "frameworks": { "React": {...}, "Node.js": {...} },
    "patterns": ["testing", "ci-cd", "docker"]
  },
  "repos": [
    { "name": "project-a", "languages": [...], "commits": 150 }
  ]
}
```

### 2. Manage Jobs

Import and list job postings.

```bash
# Import jobs from JSON file
dogfood jobs --ingest /path/to/jobs.json

# List all imported jobs
dogfood jobs --list --json

# Get job stats
dogfood jobs --json
```

**Job JSON Schema:**
```json
[
  {
    "title": "Senior Developer",        // required
    "company": "Acme Corp",             // required
    "url": "https://...",               // optional
    "description": "Full description",  // optional
    "skills": ["react", "typescript"],  // optional
    "location": "Remote",               // optional
    "salary": "$150k-$180k",            // optional
    "remote": true,                     // optional
    "type": "full-time"                 // optional
  }
]
```

### 3. View Skills Profile

```bash
# Summary view
dogfood skills --json

# Detailed view
dogfood skills --list --json
```

### 4. Match Jobs to Skills

```bash
dogfood match --json
```

**Output:**
```json
{
  "success": true,
  "totalJobs": 10,
  "matched": 10,
  "categories": {
    "want": [...],      // Match skills AND preferences
    "qualified": [...], // Match skills
    "stretch": [...]    // Partial match
  }
}
```

### 5. Generate Application Prompts

```bash
# Generate both resume and cover letter prompts
dogfood generate --job <id> --json

# Generate only resume
dogfood generate --job <id> --type resume --json

# Generate only cover letter
dogfood generate --job <id> --type cover --json
```

**Job ID formats accepted:**
- Full ID: `beta-technologies-senior-full-stack-deve-59be50`
- Partial match: `beta-technologies`
- Company name: `"BETA Technologies"`

### 6. Get Tool Schema (for MCP/LLM)

```bash
dogfood --help --json
```

Returns machine-readable tool definitions for function calling.

---

## Multi-Agent Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DOGFOOD AGENT PIPELINE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PHASE 1: DISCOVERY                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Browser    │    │  Scraper    │    │  Research   │             │
│  │  Agent      │───▶│  Agent      │───▶│  Agent      │             │
│  │             │    │             │    │             │             │
│  │ Find jobs   │    │ Extract to  │    │ Company     │             │
│  │ on boards   │    │ JSON format │    │ context     │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│         │                  │                  │                     │
│         └──────────────────┼──────────────────┘                     │
│                            ▼                                        │
│                 ┌─────────────────────┐                             │
│                 │ dogfood jobs        │                             │
│                 │ --ingest jobs.json  │                             │
│                 └─────────────────────┘                             │
│                                                                     │
│  PHASE 2: ANALYSIS                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ dogfood     │    │ dogfood     │    │  Reasoning  │             │
│  │ analyze     │───▶│ match       │───▶│  Agent      │             │
│  │ --json      │    │ --json      │    │             │             │
│  │ --save      │    │             │    │ Rank &      │             │
│  └─────────────┘    └─────────────┘    │ prioritize  │             │
│                                        └─────────────┘             │
│                                               │                     │
│  PHASE 3: GENERATION                          ▼                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ dogfood     │    │  Writing    │    │  Human      │             │
│  │ generate    │───▶│  Agent      │───▶│  Review     │             │
│  │ --job <id>  │    │             │    │             │             │
│  │ --json      │    │ Polish &    │    │ Final       │             │
│  └─────────────┘    │ personalize │    │ approval    │             │
│                     └─────────────┘    └─────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Agent Types by Role

### Search & Discovery Agents

| Agent Type | Tools | Purpose |
|------------|-------|---------|
| **Browser Agent** | Playwright, Puppeteer, Selenium | Navigate job boards, handle auth |
| **Scraper Agent** | Firecrawl, Crawl4AI, BeautifulSoup | Extract structured job data |
| **API Agent** | SerpAPI, Indeed API, LinkedIn API | Query job aggregators |
| **Research Agent** | Perplexity, Tavily, web search | Company research, tech stack info |

### Analysis & Reasoning Agents

| Agent Type | Models | Purpose |
|------------|--------|---------|
| **Skills Analyzer** | Local LLM (Llama, Qwen) | Parse dogfood output, identify gaps |
| **Match Evaluator** | Claude, GPT-4 | Deep analysis of job fit |
| **Strategy Agent** | Claude Opus | Prioritization, career advice |
| **Code Reviewer** | Claude Code, Cursor | Analyze actual codebase for skills |

### Generation & Writing Agents

| Agent Type | Models | Purpose |
|------------|--------|---------|
| **Resume Writer** | Claude, GPT-4 | Craft tailored resumes |
| **Cover Letter Writer** | Claude | Personalized cover letters |
| **Email Composer** | GPT-4, Claude | Outreach, follow-ups |
| **Portfolio Curator** | Local LLM | Select relevant projects |

---

## Recommended Agent Configurations

### 1. Privacy-First Local Setup

All processing happens locally. No data sent to cloud APIs.

```yaml
# config/local-agents.yaml
pipeline:
  analyzer:
    model: ollama/llama3.2
    tools:
      - dogfood analyze --json --save
      - dogfood match --json

  generator:
    model: ollama/qwen2.5-coder
    tools:
      - dogfood generate --job {id} --json

  reviewer:
    model: ollama/llama3.2
    prompt: "Review and improve this resume for {company}"
```

**Setup:**
```bash
# Install Ollama
brew install ollama

# Pull models
ollama pull llama3.2
ollama pull qwen2.5-coder
ollama pull nomic-embed-text  # For RAG

# Start server
ollama serve
```

### 2. Hybrid Setup (Local Analysis + Cloud Generation)

Analyze locally for privacy, use cloud for high-quality generation.

```yaml
# config/hybrid-agents.yaml
pipeline:
  # Local - your code never leaves your machine
  analyzer:
    model: ollama/llama3.2
    tools:
      - dogfood analyze --path ~/Code --json --save

  # Local - job matching is fast
  matcher:
    model: ollama/llama3.2
    tools:
      - dogfood match --json

  # Cloud - best quality for final output
  generator:
    model: anthropic/claude-sonnet
    tools:
      - dogfood generate --job {id} --json
    post_process: true  # LLM refines the output
```

### 3. Multi-Agent Crew (CrewAI)

Specialized agents with defined roles.

```python
# config/crewai_config.py
from crewai import Agent, Task, Crew

# Agent definitions
researcher = Agent(
    role="Job Researcher",
    goal="Find high-quality job opportunities matching the candidate profile",
    backstory="Expert at finding hidden job opportunities",
    tools=[BrowserTool(), FirecrawlTool()],
    llm="gpt-4o"
)

analyst = Agent(
    role="Skills Analyst",
    goal="Evaluate job fit and identify skill gaps",
    backstory="Technical recruiter with deep understanding of tech roles",
    tools=[DogfoodCLI()],  # Wrapper for dogfood commands
    llm="ollama/llama3.2"  # Local for privacy
)

strategist = Agent(
    role="Career Strategist",
    goal="Prioritize opportunities and plan application strategy",
    backstory="Career coach specializing in tech transitions",
    tools=[],
    llm="claude-sonnet"
)

writer = Agent(
    role="Application Writer",
    goal="Create compelling, tailored application materials",
    backstory="Professional resume writer and copywriter",
    tools=[DogfoodCLI()],
    llm="claude-sonnet"
)
```

### 4. Workflow Automation (n8n/Pipedream)

Schedule automated job discovery and matching.

```json
{
  "name": "Daily Job Search",
  "schedule": "0 9 * * *",
  "steps": [
    {
      "name": "Scrape Jobs",
      "type": "http",
      "config": {
        "url": "https://api.firecrawl.dev/scrape",
        "body": { "urls": ["https://linkedin.com/jobs/..."] }
      }
    },
    {
      "name": "Ingest to Dogfood",
      "type": "shell",
      "command": "dogfood jobs --ingest /tmp/jobs.json"
    },
    {
      "name": "Match Jobs",
      "type": "shell",
      "command": "dogfood match --json > /tmp/matches.json"
    },
    {
      "name": "Notify",
      "type": "slack",
      "message": "Found {{matches.categories.want.length}} matching jobs!"
    }
  ]
}
```

---

## Example: Complete Ollama Pipeline

```bash
#!/bin/bash
# scripts/ollama-job-search.sh

# Step 1: Analyze your code (runs locally, private)
echo "Analyzing your repositories..."
dogfood analyze --path ~/Code --json --save --quiet

# Step 2: Get matches
echo "Matching against imported jobs..."
MATCHES=$(dogfood match --json)

# Step 3: Ask Ollama to rank them
echo "Asking Ollama to prioritize..."
RANKED=$(echo "$MATCHES" | ollama run llama3.2 "
You are a career advisor. Given these job matches, rank the top 3
based on career growth potential and skill alignment.
Return only the job IDs in order, one per line.

$MATCHES
")

# Step 4: Generate applications for top matches
for JOB_ID in $RANKED; do
  echo "Generating application for $JOB_ID..."
  PROMPTS=$(dogfood generate --job "$JOB_ID" --json)

  # Have Ollama refine the resume
  echo "$PROMPTS" | jq -r '.prompts.resume' | ollama run llama3.2 > "applications/${JOB_ID}-resume.md"
done

echo "Done! Check applications/ folder"
```

---

## Data Locations

| File | Purpose |
|------|---------|
| `~/.dogfood/config.json` | Settings, preferences, API keys |
| `~/.dogfood/skills.json` | Analyzed skills profile |
| `~/.dogfood/jobs.json` | Imported job listings |
| `~/.dogfood/applications/` | Generated materials |

---

## Tips for Agent Developers

1. **Always use `--json` flag** - Ensures parseable output
2. **Use `--quiet` for pipelines** - Suppresses stderr progress messages
3. **Job IDs support partial matching** - `beta` matches `beta-technologies-...`
4. **Skills profile persists** - Run `analyze --save` once, then just `match`
5. **Batch operations** - Ingest multiple job files, they accumulate
6. **Error handling** - Failed commands return `{"success": false, "error": "..."}`

---

## Future Integrations

Planned features for agent integration:

- [ ] WebSocket server mode for real-time agent communication
- [ ] MCP server implementation for Claude Desktop
- [ ] LangChain tool wrapper
- [ ] CrewAI tool class
- [ ] OpenAI function calling schema
- [ ] Streaming output for long operations

---

## Support

- Tool schema: `dogfood --help --json`
- MCP tools: `data/mcp-tools.json`
- Example jobs: `data/sample-jobs.json`
