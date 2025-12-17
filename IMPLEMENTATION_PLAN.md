# Dogfood: Beautiful Charts Implementation Plan

## Overview

Integrate local code analysis with beautiful D3.js visualizations and TUI sparklines. No API calls, no rate limits - just local git magic.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Food bowl location | User-configurable | Flexibility - some use `~/Code`, others `~/Projects` |
| Auto-sync repos | **No** | User controls when to pull - avoids accidental rate limits |
| Chart output | HTML export + local server | Beautiful D3 charts viewable in browser |
| TUI sparklines | **Yes** | Visual pizzazz in terminal experience |

---

## Phase 1: Configuration & Food Bowl

### 1.1 Update Config Schema

```javascript
// src/lib/config.js - add these fields
{
  foodBowl: {
    path: "~/Code",           // User-defined location
    repos: [],                // Discovered/selected repos
    lastScan: null,           // Timestamp of last analysis
  },
  charts: {
    outputDir: "./charts",    // Where to export HTML
    colorScheme: "default",   // Color palette for charts
    dateRange: "auto",        // "auto" | "2025" | custom
  }
}
```

### 1.2 Food Bowl Commands

```bash
dogfood bowl                  # Show current bowl status
dogfood bowl set ~/Code       # Set food bowl location
dogfood bowl scan             # Discover repos in bowl
dogfood bowl list             # List repos with status
dogfood bowl add <name>       # Include repo in analysis
dogfood bowl remove <name>    # Exclude repo from analysis
```

### 1.3 TUI Settings Screen Update

Add "Food Bowl" section to settings:
- Path picker (with ~ expansion)
- Repo count display
- "Scan Now" button

---

## Phase 2: Enhanced Local Analysis

### 2.1 Extended Git Analysis

```javascript
// src/lib/analyzer.js - enhance analyzeGitHistory()

export function getCommitTimeline(repoPath, since = null) {
  // Get all commits with dates (for charts)
  const format = '%ad|%h|%s|%an';
  const cmd = since
    ? `git log --since="${since}" --pretty=format:"${format}" --date=short`
    : `git log --pretty=format:"${format}" --date=short`;

  const output = execSync(cmd, { cwd: repoPath, encoding: 'utf-8' });

  return output.split('\n').filter(Boolean).map(line => {
    const [date, sha, msg, author] = line.split('|');
    return { date, sha, msg: msg.slice(0, 100), author };
  });
}

export function getActivityByDay(repoPath) {
  // For heatmap visualization
  const cmd = `git log --format="%ad" --date=short | sort | uniq -c`;
  // Returns: { "2025-12-16": 5, "2025-12-15": 3, ... }
}

export function getActivityByHour(repoPath) {
  // For punch card visualization
  const cmd = `git log --format="%ad" --date=format:"%u %H"`;
  // Returns day-of-week + hour matrix
}
```

### 2.2 Sentiment Analysis (Local)

Port the sentiment lexicon from commit-charts:

```javascript
// src/lib/sentiment.js

const LEXICON = {
  // Positive
  'complete': 4, 'milestone': 4, 'feature': 3, 'implement': 3,
  'add': 2, 'enhance': 3, 'improve': 3, 'fix': 1, 'refactor': 1,

  // Negative
  'bug': -2, 'error': -2, 'crash': -3, 'broken': -3,
  'hack': -2, 'workaround': -1, 'revert': -2, 'hotfix': -2,
};

export function analyzeCommitSentiment(message) {
  const words = message.toLowerCase().split(/[\s\-_:,.()\[\]]+/);
  let score = 0;
  const matches = [];

  for (const word of words) {
    if (LEXICON[word]) {
      score += LEXICON[word];
      matches.push({ word, score: LEXICON[word] });
    }
  }

  return { score, matches, sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral' };
}
```

---

## Phase 3: Chart Data Generation

### 3.1 Chart Data Module

