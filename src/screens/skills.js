/**
 * Skills Screen
 *
 * Displays the user's analyzed skills profile with the ability
 * to mark skills as "want to use" or "want to avoid".
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { formatSkillsForDisplay } from '../lib/skills.js';

const VIEWS = {
  OVERVIEW: 'overview',
  LANGUAGES: 'languages',
  FRAMEWORKS: 'frameworks',
  PREFERENCES: 'preferences',
};

export default function SkillsScreen({ navigate, store }) {
  const [view, setView] = useState(VIEWS.OVERVIEW);
  const [selectedSkill, setSelectedSkill] = useState(null);

  const { skills, preferences } = store;

  // Handle keyboard navigation
  useInput((input, key) => {
    if (key.escape) {
      if (view !== VIEWS.OVERVIEW) {
        setView(VIEWS.OVERVIEW);
      } else {
        navigate('welcome');
      }
    }
  });

  if (!skills || Object.keys(skills.languages || {}).length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No skills profile found.</Text>
        <Text color="gray">Run analysis first to build your profile.</Text>
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

  if (view === VIEWS.OVERVIEW) {
    return <OverviewView skills={skills} setView={setView} navigate={navigate} />;
  }

  if (view === VIEWS.LANGUAGES) {
    return (
      <DetailView
        title="Languages"
        items={skills.languages}
        setView={setView}
        store={store}
      />
    );
  }

  if (view === VIEWS.FRAMEWORKS) {
    return (
      <DetailView
        title="Frameworks & Libraries"
        items={skills.frameworks}
        setView={setView}
        store={store}
      />
    );
  }

  if (view === VIEWS.PREFERENCES) {
    return <PreferencesView store={store} setView={setView} />;
  }

  return null;
}

function OverviewView({ skills, setView, navigate }) {
  const summary = skills.summary || {};

  const menuItems = [
    { label: '📚 Languages', value: VIEWS.LANGUAGES },
    { label: '🔧 Frameworks & Libraries', value: VIEWS.FRAMEWORKS },
    { label: '⭐ Set Preferences', value: VIEWS.PREFERENCES },
    { label: '← Back to Menu', value: 'welcome' },
  ];

  return (
    <Box flexDirection="column">
      {/* Summary stats */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        marginBottom={1}
      >
        <Text bold color="white">
          Skills Summary
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Text>
            <Text color="gray">Projects Analyzed: </Text>
            <Text color="cyan">{summary.totalRepos || 0}</Text>
          </Text>
          <Text>
            <Text color="gray">Total Commits: </Text>
            <Text color="cyan">{summary.totalCommits || 0}</Text>
          </Text>
          <Text>
            <Text color="gray">Years Active: </Text>
            <Text color="cyan">{summary.yearsActive || 0}</Text>
          </Text>
        </Box>
      </Box>

      {/* Top languages */}
      {summary.topLanguages?.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="white" bold>
            Top Languages:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            {summary.topLanguages.map((lang) => (
              <Text key={lang.name}>
                <Text color="cyan">{lang.name}</Text>
                <Text color="gray">
                  {' '}
                  - {lang.proficiency} ({lang.repoCount} projects)
                </Text>
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Top frameworks */}
      {summary.topFrameworks?.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="white" bold>
            Top Frameworks:
          </Text>
          <Box marginLeft={2} flexDirection="column">
            {summary.topFrameworks.map((fw) => (
              <Text key={fw.name}>
                <Text color="magenta">{fw.name}</Text>
                <Text color="gray"> - {fw.proficiency}</Text>
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Domains */}
      {skills.domains?.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="white" bold>
            Domain Expertise:
          </Text>
          <Box marginLeft={2} flexWrap="wrap">
            {skills.domains.map((domain, i) => (
              <Text key={domain} color="green">
                {domain}
                {i < skills.domains.length - 1 ? ', ' : ''}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Navigation */}
      <Box marginTop={1}>
        <SelectInput
          items={menuItems}
          onSelect={(item) => {
            if (item.value === 'welcome') {
              navigate('welcome');
            } else {
              setView(item.value);
            }
          }}
        />
      </Box>
    </Box>
  );
}

function DetailView({ title, items, setView, store }) {
  const itemList = Object.entries(items || {})
    .sort((a, b) => (b[1].repoCount || 0) - (a[1].repoCount || 0))
    .map(([name, data]) => ({
      name,
      ...data,
    }));

  const wantSkills = store.preferences?.wantSkills || [];
  const avoidSkills = store.preferences?.avoidSkills || [];

  const toggleWant = (skillName) => {
    const current = store.preferences?.wantSkills || [];
    const updated = current.includes(skillName)
      ? current.filter((s) => s !== skillName)
      : [...current, skillName];
    store.update('preferences.wantSkills', updated);
  };

  const toggleAvoid = (skillName) => {
    const current = store.preferences?.avoidSkills || [];
    const updated = current.includes(skillName)
      ? current.filter((s) => s !== skillName)
      : [...current, skillName];
    store.update('preferences.avoidSkills', updated);
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="white">
          {title}
        </Text>
        <Text color="gray"> ({itemList.length} total)</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {itemList.map((item) => {
          const isWant = wantSkills.includes(item.name);
          const isAvoid = avoidSkills.includes(item.name);

          return (
            <Box key={item.name}>
              <Text color={isWant ? 'green' : isAvoid ? 'red' : 'white'}>
                {isWant ? '★ ' : isAvoid ? '✗ ' : '  '}
                {item.name}
              </Text>
              <Text color="gray">
                {' '}
                - {item.proficiency || 'familiar'}
                {item.repoCount ? ` (${item.repoCount} projects)` : ''}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="gray" dimColor>
          Press [Esc] to go back
        </Text>
      </Box>
    </Box>
  );
}

function PreferencesView({ store, setView }) {
  const [mode, setMode] = useState('want'); // 'want' or 'avoid'

  const allSkills = [
    ...Object.keys(store.skills?.languages || {}),
    ...Object.keys(store.skills?.frameworks || {}),
  ].sort();

  const wantSkills = store.preferences?.wantSkills || [];
  const avoidSkills = store.preferences?.avoidSkills || [];

  const toggleSkill = (skill) => {
    if (mode === 'want') {
      const updated = wantSkills.includes(skill)
        ? wantSkills.filter((s) => s !== skill)
        : [...wantSkills, skill];
      store.update('preferences.wantSkills', updated);
    } else {
      const updated = avoidSkills.includes(skill)
        ? avoidSkills.filter((s) => s !== skill)
        : [...avoidSkills, skill];
      store.update('preferences.avoidSkills', updated);
    }
  };

  const items = allSkills.map((skill) => {
    const isWant = wantSkills.includes(skill);
    const isAvoid = avoidSkills.includes(skill);
    let prefix = '○';
    if (isWant) prefix = '★';
    if (isAvoid) prefix = '✗';

    return {
      label: `${prefix} ${skill}`,
      value: skill,
      isWant,
      isAvoid,
    };
  });

  return (
    <Box flexDirection="column">
      <Text bold color="white">
        Set Skill Preferences
      </Text>
      <Text color="gray" marginBottom={1}>
        Mark skills you want to use (★) or want to avoid (✗)
      </Text>

      <Box marginBottom={1}>
        <Text color={mode === 'want' ? 'green' : 'gray'}>
          [w] Want to use
        </Text>
        <Text color="gray"> │ </Text>
        <Text color={mode === 'avoid' ? 'red' : 'gray'}>
          [a] Want to avoid
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text color="green">Want: {wantSkills.join(', ') || 'None'}</Text>
        <Text color="red">Avoid: {avoidSkills.join(', ') || 'None'}</Text>
      </Box>

      <SelectInput
        items={items}
        onSelect={(item) => toggleSkill(item.value)}
      />

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          [Esc] Back
        </Text>
      </Box>
    </Box>
  );
}
