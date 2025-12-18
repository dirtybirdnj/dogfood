/**
 * Welcome Screen
 *
 * The entry point for the Dogfood TUI.
 * Shows a menu of available actions.
 */

import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

const DOG = `
    /^ ^\\
   / 0 0 \\
   V\\ Y /V
    / - \\
   /|   |\\
  (_|   |_)`;

const LOGO = `
    ____                   ____                __
   / __ \\____  ____ _     / __/___  ____  ____/ /
  / / / / __ \\/ __ \`/    / /_/ __ \\/ __ \\/ __  /
 / /_/ / /_/ / /_/ /    / __/ /_/ / /_/ / /_/ /
/_____/\\____/\\__, /    /_/  \\____/\\____/\\__,_/
            /____/
`;

const TAGLINE = '🦴 Eat your own dogfood. Analyze skills. Land jobs. 🦴';

export default function WelcomeScreen({ navigate, store }) {
  const hasProfile = Object.keys(store.skills?.languages || {}).length > 0;
  const hasJobs = store.jobs?.length > 0;

  const menuItems = [
    {
      label: '🔍  Analyze Repos',
      value: 'analyze',
      description: 'Scan your projects to build a skills profile',
    },
    {
      label: '📊  View Skills Profile',
      value: 'skills',
      description: hasProfile ? 'Review your analyzed skills' : 'Run analysis first',
      disabled: !hasProfile,
    },
    {
      label: '📥  Manage Jobs',
      value: 'jobs',
      description: hasJobs ? `${store.jobs.length} jobs loaded` : 'Import job listings',
    },
    {
      label: '🎯  Match Jobs',
      value: 'match',
      description: 'Find jobs that match your skills',
      disabled: !hasProfile || !hasJobs,
    },
    {
      label: '📝  Generate Application',
      value: 'generate',
      description: 'Create tailored resume & cover letter',
      disabled: !hasProfile,
    },
    {
      label: '⚙️   Settings',
      value: 'settings',
      description: 'Configure LLM, preferences, and more',
    },
  ];

  const handleSelect = (item) => {
    if (item.disabled) return;
    navigate(item.value);
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Box>
          <Text color="yellow">{DOG}</Text>
          <Text color="cyan">{LOGO}</Text>
        </Box>
      </Box>

      <Box marginBottom={2}>
        <Text color="gray" italic>
          {TAGLINE}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Text color="white" bold>
          🐾 Quick Status:
        </Text>
        <Box marginLeft={2} flexDirection="column">
          <Text color={hasProfile ? 'green' : 'yellow'}>
            {hasProfile
              ? `🦴 Skills profile loaded (${Object.keys(store.skills.languages).length} languages)`
              : '○ No skills profile yet - time to fetch!'}
          </Text>
          <Text color={hasJobs ? 'green' : 'yellow'}>
            {hasJobs
              ? `🦴 ${store.jobs.length} jobs in the bowl`
              : '○ No jobs imported - bowl is empty!'}
          </Text>
          <Text color={store.llm?.provider !== 'clipboard' ? 'green' : 'gray'}>
            {store.llm?.provider !== 'clipboard'
              ? `🦴 LLM: ${store.llm.provider}`
              : '○ LLM: Clipboard mode'}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text color="white" bold marginBottom={1}>
          What would you like to do?
        </Text>
        <SelectInput
          items={menuItems.map((item) => ({
            ...item,
            label: item.disabled
              ? `${item.label} (disabled)`
              : item.label,
          }))}
          onSelect={handleSelect}
        />
      </Box>
    </Box>
  );
}
