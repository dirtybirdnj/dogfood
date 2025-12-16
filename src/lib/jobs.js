/**
 * Job Management and Matching
 *
 * Handles job data ingestion, storage, and matching against skills profile.
 */

import { readFileSync, existsSync } from 'fs';
import { loadJobs, saveJobs } from './config.js';
import { matchSkillsToJob } from './skills.js';

/**
 * Job schema for validation
 */
export const JOB_SCHEMA = {
  required: ['title', 'company'],
  optional: ['url', 'description', 'skills', 'location', 'salary', 'type', 'remote', 'source', 'datePosted'],
};

/**
 * Generate a unique job ID
 */
export function generateJobId(job) {
  const base = `${job.company}-${job.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);

  const hash = simpleHash(JSON.stringify(job)).toString(16).slice(0, 6);
  return `${base}-${hash}`;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Validate a job object
 */
export function validateJob(job) {
  const errors = [];

  for (const field of JOB_SCHEMA.required) {
    if (!job[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (job.skills && !Array.isArray(job.skills)) {
    errors.push('Skills must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalize a job object
 */
export function normalizeJob(job) {
  return {
    id: job.id || generateJobId(job),
    title: job.title?.trim() || 'Unknown Position',
    company: job.company?.trim() || 'Unknown Company',
    url: job.url || null,
    description: job.description || '',
    skills: normalizeSkills(job.skills || []),
    location: job.location || 'Not specified',
    salary: job.salary || null,
    type: job.type || 'full-time',
    remote: job.remote ?? (job.location?.toLowerCase().includes('remote') ? true : null),
    source: job.source || 'manual',
    datePosted: job.datePosted || new Date().toISOString().split('T')[0],
    dateAdded: job.dateAdded || new Date().toISOString(),
    status: job.status || 'new',
  };
}

/**
 * Normalize skills array
 */
function normalizeSkills(skills) {
  if (typeof skills === 'string') {
    skills = skills.split(',').map((s) => s.trim());
  }

  return skills
    .filter(Boolean)
    .map((s) => s.toLowerCase().trim());
}

/**
 * Ingest jobs from a JSON file
 */
export function ingestJobsFromFile(filepath) {
  if (!existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }

  const content = readFileSync(filepath, 'utf-8');
  let data;

  try {
    data = JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }

  // Handle both array and object with jobs property
  const rawJobs = Array.isArray(data) ? data : data.jobs || [];

  const results = {
    added: 0,
    skipped: 0,
    errors: [],
  };

  const existingJobs = loadJobs();
  const existingIds = new Set(existingJobs.map((j) => j.id));

  for (const rawJob of rawJobs) {
    const validation = validateJob(rawJob);

    if (!validation.valid) {
      results.errors.push({
        job: rawJob,
        errors: validation.errors,
      });
      continue;
    }

    const job = normalizeJob(rawJob);

    if (existingIds.has(job.id)) {
      results.skipped++;
      continue;
    }

    existingJobs.push(job);
    existingIds.add(job.id);
    results.added++;
  }

  saveJobs(existingJobs);

  return results;
}

/**
 * Match jobs against a skills profile
 */
export function matchJobsToProfile(jobs, profile, preferences = {}) {
  const matches = [];

  for (const job of jobs) {
    const match = matchSkillsToJob(profile, job);

    // Apply preference filters
    let wantScore = 0;
    let avoidPenalty = 0;

    if (preferences.wantSkills?.length > 0) {
      const wantMatches = match.matched.filter((m) =>
        preferences.wantSkills.some((w) =>
          m.name.toLowerCase().includes(w.toLowerCase())
        )
      );
      wantScore = wantMatches.length * 10;
    }

    if (preferences.avoidSkills?.length > 0) {
      const avoidMatches = job.skills?.filter((s) =>
        preferences.avoidSkills.some((a) =>
          s.toLowerCase().includes(a.toLowerCase())
        )
      ) || [];
      avoidPenalty = avoidMatches.length * 15;
    }

    // Location filtering
    let locationMatch = true;
    if (preferences.locations?.length > 0) {
      const jobLoc = job.location?.toLowerCase() || '';
      const isRemote = job.remote || jobLoc.includes('remote');

      locationMatch = preferences.locations.some((loc) => {
        if (loc.toLowerCase() === 'remote') return isRemote;
        return jobLoc.includes(loc.toLowerCase());
      });
    }

    // Calculate final score
    const adjustedScore = Math.max(0, Math.min(100, match.score + wantScore - avoidPenalty));

    matches.push({
      job,
      score: adjustedScore,
      baseScore: match.score,
      matchedSkills: match.matched,
      missingSkills: match.missing,
      bonusSkills: match.bonus,
      locationMatch,
      wantMatch: wantScore > 0,
      hasAvoid: avoidPenalty > 0,
    });
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

/**
 * Categorize matches into "want", "qualified", and "stretch"
 */
export function categorizeMatches(matches) {
  return {
    // Jobs user wants AND is qualified for
    want: matches.filter((m) => m.wantMatch && m.score >= 50 && m.locationMatch && !m.hasAvoid),

    // Jobs user is qualified for but might not want
    qualified: matches.filter((m) => m.score >= 50 && m.locationMatch && !m.wantMatch && !m.hasAvoid),

    // Jobs that are a stretch (missing some skills)
    stretch: matches.filter((m) => m.score >= 25 && m.score < 50 && m.locationMatch),

    // Jobs filtered out
    filtered: matches.filter((m) => !m.locationMatch || m.hasAvoid),
  };
}

/**
 * Get job statistics
 */
export function getJobStats(jobs) {
  const stats = {
    total: jobs.length,
    bySource: {},
    byLocation: {},
    byType: {},
    byStatus: {},
    remote: 0,
    withSalary: 0,
  };

  for (const job of jobs) {
    // By source
    stats.bySource[job.source] = (stats.bySource[job.source] || 0) + 1;

    // By location
    const loc = job.location || 'Unknown';
    stats.byLocation[loc] = (stats.byLocation[loc] || 0) + 1;

    // By type
    stats.byType[job.type] = (stats.byType[job.type] || 0) + 1;

    // By status
    stats.byStatus[job.status] = (stats.byStatus[job.status] || 0) + 1;

    // Remote count
    if (job.remote) stats.remote++;

    // Salary info
    if (job.salary) stats.withSalary++;
  }

  return stats;
}

/**
 * Extract skills from job description
 */
export function extractSkillsFromDescription(description) {
  const skills = new Set();

  const patterns = [
    // Languages
    /\b(javascript|typescript|python|go|golang|rust|java|c\+\+|c#|ruby|php|swift|kotlin)\b/gi,
    // Frontend
    /\b(react|vue|angular|svelte|next\.?js|nuxt|gatsby)\b/gi,
    // Backend
    /\b(node\.?js|express|fastify|nest\.?js|django|flask|rails|spring)\b/gi,
    // Databases
    /\b(postgresql|postgres|mysql|mongodb|redis|elasticsearch|dynamodb)\b/gi,
    // Cloud
    /\b(aws|azure|gcp|google cloud|docker|kubernetes|k8s|terraform)\b/gi,
    // Tools
    /\b(git|github|gitlab|jira|figma|sketch)\b/gi,
  ];

  for (const pattern of patterns) {
    const matches = description.match(pattern) || [];
    for (const match of matches) {
      skills.add(match.toLowerCase());
    }
  }

  return [...skills];
}