```javascript
// src/lib/charts.js

import { getCommitTimeline } from './analyzer.js';
import { analyzeCommitSentiment } from './sentiment.js';

export function generateChartData(repos, options = {}) {
  const { startDate = '2025-01-01' } = options;
  const commits = [];
  const colors = {};

  // Color palette (12 distinct colors)
  const palette = [
    '#f97316', '#22c55e', '#3b82f6', '#ec4899', '#a855f7', '#eab308',
    '#14b8a6', '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16', '#f59e0b'
  ];

  repos.forEach((repo, i) => {
    colors[repo.name] = palette[i % palette.length];

    const timeline = getCommitTimeline(repo.path, startDate);
    for (const commit of timeline) {
      const sentiment = analyzeCommitSentiment(commit.msg);
      commits.push({
        date: commit.date,
        project: repo.name,
        type: 'commit',
        msg: commit.msg,
        sha: commit.sha,
        sentiment: sentiment.score,
      });
    }
  });

  // Sort by date
  commits.sort((a, b) => a.date.localeCompare(b.date));

  // Generate stats (daily aggregates)
  const statsMap = new Map();
  for (const c of commits) {
    const key = `${c.date}-${c.project}`;
    if (!statsMap.has(key)) {
      statsMap.set(key, { date: c.date, project: c.project, commits: 0 });
    }
    statsMap.get(key).commits++;
  }
  const stats = Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Generate meta
  const dates = commits.map(c => c.date);
  const meta = {
    lastUpdated: new Date().toISOString(),
    dateRange: {
      start: dates[0],
      end: dates[dates.length - 1],
    },
    projects: repos.map(r => r.name),
    colors,
    totals: {
      commits: commits.length,
      projects: repos.length,
    },
  };

  return { commits, stats, meta };
}
```

### 3.2 Export Function

```javascript
// src/lib/export.js

import { writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

export function exportCharts(data, outputDir) {
  // Create directory structure
  mkdirSync(join(outputDir, 'data'), { recursive: true });

  // Write JSON data
  writeFileSync(join(outputDir, 'data/commits.json'), JSON.stringify(data.commits, null, 2));
  writeFileSync(join(outputDir, 'data/stats.json'), JSON.stringify(data.stats, null, 2));
  writeFileSync(join(outputDir, 'data/meta.json'), JSON.stringify(data.meta, null, 2));

  // Copy HTML templates (bundled with dogfood)
  copyFileSync(join(__dirname, '../templates/charts.html'), join(outputDir, 'index.html'));
  copyFileSync(join(__dirname, '../templates/interactive.html'), join(outputDir, 'interactive.html'));

  return {
    path: outputDir,
    files: ['index.html', 'interactive.html', 'data/commits.json', 'data/stats.json', 'data/meta.json'],
  };
}
```

---

## Phase 4: TUI Sparklines

### 4.1 Sparkline Component

```javascript
// src/components/Sparkline.js

import React from 'react';
import { Text } from 'ink';

const BARS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export function Sparkline({ data, width = 20, color = 'cyan' }) {
  if (!data.length) return <Text color="gray">No data</Text>;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Normalize and map to bar characters
  const bars = data.slice(-width).map(v => {
    const normalized = (v - min) / range;
    const index = Math.round(normalized * (BARS.length - 1));
    return BARS[index];
  });

  return <Text color={color}>{bars.join('')}</Text>;
}

// Usage example:
// <Sparkline data={[1,3,5,2,8,4,6]} color="green" />
// Output: ▂▄▆▃█▅▇
```

### 4.2 Activity Chart Component

```javascript
// src/components/ActivityChart.js

import React from 'react';
import { Box, Text } from 'ink';
import { Sparkline } from './Sparkline.js';

export function ActivityChart({ repos, maxWidth = 40 }) {
  // Find max commits for scaling
  const maxCommits = Math.max(...repos.map(r => r.recentCommits));

  return (
    <Box flexDirection="column">
      <Text bold color="white">Activity (last 30 days)</Text>
      <Text color="gray">{'─'.repeat(maxWidth + 15)}</Text>

      {repos.map(repo => {
        const barWidth = Math.round((repo.recentCommits / maxCommits) * maxWidth);
        const bar = '█'.repeat(barWidth) + '░'.repeat(maxWidth - barWidth);

        return (
          <Box key={repo.name}>
            <Text color="cyan">{repo.name.padEnd(12)}</Text>
            <Text color={repo.color}>{bar}</Text>
            <Text color="white"> {repo.recentCommits}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
```

### 4.3 Heatmap Component (Mini)

```javascript
// src/components/MiniHeatmap.js

import React from 'react';
import { Box, Text } from 'ink';

const HEAT = [' ', '░', '▒', '▓', '█'];

export function MiniHeatmap({ data, weeks = 8 }) {
  // data: { "2025-12-16": 5, "2025-12-15": 3, ... }

  // Build 7-row (days) x N-column (weeks) grid
  const grid = [];
  const today = new Date();

  for (let w = weeks - 1; w >= 0; w--) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7 + (6 - d)));
      const key = date.toISOString().split('T')[0];
      const count = data[key] || 0;
      const intensity = Math.min(4, Math.floor(count / 2));
      week.push(HEAT[intensity]);
    }
    grid.push(week);
  }

  // Transpose for display (days as rows)
  return (
    <Box flexDirection="column">
      {[0,1,2,3,4,5,6].map(day => (
        <Text key={day} color="green">
          {grid.map(week => week[day]).join('')}
        </Text>
      ))}
    </Box>
  );
}
```

