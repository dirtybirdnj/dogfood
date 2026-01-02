#!/usr/bin/env node
/**
 * Dogfood Tool Wrapper
 *
 * A simple wrapper for using dogfood commands programmatically.
 * Designed for integration with AI agents and automation tools.
 *
 * Usage:
 *   import { analyze, matchJobs, generate } from './dogfood-tool.mjs'
 *
 *   const skills = await analyze('~/Code')
 *   const matches = await matchJobs()
 *   const app = await generate(matches.categories.qualified[0].id)
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOGFOOD_BIN = join(__dirname, '..', 'dist', 'dogfood.mjs');

/**
 * Execute a dogfood command and return parsed JSON
 */
function exec(args) {
  try {
    const result = execSync(`node ${DOGFOOD_BIN} ${args}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(result);
  } catch (error) {
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        // Not JSON
      }
    }
    throw new Error(`Command failed: dogfood ${args}\n${error.message}`);
  }
}

/**
 * Analyze repositories to build skills profile
 *
 * @param {string} path - Directory containing git repos (default: cwd)
 * @param {boolean} save - Save profile to ~/.dogfood/skills.json
 * @returns {Object} Analysis results with skills profile
 */
export async function analyze(path = process.cwd(), save = false) {
  const args = ['analyze', '--json', '--quiet'];
  if (path) args.push('--path', path);
  if (save) args.push('--save');
  return exec(args.join(' '));
}

/**
 * Ingest jobs from a JSON file
 *
 * @param {string} filepath - Path to jobs JSON file
 * @returns {Object} Ingest results
 */
export async function ingestJobs(filepath) {
  return exec(`jobs --ingest "${filepath}"`);
}

/**
 * List all imported jobs
 *
 * @returns {Object} List of jobs
 */
export async function listJobs() {
  return exec('jobs --list --json');
}

/**
 * Get skills profile
 *
 * @param {boolean} detailed - Return full details
 * @returns {Object} Skills profile
 */
export async function getSkills(detailed = false) {
  const args = ['skills', '--json'];
  if (detailed) args.push('--list');
  return exec(args.join(' '));
}

/**
 * Match jobs to skills profile
 *
 * @returns {Object} Categorized job matches
 */
export async function matchJobs() {
  return exec('match --json');
}

/**
 * Generate application prompts for a job
 *
 * @param {string} jobId - Job ID or partial match
 * @param {string} type - 'resume', 'cover', or 'both'
 * @returns {Object} Generated prompts
 */
export async function generate(jobId, type = 'both') {
  return exec(`generate --job "${jobId}" --type ${type} --json`);
}

/**
 * Get tool schema for LLM function calling
 *
 * @returns {Object} Tool definitions
 */
export async function getToolSchema() {
  return exec('--help --json');
}

// CLI mode - run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , command, ...args] = process.argv;

  const commands = {
    analyze: async () => analyze(args[0], args.includes('--save')),
    ingest: async () => ingestJobs(args[0]),
    list: async () => listJobs(),
    skills: async () => getSkills(args.includes('--detailed')),
    match: async () => matchJobs(),
    generate: async () => generate(args[0], args[1] || 'both'),
    schema: async () => getToolSchema(),
    help: async () => ({
      usage: 'dogfood-tool.mjs <command> [args]',
      commands: {
        analyze: 'analyze [path] [--save]',
        ingest: 'ingest <filepath>',
        list: 'list',
        skills: 'skills [--detailed]',
        match: 'match',
        generate: 'generate <jobId> [resume|cover|both]',
        schema: 'schema',
      },
    }),
  };

  const fn = commands[command] || commands.help;

  try {
    const result = await fn();
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}
