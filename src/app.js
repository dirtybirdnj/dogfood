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
  const screenInfo = {
    welcome: { icon: '🐾', title: 'Welcome' },
    analyze: { icon: '🔍', title: 'Analyze Repos' },
    skills: { icon: '📊', title: 'Skills Profile' },
    jobs: { icon: '📋', title: 'Job Board' },
    match: { icon: '🎯', title: 'Job Matches' },
    generate: { icon: '📝', title: 'Generate Application' },
    settings: { icon: '⚙️', title: 'Settings' },
  }[currentScreen] || { icon: '🐾', title: 'Dogfood' };

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={2}>
      <Text bold color="yellow">🦴</Text>
      <Text bold color="cyan"> DOGFOOD </Text>
      <Text bold color="yellow">🦴</Text>
      <Text color="gray"> │ </Text>
      <Text>{screenInfo.icon} </Text>
      <Text color="white">{screenInfo.title}</Text>
    </Box>
  );
}

function Footer() {
  return (
    <Box marginTop={1} flexDirection="column">
      <Text color="gray" dimColor>
        ·═══════════════════════════════════════════════════════════════════·
      </Text>
      <Box>
        <Text color="yellow">🦴 </Text>
        <Text color="gray" dimColor>
          Ctrl+Q quit │ ? help │ Tab navigate
        </Text>
        <Text color="gray" dimColor>                              </Text>
        <Text color="gray" dimColor>v0.1.0 </Text>
        <Text color="yellow">🦴</Text>
      </Box>
    </Box>
  );
}