---

## Phase 5: Charts Screen

### 5.1 New TUI Screen

```javascript
// src/screens/charts.js

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

import { ActivityChart } from '../components/ActivityChart.js';
import { MiniHeatmap } from '../components/MiniHeatmap.js';
import { Sparkline } from '../components/Sparkline.js';
import { generateChartData, exportCharts } from '../lib/charts.js';

export default function ChartsScreen({ navigate, store }) {
  const [status, setStatus] = useState('idle');
  const [chartData, setChartData] = useState(null);

  const items = [
    { label: '📊 Generate chart data', value: 'generate' },
    { label: '📁 Export HTML charts', value: 'export' },
    { label: '🌐 Open in browser', value: 'open' },
    { label: '← Back', value: 'back' },
  ];

  const handleSelect = async (item) => {
    switch (item.value) {
      case 'generate':
        setStatus('generating');
        const data = await generateChartData(store.repos);
        setChartData(data);
        setStatus('ready');
        break;
      case 'export':
        setStatus('exporting');
        await exportCharts(chartData, store.config.charts.outputDir);
        setStatus('exported');
        break;
      case 'open':
        execSync(`open ${store.config.charts.outputDir}/index.html`);
        break;
      case 'back':
        navigate('welcome');
        break;
    }
  };

  return (
    <Box flexDirection="column">
      {/* Status */}
      {status === 'generating' && (
        <Text><Spinner type="dots" /> Analyzing repos...</Text>
      )}

      {/* Preview sparklines */}
      {chartData && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>Preview</Text>
          <ActivityChart repos={chartData.meta.projects.map(p => ({
            name: p,
            recentCommits: chartData.commits.filter(c => c.project === p).length,
            color: chartData.meta.colors[p],
          }))} />
        </Box>
      )}

      {/* Menu */}
      <SelectInput items={items} onSelect={handleSelect} />

      {/* Stats */}
      {chartData && (
        <Box marginTop={1}>
          <Text color="gray">
            {chartData.meta.totals.commits} commits │
            {chartData.meta.totals.projects} projects │
            {chartData.meta.dateRange.start} to {chartData.meta.dateRange.end}
          </Text>
        </Box>
      )}
    </Box>
  );
}
```

---

## File Structure (Final)

```
dogfood/
├── src/
│   ├── app.js                    # Add 'charts' to SCREENS
│   ├── lib/
│   │   ├── analyzer.js           # Enhanced with timeline functions
│   │   ├── charts.js             # NEW: Chart data generation
│   │   ├── sentiment.js          # NEW: Commit sentiment analysis
│   │   ├── export.js             # NEW: HTML export
│   │   └── config.js             # Updated with foodBowl config
│   ├── screens/
│   │   ├── charts.js             # NEW: Charts TUI screen
│   │   └── settings.js           # Updated with food bowl settings
│   └── components/
│       ├── Sparkline.js          # NEW: ASCII sparkline
│       ├── ActivityChart.js      # NEW: Bar chart component
│       └── MiniHeatmap.js        # NEW: GitHub-style heatmap
├── templates/
│   ├── charts.html               # D3 visualizations (from commit-charts)
│   └── interactive.html          # Interactive explorer
└── package.json                  # Add: open, chalk already there
```

---

## Implementation Order

1. **Config updates** - Add foodBowl and charts config
2. **Sparkline component** - Quick visual win
3. **Enhanced analyzer** - Timeline + activity functions
4. **Sentiment module** - Port lexicon from commit-charts
5. **Charts data generation** - Core logic
6. **Charts TUI screen** - Tie it together
7. **HTML export** - Copy templates + data
8. **Testing** - Run on actual repos

---

## Commands Summary

```bash
# Food Bowl
dogfood bowl                    # Status overview
dogfood bowl set <path>         # Set location
dogfood bowl scan               # Find repos
dogfood bowl list               # Show repos

# Charts
dogfood charts                  # TUI chart screen
dogfood charts --generate       # Generate data
dogfood charts --export         # Export HTML
dogfood charts --open           # Open in browser

# Combined workflow
dogfood                         # Full TUI experience
```

---

## Next Steps

Ready to start coding? Suggested order:
1. Create `src/components/Sparkline.js` (instant gratification)
2. Create `src/lib/sentiment.js` (self-contained)
3. Update `src/lib/config.js` with new schema
4. Create `src/lib/charts.js`
5. Create `src/screens/charts.js`
6. Wire it all together

Let's ship it! 🦴
