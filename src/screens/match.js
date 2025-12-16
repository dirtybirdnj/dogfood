/**
 * Match Screen
 *
 * Shows job matches categorized by:
 * - Jobs you WANT (match preferences + qualified)
 * - Jobs you're QUALIFIED for (but may not want)
 * - STRETCH jobs (partial match)
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { matchJobsToProfile, categorizeMatches } from '../lib/jobs.js';

const CATEGORIES = {
  WANT: 'want',
  QUALIFIED: 'qualified',
  STRETCH: 'stretch',
};

export default function MatchScreen({ navigate, store }) {
  const [category, setCategory] = useState(CATEGORIES.WANT);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matches, setMatches] = useState(null);

  const { skills, jobs, preferences } = store;

  // Calculate matches on mount
  useEffect(() => {
    if (skills && jobs?.length > 0) {
      const allMatches = matchJobsToProfile(jobs, skills, preferences);
      const categorized = categorizeMatches(allMatches);
      setMatches(categorized);
      store.setMatches(allMatches);
    }
  }, [skills, jobs, preferences]);

  useInput((input, key) => {
    if (key.escape) {
      if (selectedMatch) {
        setSelectedMatch(null);
      } else {
        navigate('welcome');
      }
    }

    // Category switching
    if (input === '1') setCategory(CATEGORIES.WANT);
    if (input === '2') setCategory(CATEGORIES.QUALIFIED);
    if (input === '3') setCategory(CATEGORIES.STRETCH);
  });

  if (!skills || Object.keys(skills.languages || {}).length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No skills profile found.</Text>
        <Text color="gray">Run analysis first to see matches.</Text>
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

  if (!jobs || jobs.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No jobs imported.</Text>
        <Text color="gray">Import jobs to see matches.</Text>
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

  if (!matches) {
    return (
      <Box>
        <Text color="cyan">Calculating matches...</Text>
      </Box>
    );
  }

  // Show match detail
  if (selectedMatch) {
    return (
      <MatchDetail
        match={selectedMatch}
        onBack={() => setSelectedMatch(null)}
        onGenerate={() => {
          store.update('selectedJobId', selectedMatch.job.id);
          navigate('generate');
        }}
      />
    );
  }

  const currentMatches = matches[category] || [];

  return (
    <Box flexDirection="column">
      {/* Category tabs */}
      <Box marginBottom={1}>
        <Text
          color={category === CATEGORIES.WANT ? 'green' : 'gray'}
          bold={category === CATEGORIES.WANT}
        >
          [1] Want ({matches.want?.length || 0})
        </Text>
        <Text color="gray"> │ </Text>
        <Text
          color={category === CATEGORIES.QUALIFIED ? 'cyan' : 'gray'}
          bold={category === CATEGORIES.QUALIFIED}
        >
          [2] Qualified ({matches.qualified?.length || 0})
        </Text>
        <Text color="gray"> │ </Text>
        <Text
          color={category === CATEGORIES.STRETCH ? 'yellow' : 'gray'}
          bold={category === CATEGORIES.STRETCH}
        >
          [3] Stretch ({matches.stretch?.length || 0})
        </Text>
      </Box>

      {/* Category description */}
      <Box marginBottom={1}>
        <Text color="gray" italic>
          {category === CATEGORIES.WANT &&
            'Jobs matching your preferences that you\'re qualified for'}
          {category === CATEGORIES.QUALIFIED &&
            'Jobs you\'re qualified for (may not match preferences)'}
          {category === CATEGORIES.STRETCH &&
            'Jobs that are a stretch - you have some required skills'}
        </Text>
      </Box>

      {/* Match list */}
      {currentMatches.length === 0 ? (
        <Box flexDirection="column">
          <Text color="gray">No matches in this category.</Text>
          {category === CATEGORIES.WANT && (
            <Text color="gray" dimColor>
              Try setting skill preferences in the Skills screen.
            </Text>
          )}
        </Box>
      ) : (
        <Box flexDirection="column">
          <SelectInput
            items={currentMatches.map((match) => ({
              label: formatMatchLabel(match),
              value: match,
            }))}
            onSelect={(item) => setSelectedMatch(item.value)}
            limit={12}
          />
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          [Enter] View details │ [1-3] Switch category │ [Esc] Back
        </Text>
      </Box>
    </Box>
  );
}

function formatMatchLabel(match) {
  const { job, score, wantMatch } = match;
  const scoreColor = score >= 70 ? '🟢' : score >= 50 ? '🟡' : '🟠';
  const wantIcon = wantMatch ? '★' : '';

  return `${scoreColor} ${score}% ${wantIcon} ${job.title} @ ${job.company}`;
}

function MatchDetail({ match, onBack, onGenerate }) {
  const { job, score, matchedSkills, missingSkills, bonusSkills } = match;

  return (
    <Box flexDirection="column">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        marginBottom={1}
      >
        <Box>
          <Text bold color="white">
            {job.title}
          </Text>
          <Text color="gray"> @ </Text>
          <Text color="cyan">{job.company}</Text>
        </Box>

        <Text color="gray">{job.location}</Text>

        {job.salary && (
          <Text color="green">💰 {job.salary}</Text>
        )}

        {/* Match score */}
        <Box marginTop={1}>
          <Text color={score >= 70 ? 'green' : score >= 50 ? 'yellow' : 'red'}>
            Match Score: {score}%
          </Text>
        </Box>
      </Box>

      {/* Matched skills */}
      {matchedSkills?.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="green" bold>
            ✓ Matched Skills ({matchedSkills.length})
          </Text>
          <Box marginLeft={2} flexWrap="wrap">
            {matchedSkills.map((skill, i) => (
              <Text key={skill.name} color="green">
                {skill.name}
                {i < matchedSkills.length - 1 ? ', ' : ''}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Missing skills */}
      {missingSkills?.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="red" bold>
            ✗ Missing Skills ({missingSkills.length})
          </Text>
          <Box marginLeft={2} flexWrap="wrap">
            {missingSkills.map((skill, i) => (
              <Text key={skill} color="red">
                {skill}
                {i < missingSkills.length - 1 ? ', ' : ''}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Bonus skills */}
      {bonusSkills?.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="yellow" bold>
            ★ Bonus Skills (mentioned in description)
          </Text>
          <Box marginLeft={2} flexWrap="wrap">
            {bonusSkills.map((skill, i) => (
              <Text key={skill.name} color="yellow">
                {skill.name}
                {i < bonusSkills.length - 1 ? ', ' : ''}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Job description excerpt */}
      {job.description && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="gray" bold>
            Description:
          </Text>
          <Text color="gray" marginLeft={2}>
            {job.description.slice(0, 250)}
            {job.description.length > 250 ? '...' : ''}
          </Text>
        </Box>
      )}

      {/* Actions */}
      <SelectInput
        items={[
          { label: '📝 Generate Application', value: 'generate' },
          { label: '🔗 Open URL', value: 'url' },
          { label: '← Back to List', value: 'back' },
        ]}
        onSelect={(item) => {
          if (item.value === 'generate') {
            onGenerate();
          } else if (item.value === 'url' && job.url) {
            // Open URL in browser
            const { execSync } = require('child_process');
            try {
              execSync(`open "${job.url}"`);
            } catch {
              try {
                execSync(`xdg-open "${job.url}"`);
              } catch {
                // Windows
                execSync(`start "${job.url}"`);
              }
            }
          } else {
            onBack();
          }
        }}
      />
    </Box>
  );
}
