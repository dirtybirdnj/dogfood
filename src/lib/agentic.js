/**
 * Agentic CLI Handlers
 *
 * Non-interactive command handlers for programmatic use.
 * Outputs JSON for easy parsing by AI agents, scripts, and MCP servers.
 *
 * Usage:
 *   dogfood analyze --json          # Analyze repos, output JSON
 *   dogfood jobs --list --json      # List jobs as JSON
 *   dogfood match --json            # Match jobs to skills
 *   dogfood generate --job ID       # Generate application prompts
 */

import { discoverRepos, analyzeRepo } from './analyzer.js';
import { buildSkillsProfile, matchSkillsToJob } from './skills.js';
import { ingestJobsFromFile, matchJobsToProfile, categorizeMatches } from './jobs.js';
import { generateResumePrompt, generateCoverLetterPrompt } from './generator.js';
import { loadConfig, saveConfig, loadSkills, saveSkills, loadJobs, saveJobs, ensureConfigDir } from './config.js';

/**
 * Output helper - prints JSON or formatted text
 */
function output(data, args) {
  if (args.json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (!args.quiet) {
    console.log(data);
  }
  return data;
}

/**
 * Error helper - outputs error in consistent format
 */
function error(message, code = 1) {
  console.error(JSON.stringify({ error: message, code }));
  process.exit(code);
}

/**
 * Analyze repositories in a directory
 *
 * Commands:
 *   dogfood analyze --json                    # Analyze current directory
 *   dogfood analyze --path ~/Code --json     # Analyze specific path
 *   dogfood analyze --json --save            # Analyze and save profile
 */
export async function handleAnalyze(args) {
  const rootPath = args.path;

  if (!args.quiet) {
    console.error(`Analyzing repositories in ${rootPath}...`);
  }

  // Discover repos
  const repos = discoverRepos(rootPath);

  if (repos.length === 0) {
    return output({
      success: false,
      error: 'No git repositories found',
      path: rootPath,
      repos: [],
    }, args);
  }

  // Analyze each repo
  const analyzed = [];
  for (const repo of repos) {
    try {
      const analysis = analyzeRepo(repo.path);
      analyzed.push(analysis);
    } catch (e) {
      if (!args.quiet) {
        console.error(`Warning: Could not analyze ${repo.name}: ${e.message}`);
      }
    }
  }

  // Build skills profile
  const profile = buildSkillsProfile(analyzed);

  // Save if requested
  if (args.save) {
    ensureConfigDir();
    saveSkills(profile);
    if (!args.quiet) {
      console.error('Skills profile saved to ~/.dogfood/skills.json');
    }
  }

  return output({
    success: true,
    path: rootPath,
    reposFound: repos.length,
    reposAnalyzed: analyzed.length,
    profile: {
      languages: profile.languages,
      frameworks: profile.frameworks,
      patterns: profile.patterns,
      tools: profile.tools,
    },
    repos: analyzed.map(r => ({
      name: r.name,
      path: r.path,
      languages: r.languages.slice(0, 5),
      patterns: r.patterns,
      commits: r.git.commitCount,
      freshness: r.git.freshness,
    })),
  }, args);
}

/**
 * Manage jobs
 *
 * Commands:
 *   dogfood jobs --ingest FILE              # Import jobs from JSON file
 *   dogfood jobs --list --json              # List all jobs
 *   dogfood jobs --json                     # Show job stats
 */
export async function handleJobs(args) {
  ensureConfigDir();

  // Ingest jobs from file
  if (args.ingest) {
    try {
      // ingestJobsFromFile already saves to ~/.dogfood/jobs.json
      const result = ingestJobsFromFile(args.ingest);
      const allJobs = loadJobs();

      return output({
        success: true,
        action: 'ingest',
        file: args.ingest,
        added: result.added,
        skipped: result.skipped,
        errors: result.errors,
        totalJobs: allJobs.length,
      }, args);
    } catch (e) {
      error(`Failed to ingest jobs: ${e.message}`);
    }
  }

  // List jobs
  const jobs = loadJobs();

  if (args.list) {
    return output({
      success: true,
      count: jobs.length,
      jobs: jobs.map(j => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        remote: j.remote,
        salary: j.salary,
        skills: j.skills,
        url: j.url,
      })),
    }, args);
  }

  // Default: show stats
  return output({
    success: true,
    count: jobs.length,
    companies: [...new Set(jobs.map(j => j.company))].length,
    remote: jobs.filter(j => j.remote).length,
    locations: [...new Set(jobs.map(j => j.location).filter(Boolean))],
  }, args);
}

