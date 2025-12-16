/**
 * Application State Store
 *
 * Manages global state for the dogfood application.
 * Uses React hooks for reactive state management.
 */

import { useState, useCallback } from 'react';
import { loadConfig, saveConfig } from './config.js';

const initialState = {
  // User's analyzed skills profile
  skills: {
    languages: {},      // { javascript: { level: 'expert', years: 5, projects: 12 } }
    frameworks: {},     // { react: { level: 'advanced', projects: 8 } }
    tools: {},          // { git: { level: 'expert' }, docker: { level: 'intermediate' } }
    patterns: [],       // ['api-design', 'tdd', 'game-dev']
    domains: [],        // ['web', 'games', 'data-viz', 'gis']
  },

  // Repos being analyzed
  repos: [],            // [{ name, path, lastCommit, status, languages, ... }]
  currentRepoIndex: 0,

  // Job listings
  jobs: [],             // [{ id, title, company, skills, location, ... }]

  // Job matches
  matches: [],          // [{ job, score, matchedSkills, missingSkills }]

  // Generated applications
  applications: [],     // [{ jobId, resume, coverLetter, status }]

  // User preferences
  preferences: {
    wantSkills: [],     // Skills user WANTS to use
    avoidSkills: [],    // Skills user wants to AVOID
    locations: ['Burlington, VT', 'Remote'],
    minSalary: null,
    jobTypes: ['full-time', 'contract'],
  },

  // LLM configuration
  llm: {
    provider: 'clipboard', // 'clipboard' | 'ollama' | 'anthropic' | 'openai'
    model: null,
    apiKey: null,
    ollamaUrl: 'http://localhost:11434',
  },
};

export function useStore() {
  const [state, setState] = useState(() => {
    // Load persisted state on init
    const saved = loadConfig();
    return { ...initialState, ...saved };
  });

  const update = useCallback((path, value) => {
    setState((prev) => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;

      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }

      obj[keys[keys.length - 1]] = value;
      saveConfig(next);
      return next;
    });
  }, []);

  const addRepo = useCallback((repo) => {
    setState((prev) => {
      const next = { ...prev, repos: [...prev.repos, repo] };
      saveConfig(next);
      return next;
    });
  }, []);

  const updateRepo = useCallback((index, updates) => {
    setState((prev) => {
      const repos = [...prev.repos];
      repos[index] = { ...repos[index], ...updates };
      const next = { ...prev, repos };
      saveConfig(next);
      return next;
    });
  }, []);

  const addSkill = useCallback((category, name, data) => {
    setState((prev) => {
      const skills = { ...prev.skills };
      skills[category] = { ...skills[category], [name]: data };
      const next = { ...prev, skills };
      saveConfig(next);
      return next;
    });
  }, []);

  const addJob = useCallback((job) => {
    setState((prev) => {
      const next = { ...prev, jobs: [...prev.jobs, job] };
      saveConfig(next);
      return next;
    });
  }, []);

  const addJobs = useCallback((newJobs) => {
    setState((prev) => {
      const existingIds = new Set(prev.jobs.map((j) => j.id));
      const uniqueJobs = newJobs.filter((j) => !existingIds.has(j.id));
      const next = { ...prev, jobs: [...prev.jobs, ...uniqueJobs] };
      saveConfig(next);
      return next;
    });
  }, []);

  const setMatches = useCallback((matches) => {
    setState((prev) => {
      const next = { ...prev, matches };
      saveConfig(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    saveConfig(initialState);
  }, []);

  return {
    ...state,
    update,
    addRepo,
    updateRepo,
    addSkill,
    addJob,
    addJobs,
    setMatches,
    reset,
  };
}
