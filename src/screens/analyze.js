/**
 * Analyze Screen
 *
 * Walks through repositories one at a time, showing analysis
 * and letting the user curate their "food bowl".
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { discoverRepos, analyzeRepo } from '../lib/analyzer.js';
import { buildSkillsProfile } from '../lib/skills.js';

const STATES = {
  DISCOVERING: 'discovering',
  REVIEWING: 'reviewing',
  ANALYZING: 'analyzing',
  COMPLETE: 'complete',
};

export default function AnalyzeScreen({ navigate, store, args }) {
  const [state, setState] = useState(STATES.DISCOVERING);
  const [repos, setRepos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analyzedRepos, setAnalyzedRepos] = useState([]);
  const [error, setError] = useState(null);

  const scanPath = args.path || process.cwd();

  // Discover repos on mount
  useEffect(() => {
    try {
      const discovered = discoverRepos(scanPath);
      setRepos(discovered);
      setState(discovered.length > 0 ? STATES.REVIEWING : STATES.COMPLETE);

      if (discovered.length > 0) {
        // Start analyzing first repo
        analyzeCurrentRepo(discovered[0]);
      }
    } catch (e) {
      setError(`Failed to scan directory: ${e.message}`);
    }
  }, [scanPath]);

  const analyzeCurrentRepo = async (repo) => {
    setState(STATES.ANALYZING);
    try {
      const analysis = analyzeRepo(repo.path);
      setCurrentAnalysis(analysis);
      setState(STATES.REVIEWING);
    } catch (e) {
      setCurrentAnalysis({ ...repo, error: e.message });
      setState(STATES.REVIEWING);
    }
  };

  const handleAction = (action) => {
    const current = currentAnalysis;

    switch (action) {
      case 'include':
        setAnalyzedRepos((prev) => [...prev, { ...current, excluded: false }]);
        goToNext();
        break;

      case 'exclude':
        setAnalyzedRepos((prev) => [...prev, { ...current, excluded: true }]);
        goToNext();
        break;

      case 'skip':
        goToNext();
        break;

      case 'finish':
        finishAnalysis();
        break;

      case 'back':
        navigate('welcome');
        break;
    }
  };

  const goToNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= repos.length) {
      finishAnalysis();
    } else {
      setCurrentIndex(nextIndex);
      analyzeCurrentRepo(repos[nextIndex]);
    }
  };

  const finishAnalysis = () => {
    // Build skills profile from analyzed repos
    const includedRepos = analyzedRepos.filter((r) => !r.excluded);
    if (includedRepos.length > 0) {
      const profile = buildSkillsProfile(includedRepos);
      store.update('skills', profile);
      store.update('repos', analyzedRepos);
    }
    setState(STATES.COMPLETE);
  };

  // Keyboard shortcuts
  useInput((input, key) => {
    if (state !== STATES.REVIEWING) return;

    if (input === 'i' || key.return) handleAction('include');
    if (input === 'e') handleAction('exclude');
    if (input === 's') handleAction('skip');
    if (input === 'f') handleAction('finish');
    if (key.escape) handleAction('back');
  });

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Press any key to go back</Text>
      </Box>
    );
  }

  if (state === STATES.DISCOVERING) {
    return (
      <Box>
        <Text color="yellow">🐕 </Text>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Sniffing for repositories in {scanPath}...</Text>
        <Text color="yellow"> 🦴</Text>
      </Box>
    );
  }

  if (state === STATES.ANALYZING) {
    return (
      <Box>
        <Text color="yellow">🐕 </Text>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Fetching {repos[currentIndex]?.name}...</Text>
        <Text color="yellow"> 🦴</Text>
      </Box>
    );
  }

  if (state === STATES.COMPLETE) {
    const included = analyzedRepos.filter((r) => !r.excluded);
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="yellow">{`    /^ ^\\
   / ◕ ◕ \\
   V\\ ᴥ /V   `}</Text>
          <Box flexDirection="column">
            <Text color="green" bold>
              Woof! Analysis Complete! 🦴
            </Text>
            <Text>
              Sniffed out {analyzedRepos.length} repositories, kept {included.length} in the bowl!
            </Text>
            {included.length > 0 && (
              <Text color="gray">
                Skills profile has been saved. Good boy!
              </Text>
            )}
          </Box>
        </Box>
        <SelectInput
          items={[
            { label: '🦴 View Skills Profile', value: 'skills' },
            { label: '🐾 Back to Menu', value: 'welcome' },
          ]}
          onSelect={(item) => navigate(item.value)}
        />
      </Box>
    );
  }

  // REVIEWING state - show current repo
  const repo = currentAnalysis;
  const progress = `${currentIndex + 1}/${repos.length}`;

  return (
    <Box flexDirection="column">
      {/* Progress indicator */}
      <Box marginBottom={1}>
        <Text color="gray">
          Repository {progress}
        </Text>
        <Text color="cyan"> │ </Text>
        <Text color="gray">
          {analyzedRepos.filter((r) => !r.excluded).length} included
        </Text>
      </Box>

      {/* Repo info box */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        marginBottom={1}
      >
        <Text bold color="white">
          {repo.name}
        </Text>
        <Text color="gray" dimColor>
          {repo.path}
        </Text>

        {repo.error ? (
          <Text color="red">Error: {repo.error}</Text>
        ) : (
          <>
            {/* Git info */}
            <Box marginTop={1}>
              <Text color="gray">Last commit: </Text>
              <Text color={repo.git?.freshness === 'fresh' ? 'green' : repo.git?.freshness === 'stale' ? 'yellow' : 'white'}>
                {repo.git?.daysSinceCommit || '?'} days ago
              </Text>
              <Text color="gray"> ({repo.git?.commitCount || 0} commits)</Text>
            </Box>

            {/* Freshness warning */}
            {repo.git?.freshness === 'stale' && (
              <Box marginTop={1}>
                <Text color="yellow">
                  ⚠ This repo may need a git pull
                </Text>
              </Box>
            )}

            {/* Languages */}
            {repo.languages?.length > 0 && (
              <Box marginTop={1} flexDirection="column">
                <Text color="gray">Languages:</Text>
                <Box marginLeft={2} flexWrap="wrap">
                  {repo.languages.slice(0, 5).map((lang, i) => (
                    <Text key={lang.name} color="cyan">
                      {lang.name} ({lang.percentage}%)
                      {i < Math.min(repo.languages.length, 5) - 1 ? ', ' : ''}
                    </Text>
                  ))}
                </Box>
              </Box>
            )}

            {/* Patterns/Frameworks */}
            {repo.patterns?.length > 0 && (
              <Box marginTop={1} flexDirection="column">
                <Text color="gray">Detected:</Text>
                <Box marginLeft={2} flexWrap="wrap">
                  {repo.patterns.slice(0, 6).map((pattern, i) => (
                    <Text key={pattern} color="magenta">
                      {pattern}
                      {i < Math.min(repo.patterns.length, 6) - 1 ? ', ' : ''}
                    </Text>
                  ))}
                </Box>
              </Box>
            )}

            {/* File counts */}
            <Box marginTop={1}>
              <Text color="gray">
                Files: {repo.files?.total || 0} total, {repo.files?.code || 0} code
              </Text>
            </Box>
          </>
        )}
      </Box>

      {/* Actions */}
      <Box flexDirection="column">
        <Text color="white" bold>
          Actions:
        </Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>
            <Text color="green">[i]</Text>
            <Text color="gray"> Include in profile</Text>
          </Text>
          <Text>
            <Text color="red">[e]</Text>
            <Text color="gray"> Exclude from profile</Text>
          </Text>
          <Text>
            <Text color="yellow">[s]</Text>
            <Text color="gray"> Skip (decide later)</Text>
          </Text>
          <Text>
            <Text color="cyan">[f]</Text>
            <Text color="gray"> Finish analysis</Text>
          </Text>
          <Text>
            <Text color="gray">[Esc]</Text>
            <Text color="gray"> Back to menu</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