/**
 * View skills profile
 *
 * Commands:
 *   dogfood skills --json                   # View skills as JSON
 *   dogfood skills --list --json            # Detailed skills list
 */
export async function handleSkills(args) {
  const skills = loadSkills();

  if (!skills) {
    return output({
      success: false,
      error: 'No skills profile found. Run: dogfood analyze --save',
    }, args);
  }

  if (args.list) {
    return output({
      success: true,
      languages: skills.languages,
      frameworks: skills.frameworks,
      patterns: skills.patterns,
      tools: skills.tools,
      repos: skills.repos,
    }, args);
  }

  // Summary view
  return output({
    success: true,
    summary: {
      languageCount: Object.keys(skills.languages || {}).length,
      frameworkCount: Object.keys(skills.frameworks || {}).length,
      patternCount: (skills.patterns || []).length,
      repoCount: (skills.repos || []).length,
    },
    topLanguages: Object.entries(skills.languages || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
    topFrameworks: Object.entries(skills.frameworks || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
  }, args);
}

/**
 * Match jobs to skills profile
 *
 * Commands:
 *   dogfood match --json                    # Match all jobs
 */
export async function handleMatch(args) {
  const skills = loadSkills();
  const jobs = loadJobs();

  if (!skills) {
    return output({
      success: false,
      error: 'No skills profile found. Run: dogfood analyze --save',
    }, args);
  }

  if (jobs.length === 0) {
    return output({
      success: false,
      error: 'No jobs found. Run: dogfood jobs --ingest <file>',
    }, args);
  }

  // Get preferences from config
  const config = loadConfig();
  const preferences = config.preferences || {};

  // Match jobs
  const matches = matchJobsToProfile(jobs, skills, preferences);
  const categorized = categorizeMatches(matches);

  return output({
    success: true,
    totalJobs: jobs.length,
    matched: matches.length,
    categories: {
      want: categorized.want.map(m => ({
        id: m.job.id,
        title: m.job.title,
        company: m.job.company,
        score: m.score,
        matchedSkills: m.matchedSkills,
        missingSkills: m.missingSkills,
      })),
      qualified: categorized.qualified.map(m => ({
        id: m.job.id,
        title: m.job.title,
        company: m.job.company,
        score: m.score,
        matchedSkills: m.matchedSkills,
        missingSkills: m.missingSkills,
      })),
      stretch: categorized.stretch.map(m => ({
        id: m.job.id,
        title: m.job.title,
        company: m.job.company,
        score: m.score,
        matchedSkills: m.matchedSkills,
        missingSkills: m.missingSkills,
      })),
    },
  }, args);
}

/**
 * Generate application prompts
 *
 * Commands:
 *   dogfood generate --job <id> --json              # Generate both prompts
 *   dogfood generate --job <id> --type resume       # Resume only
 *   dogfood generate --job <id> --type cover        # Cover letter only
 */
export async function handleGenerate(args) {
  if (!args.job) {
    return output({
      success: false,
      error: 'Job ID required. Use: dogfood generate --job <id>',
    }, args);
  }

  const skills = loadSkills();
  const jobs = loadJobs();

  if (!skills) {
    return output({
      success: false,
      error: 'No skills profile found. Run: dogfood analyze --save',
    }, args);
  }

  // Find job by ID or partial match
  const job = jobs.find(j =>
    j.id === args.job ||
    j.id?.includes(args.job) ||
    `${j.company}-${j.title}`.toLowerCase().includes(args.job.toLowerCase())
  );

  if (!job) {
    return output({
      success: false,
      error: `Job not found: ${args.job}`,
      availableJobs: jobs.map(j => ({ id: j.id, title: j.title, company: j.company })),
    }, args);
  }

  const config = loadConfig();
  const userInfo = config.userInfo || {};

  const result = {
    success: true,
    job: {
      id: job.id,
      title: job.title,
      company: job.company,
    },
    prompts: {},
  };

  // Generate requested prompts
  if (args.type === 'resume' || args.type === 'both') {
    result.prompts.resume = generateResumePrompt(skills, job, userInfo);
  }

  if (args.type === 'cover' || args.type === 'both') {
    result.prompts.coverLetter = generateCoverLetterPrompt(skills, job, userInfo);
  }

  return output(result, args);
}

/**
 * Main agentic command router
 */
export async function runAgenticCommand(args) {
  const command = args.command || 'help';

  switch (command) {
    case 'analyze':
      return handleAnalyze(args);
    case 'jobs':
      return handleJobs(args);
    case 'skills':
      return handleSkills(args);
    case 'match':
      return handleMatch(args);
    case 'generate':
      return handleGenerate(args);
    case 'help':
    default:
      // Return tool schema for LLM/MCP use
      return output(getToolSchema(), args);
  }
}

/**
 * Get tool schema for MCP/LLM tool use
 *
 * This schema describes available commands in a format
 * that AI agents and MCP servers can understand.
 */
export function getToolSchema() {
  return {
    name: 'dogfood',
    description: 'Analyze code skills, match jobs, and generate tailored applications',
    version: '0.1.0',
    tools: [
      {
        name: 'analyze',
        description: 'Analyze git repositories to build a skills profile from code',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory containing git repositories to analyze (default: current directory)',
            },
            save: {
              type: 'boolean',
              description: 'Save the skills profile to ~/.dogfood/skills.json',
            },
          },
        },
        examples: [
          'dogfood analyze --json',
          'dogfood analyze --path ~/Code --json --save',
        ],
      },
      {
        name: 'jobs',
        description: 'Manage job listings - import from JSON files or list existing jobs',
        parameters: {
          type: 'object',
          properties: {
            ingest: {
              type: 'string',
              description: 'Path to JSON file containing job listings to import',
            },
            list: {
              type: 'boolean',
              description: 'List all imported jobs',
            },
          },
        },
        examples: [
          'dogfood jobs --ingest jobs.json',
          'dogfood jobs --list --json',
        ],
      },
      {
        name: 'skills',
        description: 'View the analyzed skills profile',
        parameters: {
          type: 'object',
          properties: {
            list: {
              type: 'boolean',
              description: 'Show detailed skills breakdown',
            },
          },
        },
        examples: [
          'dogfood skills --json',
          'dogfood skills --list --json',
        ],
      },
      {
        name: 'match',
        description: 'Match jobs against your skills profile',
        parameters: {
          type: 'object',
          properties: {},
        },
        returns: {
          type: 'object',
          description: 'Jobs categorized as want, qualified, or stretch based on skill match',
        },
        examples: [
          'dogfood match --json',
        ],
      },
      {
        name: 'generate',
        description: 'Generate tailored resume and cover letter prompts for a specific job',
        parameters: {
          type: 'object',
          properties: {
            job: {
              type: 'string',
              description: 'Job ID or partial match (company-title)',
              required: true,
            },
            type: {
              type: 'string',
              enum: ['resume', 'cover', 'both'],
              description: 'Type of prompt to generate (default: both)',
            },
          },
          required: ['job'],
        },
        examples: [
          'dogfood generate --job beta-senior --json',
          'dogfood generate --job "BETA Technologies" --type resume --json',
        ],
      },
    ],
    workflow: [
      '1. Analyze your code: dogfood analyze --path ~/Code --json --save',
      '2. Import jobs: dogfood jobs --ingest jobs.json',
      '3. Match jobs: dogfood match --json',
      '4. Generate application: dogfood generate --job <id> --json',
    ],
  };
}
