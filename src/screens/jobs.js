/**
 * Jobs Screen
 *
 * Manage job listings - import, browse, and organize.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { ingestJobsFromFile, getJobStats } from '../lib/jobs.js';
import { loadJobs } from '../lib/config.js';

const VIEWS = {
  MENU: 'menu',
  BROWSE: 'browse',
  IMPORT: 'import',
  DETAIL: 'detail',
  HELP: 'help',
};

export default function JobsScreen({ navigate, store }) {
  const [view, setView] = useState(VIEWS.MENU);
  const [selectedJob, setSelectedJob] = useState(null);
  const [importPath, setImportPath] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  const jobs = store.jobs || [];
  const stats = getJobStats(jobs);

  useInput((input, key) => {
    if (key.escape) {
      if (view === VIEWS.MENU) {
        navigate('welcome');
      } else {
        setView(VIEWS.MENU);
        setImportResult(null);
        setImportError(null);
      }
    }
  });

  const handleImport = () => {
    try {
      const result = ingestJobsFromFile(importPath);
      setImportResult(result);
      setImportError(null);

      // Reload jobs into store
      const updatedJobs = loadJobs();
      store.update('jobs', updatedJobs);
    } catch (e) {
      setImportError(e.message);
      setImportResult(null);
    }
  };

  if (view === VIEWS.MENU) {
    return (
      <Box flexDirection="column">
        {/* Stats */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="cyan"
          paddingX={2}
          paddingY={1}
          marginBottom={1}
        >
          <Text bold color="white">
            Job Statistics
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text>
              <Text color="gray">Total Jobs: </Text>
              <Text color="cyan">{stats.total}</Text>
            </Text>
            <Text>
              <Text color="gray">Remote: </Text>
              <Text color="green">{stats.remote}</Text>
            </Text>
            <Text>
              <Text color="gray">With Salary: </Text>
              <Text color="yellow">{stats.withSalary}</Text>
            </Text>
          </Box>

          {Object.keys(stats.bySource).length > 0 && (
            <Box marginTop={1} flexDirection="column">
              <Text color="gray">By Source:</Text>
              {Object.entries(stats.bySource).map(([source, count]) => (
                <Text key={source} marginLeft={2}>
                  <Text color="white">{source}: </Text>
                  <Text color="cyan">{count}</Text>
                </Text>
              ))}
            </Box>
          )}
        </Box>

        {/* Menu */}
        <SelectInput
          items={[
            { label: '📥 Import Jobs from JSON', value: 'import' },
            { label: '📋 Browse Jobs', value: 'browse', disabled: jobs.length === 0 },
            { label: '❓ Import Help', value: 'help' },
            { label: '← Back to Menu', value: 'welcome' },
          ]}
          onSelect={(item) => {
            if (item.value === 'welcome') {
              navigate('welcome');
            } else {
              setView(item.value);
            }
          }}
        />
      </Box>
    );
  }

  if (view === VIEWS.IMPORT) {
    return (
      <Box flexDirection="column">
        <Text bold color="white" marginBottom={1}>
          Import Jobs from JSON
        </Text>

        <Box marginBottom={1}>
          <Text color="gray">File path: </Text>
          <TextInput
            value={importPath}
            onChange={setImportPath}
            onSubmit={handleImport}
            placeholder="./jobs.json"
          />
        </Box>

        {importError && (
          <Box marginBottom={1}>
            <Text color="red">Error: {importError}</Text>
          </Box>
        )}

        {importResult && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color="green">🦴 Woof! Import complete!</Text>
            <Text color="gray">Fetched: {importResult.added} new jobs</Text>
            <Text color="gray">Already in bowl: {importResult.skipped}</Text>
            {importResult.errors.length > 0 && (
              <Text color="yellow">Dropped: {importResult.errors.length}</Text>
            )}
          </Box>
        )}

        <Box marginTop={1}>
          <Text color="gray" dimColor>
            [Enter] Import │ [Esc] Back
          </Text>
        </Box>
      </Box>
    );
  }

  if (view === VIEWS.BROWSE) {
    const jobItems = jobs.map((job) => ({
      label: `${job.title} @ ${job.company}`,
      value: job.id,
      job,
    }));

    return (
      <Box flexDirection="column">
        <Text bold color="white" marginBottom={1}>
          Browse Jobs ({jobs.length})
        </Text>

        {jobs.length === 0 ? (
          <Box flexDirection="column">
            <Text color="yellow">{`   /^ ^\\
  / • • \\   Empty bowl!
  V\\ ~ /V   No jobs to fetch yet.
   / - \\
     🦴`}</Text>
          </Box>
        ) : (
          <SelectInput
            items={jobItems}
            onSelect={(item) => {
              setSelectedJob(item.job);
              setView(VIEWS.DETAIL);
            }}
            limit={15}
          />
        )}

        <Box marginTop={1}>
          <Text color="gray" dimColor>
            [Enter] View details │ [Esc] Back
          </Text>
        </Box>
      </Box>
    );
  }

  if (view === VIEWS.DETAIL && selectedJob) {
    return (
      <Box flexDirection="column">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="cyan"
          paddingX={2}
          paddingY={1}
        >
          <Text bold color="white">
            {selectedJob.title}
          </Text>
          <Text color="cyan">{selectedJob.company}</Text>
          <Text color="gray">{selectedJob.location}</Text>

          {selectedJob.salary && (
            <Text color="green" marginTop={1}>
              💰 {selectedJob.salary}
            </Text>
          )}

          {selectedJob.skills?.length > 0 && (
            <Box marginTop={1} flexDirection="column">
              <Text color="gray">Skills:</Text>
              <Text color="magenta" marginLeft={2}>
                {selectedJob.skills.join(', ')}
              </Text>
            </Box>
          )}

          {selectedJob.description && (
            <Box marginTop={1} flexDirection="column">
              <Text color="gray">Description:</Text>
              <Text marginLeft={2}>
                {selectedJob.description.slice(0, 300)}
                {selectedJob.description.length > 300 ? '...' : ''}
              </Text>
            </Box>
          )}

          {selectedJob.url && (
            <Box marginTop={1}>
              <Text color="blue" underline>
                {selectedJob.url}
              </Text>
            </Box>
          )}
        </Box>

        <Box marginTop={1}>
          <SelectInput
            items={[
              { label: '📝 Generate Application', value: 'generate' },
              { label: '← Back to List', value: 'browse' },
            ]}
            onSelect={(item) => {
              if (item.value === 'generate') {
                // Store selected job and navigate
                store.update('selectedJobId', selectedJob.id);
                navigate('generate');
              } else {
                setView(item.value);
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  if (view === VIEWS.HELP) {
    return (
      <Box flexDirection="column">
        <Text bold color="white" marginBottom={1}>
          How to Import Jobs
        </Text>

        <Box flexDirection="column" marginBottom={1}>
          <Text color="cyan">Expected JSON Format:</Text>
          <Box marginLeft={2} flexDirection="column">
            <Text color="gray">{`[`}</Text>
            <Text color="gray">{`  {`}</Text>
            <Text color="gray">{`    "title": "Software Engineer",`}</Text>
            <Text color="gray">{`    "company": "Acme Corp",`}</Text>
            <Text color="gray">{`    "location": "Remote",`}</Text>
            <Text color="gray">{`    "url": "https://...",`}</Text>
            <Text color="gray">{`    "description": "...",`}</Text>
            <Text color="gray">{`    "skills": ["react", "node"],`}</Text>
            <Text color="gray">{`    "salary": "$120k-$150k"`}</Text>
            <Text color="gray">{`  }`}</Text>
            <Text color="gray">{`]`}</Text>
          </Box>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color="cyan">Required Fields:</Text>
          <Text color="gray" marginLeft={2}>
            title, company
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color="cyan">Tips for Scraping:</Text>
          <Box marginLeft={2} flexDirection="column">
            <Text color="gray">
              • Use browser dev tools to copy job data
            </Text>
            <Text color="gray">
              • Create bookmarklets to extract job info
            </Text>
            <Text color="gray">
              • Run manual scrapes to respect rate limits
            </Text>
            <Text color="gray">
              • Save to JSON and import here
            </Text>
          </Box>
        </Box>

        <Box marginTop={1}>
          <Text color="gray" dimColor>
            [Esc] Back
          </Text>
        </Box>
      </Box>
    );
  }

  return null;
}
