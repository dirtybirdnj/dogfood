/**
 * Generate Screen
 *
 * Generate tailored resume and cover letter for a specific job.
 * Supports multiple LLM backends.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { generateApplication, exportPromptsToFiles } from '../lib/generator.js';
import { PROVIDERS } from '../lib/llm.js';

const STATES = {
  SELECT_JOB: 'select_job',
  SELECT_TYPE: 'select_type',
  GENERATING: 'generating',
  RESULT: 'result',
  ERROR: 'error',
};

export default function GenerateScreen({ navigate, store }) {
  const [state, setState] = useState(STATES.SELECT_JOB);
  const [selectedJob, setSelectedJob] = useState(null);
  const [generateType, setGenerateType] = useState('both');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const { skills, jobs, llm, preferences } = store;
  const selectedJobId = store.selectedJobId;

  // If job was pre-selected (from match screen)
  useEffect(() => {
    if (selectedJobId && jobs) {
      const job = jobs.find((j) => j.id === selectedJobId);
      if (job) {
        setSelectedJob(job);
        setState(STATES.SELECT_TYPE);
      }
    }
  }, [selectedJobId, jobs]);

  useInput((input, key) => {
    if (key.escape) {
      if (state === STATES.RESULT || state === STATES.ERROR) {
        setState(STATES.SELECT_TYPE);
      } else if (state === STATES.SELECT_TYPE) {
        setState(STATES.SELECT_JOB);
        store.update('selectedJobId', null);
      } else {
        navigate('welcome');
      }
    }
  });

  const handleGenerate = async (type) => {
    setGenerateType(type);
    setState(STATES.GENERATING);

    try {
      // User info could come from settings
      const userInfo = store.userInfo || {};

      const generationResult = await generateApplication(
        skills,
        selectedJob,
        userInfo,
        llm,
        { type }
      );

      setResult(generationResult);
      setState(STATES.RESULT);
    } catch (e) {
      setError(e.message);
      setState(STATES.ERROR);
    }
  };

  const handleExportPrompts = () => {
    try {
      const files = exportPromptsToFiles(skills, selectedJob, store.userInfo || {});
      setResult({
        mode: 'exported',
        files,
      });
      setState(STATES.RESULT);
    } catch (e) {
      setError(e.message);
      setState(STATES.ERROR);
    }
  };

  // Check prerequisites
  if (!skills || Object.keys(skills.languages || {}).length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No skills profile found.</Text>
        <Text color="gray">Run analysis first to generate applications.</Text>
        <Box marginTop={1}>
          <SelectInput
            items={[
              { label: 'Analyze Repos', value: 'analyze' },
              { label: 'Back to Menu', value: 'welcome' },
            ]}
            onSelect={(item) => navigate(item.value)}
          />
        </Box>
      </Box>
    );
  }

  // Job selection
  if (state === STATES.SELECT_JOB) {
    if (!jobs || jobs.length === 0) {
      return (
        <Box flexDirection="column">
          <Text color="yellow">No jobs imported.</Text>
          <Text color="gray">Import jobs first to generate applications.</Text>
          <Box marginTop={1}>
            <SelectInput
              items={[
                { label: 'Import Jobs', value: 'jobs' },
                { label: 'Back to Menu', value: 'welcome' },
              ]}
              onSelect={(item) => navigate(item.value)}
            />
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text bold color="white" marginBottom={1}>
          Select a Job
        </Text>
        <SelectInput
          items={jobs.map((job) => ({
            label: `${job.title} @ ${job.company}`,
            value: job,
          }))}
          onSelect={(item) => {
            setSelectedJob(item.value);
            setState(STATES.SELECT_TYPE);
          }}
          limit={15}
        />
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            [Esc] Back
          </Text>
        </Box>
      </Box>
    );
  }

  // Type selection
  if (state === STATES.SELECT_TYPE) {
    const providerInfo = PROVIDERS[llm?.provider || 'clipboard'];

    return (
      <Box flexDirection="column">
        <Box
          borderStyle="round"
          borderColor="cyan"
          paddingX={2}
          paddingY={1}
          marginBottom={1}
        >
          <Box flexDirection="column">
            <Text bold color="white">
              {selectedJob.title}
            </Text>
            <Text color="cyan">{selectedJob.company}</Text>
            <Text color="gray">{selectedJob.location}</Text>
          </Box>
        </Box>

        <Box marginBottom={1}>
          <Text color="gray">
            LLM Provider: <Text color="cyan">{providerInfo.name}</Text>
          </Text>
        </Box>

        <Text bold color="white" marginBottom={1}>
          What would you like to generate?
        </Text>

        <SelectInput
          items={[
            { label: '📄 Resume + Cover Letter', value: 'both' },
            { label: '📝 Resume Only', value: 'resume' },
            { label: '✉️  Cover Letter Only', value: 'coverLetter' },
            { label: '📋 Export Prompts (to files)', value: 'export' },
            { label: '← Back', value: 'back' },
          ]}
          onSelect={(item) => {
            if (item.value === 'back') {
              setState(STATES.SELECT_JOB);
            } else if (item.value === 'export') {
              handleExportPrompts();
            } else {
              handleGenerate(item.value);
            }
          }}
        />

        <Box marginTop={1}>
          <Text color="gray" dimColor>
            [Esc] Back
          </Text>
        </Box>
      </Box>
    );
  }

  // Generating
  if (state === STATES.GENERATING) {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text>
            {' '}
            Generating {generateType === 'both' ? 'resume and cover letter' : generateType}...
          </Text>
        </Box>
        <Text color="gray" marginTop={1}>
          {llm?.provider === 'clipboard'
            ? 'Prompt will be copied to clipboard'
            : `Using ${llm?.provider || 'default'} model`}
        </Text>
      </Box>
    );
  }

  // Error
  if (state === STATES.ERROR) {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>
          Generation Failed
        </Text>
        <Text color="red">{error}</Text>
        <Box marginTop={1}>
          <SelectInput
            items={[
              { label: 'Try Again', value: 'retry' },
              { label: 'Back to Menu', value: 'welcome' },
            ]}
            onSelect={(item) => {
              if (item.value === 'retry') {
                setState(STATES.SELECT_TYPE);
              } else {
                navigate('welcome');
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  // Result
  if (state === STATES.RESULT && result) {
    // Clipboard mode
    if (result.resume?.mode === 'clipboard' || result.coverLetter?.mode === 'clipboard') {
      return (
        <Box flexDirection="column">
          <Text color="green" bold>
            ✓ Prompt Copied to Clipboard
          </Text>
          <Box marginY={1} flexDirection="column">
            <Text color="gray">
              1. Paste into your preferred LLM (Claude, ChatGPT, etc.)
            </Text>
            <Text color="gray">
              2. Copy the generated content
            </Text>
            <Text color="gray">
              3. Save to your applications folder
            </Text>
          </Box>

          <SelectInput
            items={[
              { label: 'Copy Cover Letter Prompt', value: 'cover' },
              { label: 'Generate Another', value: 'another' },
              { label: 'Back to Menu', value: 'welcome' },
            ]}
            onSelect={(item) => {
              if (item.value === 'cover' && result.coverLetter?.prompt) {
                const { execSync } = require('child_process');
                try {
                  execSync('pbcopy', { input: result.coverLetter.prompt });
                } catch {
                  // Fallback
                }
              } else if (item.value === 'another') {
                setState(STATES.SELECT_JOB);
              } else {
                navigate('welcome');
              }
            }}
          />
        </Box>
      );
    }

    // Exported prompts mode
    if (result.mode === 'exported') {
      return (
        <Box flexDirection="column">
          <Text color="green" bold>
            ✓ Prompts Exported
          </Text>
          <Box marginY={1} flexDirection="column">
            <Text color="gray">Files saved:</Text>
            {Object.entries(result.files).map(([key, path]) => (
              <Text key={key} color="cyan" marginLeft={2}>
                {path}
              </Text>
            ))}
          </Box>

          <SelectInput
            items={[
              { label: 'Generate Another', value: 'another' },
              { label: 'Back to Menu', value: 'welcome' },
            ]}
            onSelect={(item) => {
              if (item.value === 'another') {
                setState(STATES.SELECT_JOB);
              } else {
                navigate('welcome');
              }
            }}
          />
        </Box>
      );
    }

    // Direct generation result
    return (
      <Box flexDirection="column">
        <Text color="green" bold>
          ✓ Generation Complete
        </Text>

        {result.resume?.path && (
          <Box marginTop={1}>
            <Text color="gray">Resume: </Text>
            <Text color="cyan">{result.resume.path}</Text>
          </Box>
        )}

        {result.coverLetter?.path && (
          <Box>
            <Text color="gray">Cover Letter: </Text>
            <Text color="cyan">{result.coverLetter.path}</Text>
          </Box>
        )}

        <Box marginTop={1}>
          <SelectInput
            items={[
              { label: 'View Resume', value: 'viewResume', disabled: !result.resume?.content },
              { label: 'View Cover Letter', value: 'viewCover', disabled: !result.coverLetter?.content },
              { label: 'Generate Another', value: 'another' },
              { label: 'Back to Menu', value: 'welcome' },
            ]}
            onSelect={(item) => {
              if (item.value === 'another') {
                setState(STATES.SELECT_JOB);
              } else if (item.value === 'welcome') {
                navigate('welcome');
              }
              // View functionality would need a pager component
            }}
          />
        </Box>
      </Box>
    );
  }

  return null;
}
