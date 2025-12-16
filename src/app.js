/**
 * Main Dogfood Application
 *
 * A TUI for analyzing skills, matching jobs, and generating applications.
 * Built with Ink (React for CLI) for a smooth, modern experience.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

// Screens
import WelcomeScreen from './screens/welcome.js';
import AnalyzeScreen from './screens/analyze.js';
import SkillsScreen from './screens/skills.js';
import JobsScreen from './screens/jobs.js';
import MatchScreen from './screens/match.js';
import GenerateScreen from './screens/generate.js';
import SettingsScreen from './screens/settings.js';

// State management
import { useStore } from './lib/store.js';

const SCREENS = {
  welcome: WelcomeScreen,
  analyze: AnalyzeScreen,
  skills: SkillsScreen,
  jobs: JobsScreen,
  match: MatchScreen,
  generate: GenerateScreen,
  settings: SettingsScreen,
};

export default function App({ args }) {
  const { exit } = useApp();
  const [currentScreen, setScreen] = useState('welcome');
  const store = useStore();

  // Global keybindings
  useInput((input, key) => {
    if (input === 'q' && key.ctrl) {
      exit();
    }
  });

  // Handle CLI args for direct navigation
  useEffect(() => {
    if (args.screen && SCREENS[args.screen]) {
      setScreen(args.screen);
    }
  }, [args.screen]);

  const Screen = SCREENS[currentScreen];

  return (
    <Box flexDirection="column" padding={1}>
      <Header currentScreen={currentScreen} />
      <Box flexDirection="column" marginTop={1}>
        <Screen
          navigate={setScreen}
          store={store}
          args={args}
        />
      </Box>
      <Footer />
    </Box>
  );
}

function Header({ currentScreen }) {
  const title = {
    welcome: 'Welcome',
    analyze: 'Analyze Repos',
    skills: 'Skills Profile',
    jobs: 'Job Board',
    match: 'Job Matches',
    generate: 'Generate Application',
    settings: 'Settings',
  }[currentScreen] || 'Dogfood';

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={2}>
      <Text bold color="cyan">🦴 DOGFOOD</Text>
      <Text color="gray"> │ </Text>
      <Text color="white">{title}</Text>
    </Box>
  );
}

function Footer() {
  return (
    <Box marginTop={1}>
      <Text color="gray" dimColor>
        Ctrl+Q quit │ ? help │ Tab navigate
      </Text>
    </Box>
  );
}
