/**
 * Configuration Management
 *
 * Handles persistence of user data to ~/.dogfood/
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.dogfood');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const SKILLS_FILE = join(CONFIG_DIR, 'skills.json');
const JOBS_FILE = join(CONFIG_DIR, 'jobs.json');
const APPLICATIONS_DIR = join(CONFIG_DIR, 'applications');

export function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!existsSync(APPLICATIONS_DIR)) {
    mkdirSync(APPLICATIONS_DIR, { recursive: true });
  }
}

export function loadConfig() {
  ensureConfigDir();

  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    // Corrupted config, start fresh
  }

  return {};
}

export function saveConfig(config) {
  ensureConfigDir();

  // Don't save transient state
  const { currentRepoIndex, ...persistable } = config;

  writeFileSync(CONFIG_FILE, JSON.stringify(persistable, null, 2));
}

export function loadSkills() {
  ensureConfigDir();

  try {
    if (existsSync(SKILLS_FILE)) {
      return JSON.parse(readFileSync(SKILLS_FILE, 'utf-8'));
    }
  } catch (e) {
    // Corrupted file
  }

  return null;
}

export function saveSkills(skills) {
  ensureConfigDir();
  writeFileSync(SKILLS_FILE, JSON.stringify(skills, null, 2));
}

export function loadJobs() {
  ensureConfigDir();

  try {
    if (existsSync(JOBS_FILE)) {
      return JSON.parse(readFileSync(JOBS_FILE, 'utf-8'));
    }
  } catch (e) {
    // Corrupted file
  }

  return [];
}

export function saveJobs(jobs) {
  ensureConfigDir();
  writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

export function getApplicationDir(jobId) {
  const dir = join(APPLICATIONS_DIR, sanitizeFilename(jobId));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function saveApplication(jobId, type, content) {
  const dir = getApplicationDir(jobId);
  const filename = type === 'resume' ? 'resume.md' : 'cover-letter.md';
  writeFileSync(join(dir, filename), content);
  return join(dir, filename);
}

export function loadApplication(jobId, type) {
  const dir = getApplicationDir(jobId);
  const filename = type === 'resume' ? 'resume.md' : 'cover-letter.md';
  const filepath = join(dir, filename);

  if (existsSync(filepath)) {
    return readFileSync(filepath, 'utf-8');
  }

  return null;
}

function sanitizeFilename(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export const paths = {
  CONFIG_DIR,
  CONFIG_FILE,
  SKILLS_FILE,
  JOBS_FILE,
  APPLICATIONS_DIR,
};
