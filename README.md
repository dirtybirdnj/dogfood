# 🦴 Dogfood

**Eat your own dogfood.** Analyze your skills from local codebases, find matching jobs, and generate tailored applications.

## What It Does

Dogfood is a TUI (Terminal User Interface) tool that:

1. **Analyzes your code** - Scans local repositories to build a skills profile (languages, frameworks, patterns)
2. **Ingests job data** - Import job listings from JSON files you curate
3. **Matches jobs to skills** - Shows jobs you WANT, jobs you're QUALIFIED for, and STRETCH opportunities
4. **Generates applications** - Creates tailored resume and cover letter prompts for each job

## Philosophy

- **Local-first**: All code analysis happens locally. No sending your code anywhere.
- **You curate your bowl**: Keep your projects in one directory (`~/Code`), `git pull` to refresh them
- **Respect rate limits**: Instead of hammering job boards, you manually scrape and feed JSON
- **LLM-flexible**: Use clipboard mode, local Ollama, or API providers - your choice

## Installation

```bash
cd dogfood
npm install
npm link  # Makes 'dogfood' available globally
```

## Usage

```bash
# Launch the TUI
dogfood

# Or go directly to a screen
dogfood analyze
dogfood skills
dogfood jobs
dogfood match
dogfood generate
```

## Workflow

### 1. Analyze Your Repos

Run `dogfood` from your code directory (e.g., `~/Code`):

```
┌─────────────────────────────────────────────┐
│  Repository: gellyscape                     │
│  Last commit: 3 days ago                    │
│  Status: ✓ Fresh                            │
│─────────────────────────────────────────────│
│  Languages:  TypeScript (68%), CSS (22%)    │
│  Frameworks: React, Phaser, D3.js           │
│  Patterns:   Game dev, Data viz             │
└─────────────────────────────────────────────┘
  [i] Include  [e] Exclude  [s] Skip  [f] Finish
```

Walk through repos one at a time. Include the ones that represent your skills.

### 2. Import Jobs

Create a JSON file with job listings:

```json
[
  {
    "title": "Senior Frontend Developer",
    "company": "Acme Corp",
    "location": "Remote",
    "url": "https://acme.com/jobs/123",
    "description": "We're looking for a React expert...",
    "skills": ["react", "typescript", "graphql"],
    "salary": "$140k-$180k"
  }
]
```

Import via the TUI or command line:
```bash
dogfood --ingest jobs.json
```

### 3. Set Preferences

In the Skills screen, mark skills you:
- **Want to use** (★) - Prioritize jobs with these
- **Want to avoid** (✗) - Deprioritize jobs with these

### 4. Match Jobs

Jobs are categorized into:
- **Want**: Match your preferences AND you're qualified
- **Qualified**: You have the skills, but may not match preferences
- **Stretch**: Partial skill match - growth opportunities

### 5. Generate Applications

Select a job and generate:
- Tailored resume (emphasizes matching skills)
- Personalized cover letter

Supports multiple backends:
- **Clipboard**: Copy prompt, paste into any LLM
- **Ollama**: Local LLM (llama3.2, etc.)
- **Anthropic**: Claude API
- **OpenAI**: GPT API

## Data Storage

All data is stored in `~/.dogfood/`:
```
~/.dogfood/
├── config.json          # Settings and state
├── skills.json          # Your analyzed skills profile
├── jobs.json            # Imported job listings
└── applications/        # Generated resumes/cover letters
    └── company-title/
        ├── resume.md
        └── cover-letter.md
```

## Scraping Tips

Instead of automated scraping (which hits rate limits), consider:

1. **Browser DevTools**: Inspect network requests, copy job data
2. **Bookmarklets**: Create a bookmarklet that extracts job info to JSON
3. **Manual curation**: Save interesting jobs to a JSON file daily

Example bookmarklet for extracting job data:
```javascript
javascript:(function(){
  const job = {
    title: document.querySelector('h1')?.innerText,
    company: document.querySelector('.company')?.innerText,
    url: window.location.href
  };
  console.log(JSON.stringify(job, null, 2));
})();
```

## Job JSON Schema

Required fields:
- `title` (string): Job title
- `company` (string): Company name

Optional fields:
- `url` (string): Link to job posting
- `description` (string): Full job description
- `skills` (array): Required skills
- `location` (string): Job location
- `salary` (string): Salary range
- `type` (string): "full-time", "contract", etc.
- `remote` (boolean): Is remote work available
- `source` (string): Where you found this job

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Q` | Quit |
| `Esc` | Go back |
| `Enter` | Select |
| `j/k` or `↑/↓` | Navigate |
| `1-3` | Switch categories (in match view) |

## LLM Configuration

### Clipboard Mode (Default)
No setup needed. Prompts are copied to clipboard for manual LLM use.

### Ollama (Local)
```bash
# Install Ollama
brew install ollama

# Pull a model
ollama pull llama3.2

# Start the server
ollama serve
```

Then select "Ollama" in Settings.

### API Providers
Add your API key in Settings. Keys are stored locally in `~/.dogfood/config.json`.

## Tech Stack

- **Ink** - React for CLI (modern, component-based TUI)
- **Node.js** - Runtime
- **Local Git** - Repository analysis (no network required)

## Why "Dogfood"?

"Eating your own dogfood" means using your own product. This tool:
1. Analyzes code to find skills
2. Matches those skills to jobs
3. Helps you get a job... potentially building tools like this

It's meta. It's practical. It's dogfood.

## License

MIT
