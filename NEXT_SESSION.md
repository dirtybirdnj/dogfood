# Next Session: Test & Generate Resumes

**Goal:** Get Dogfood running, analyze your repos, and generate resumes today.

---

## Quick Start (5 minutes)

```bash
cd ~/Code/dogfood
npm install
npm start
```

This builds and launches the TUI. You should see a welcome screen with menu options.

---

## Step-by-Step Workflow

### 1. Analyze Your Repositories (~5 min)

From the TUI menu, select **Analyze Repos** (or run `npm start -- analyze`)

- Enter your code directory path (likely `~/Code`)
- The app will scan for git repos and analyze each one
- For each repo, you'll see: languages, frameworks, commit history, patterns
- Select repos that represent YOUR skills (skip forks/tutorials you didn't write)

**What gets saved:** Skills profile at `~/.dogfood/skills.json`

---

### 2. Import Jobs (~2 min)

From the TUI menu, select **Manage Jobs** (or run `npm start -- jobs`)

**Option A: Use sample jobs**
```bash
# The sample jobs are already in data/sample-jobs.json
# Import them through the TUI
```

**Option B: Create your own jobs file**
Create a JSON file with jobs you're actually applying to:
```json
[
  {
    "title": "Senior Developer",
    "company": "Company Name",
    "url": "https://...",
    "description": "Job description here...",
    "skills": ["react", "typescript", "node.js"],
    "salary": "$150k-$180k",
    "remote": true
  }
]
```

Minimal required fields: `title` and `company`

---

### 3. Set Preferences (Optional, ~1 min)

From the TUI menu, select **Settings**

- Set skills you WANT to use (e.g., "react", "typescript")
- Set skills you want to AVOID (e.g., "php", "java")
- This affects job matching categories

---

### 4. Match Jobs (~1 min)

From the TUI menu, select **Match Jobs** (or run `npm start -- match`)

Jobs are categorized into:
- **Want** - Matches your skills AND preferences
- **Qualified** - You have the skills but may not match preferences
- **Stretch** - Partial match, growth opportunities

---

### 5. Generate Applications (~2 min per job)

From the TUI menu, select **Generate Applications** (or run `npm start -- generate`)

1. Select a job from your matches
2. Choose what to generate: Resume, Cover Letter, or Both
3. Choose LLM method:
   - **Clipboard** (default) - Copies prompt, paste into Claude/ChatGPT
   - **Ollama** - Uses local LLM (must have Ollama running with llama3.2)
   - **Anthropic** - Uses Claude API (requires API key in settings)
   - **OpenAI** - Uses GPT API (requires API key in settings)

**Output saved to:** `~/.dogfood/applications/{company}-{title}/`

---

## Fastest Path to Resume Generation

If you just want to generate resumes ASAP:

```bash
cd ~/Code/dogfood
npm install && npm start
```

1. **Analyze** - Point to `~/Code`, accept defaults, let it scan
2. **Jobs** - Import `data/sample-jobs.json` OR create your own
3. **Generate** - Pick a job, choose "Resume", use Clipboard mode
4. Paste the prompt into Claude and get your tailored resume

---

## Troubleshooting

### Build fails
```bash
rm -rf node_modules dist
npm install
```

### TUI doesn't render properly
- Make sure terminal is at least 80 columns wide
- Try a different terminal (iTerm2, Terminal.app)

### No repos found
- Verify path is correct (use absolute path like `/Users/mgilbert/Code`)
- Repos must have `.git` directories

### Skills not detected
- Make sure repos have `package.json`, `requirements.txt`, or similar
- Repos need commit history for analysis

---

## Files to Know

| File | Purpose |
|------|---------|
| `~/.dogfood/config.json` | Your settings, API keys, preferences |
| `~/.dogfood/skills.json` | Analyzed skills profile |
| `~/.dogfood/jobs.json` | Imported job listings |
| `~/.dogfood/applications/` | Generated resumes and cover letters |
| `data/sample-jobs.json` | 10 sample jobs to test with |

---

## Testing Checklist

- [ ] `npm start` launches TUI without errors
- [ ] Analyze repos finds your projects
- [ ] Skills screen shows detected languages/frameworks
- [ ] Jobs import works (use sample-jobs.json)
- [ ] Match screen categorizes jobs correctly
- [ ] Generate creates a resume prompt
- [ ] Clipboard mode copies prompt successfully

---

## Real Job Application Flow

1. Find a real job posting you want to apply to
2. Create a JSON file with that job's details
3. Import it through the Jobs screen
4. Run Match to see how your skills align
5. Generate a tailored resume + cover letter
6. Paste prompts into Claude, review output, apply

---

## Next Steps After Testing

Once you've verified everything works:

1. Build your real jobs list (jobs you're actually applying to)
2. Fine-tune your preferences in Settings
3. Generate applications for your top matches
4. The charts feature in `IMPLEMENTATION_PLAN.md` can wait

---

**Time estimate:** 15-20 minutes from cold start to first generated resume
