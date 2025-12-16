/**
 * Settings Screen
 *
 * Configure LLM provider, user info, and preferences.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { PROVIDERS, checkOllamaAvailable } from '../lib/llm.js';
import { paths } from '../lib/config.js';

const VIEWS = {
  MENU: 'menu',
  LLM: 'llm',
  USER_INFO: 'user_info',
  LOCATIONS: 'locations',
  RESET: 'reset',
};

export default function SettingsScreen({ navigate, store }) {
  const [view, setView] = useState(VIEWS.MENU);
  const [editingField, setEditingField] = useState(null);
  const [inputValue, setInputValue] = useState('');

  useInput((input, key) => {
    if (key.escape) {
      if (editingField) {
        setEditingField(null);
      } else if (view !== VIEWS.MENU) {
        setView(VIEWS.MENU);
      } else {
        navigate('welcome');
      }
    }
  });

  if (view === VIEWS.MENU) {
    const llmProvider = PROVIDERS[store.llm?.provider || 'clipboard'];

    return (
      <Box flexDirection="column">
        <Text bold color="white" marginBottom={1}>
          Settings
        </Text>

        {/* Current settings summary */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="gray"
          paddingX={2}
          paddingY={1}
          marginBottom={1}
        >
          <Text color="gray">Current Configuration:</Text>
          <Text>
            <Text color="gray">LLM: </Text>
            <Text color="cyan">{llmProvider.name}</Text>
          </Text>
          <Text>
            <Text color="gray">User: </Text>
            <Text color="white">{store.userInfo?.name || 'Not set'}</Text>
          </Text>
          <Text>
            <Text color="gray">Locations: </Text>
            <Text color="white">
              {store.preferences?.locations?.join(', ') || 'Not set'}
            </Text>
          </Text>
          <Text>
            <Text color="gray">Data: </Text>
            <Text color="gray" dimColor>
              {paths.CONFIG_DIR}
            </Text>
          </Text>
        </Box>

        <SelectInput
          items={[
            { label: '🤖 Configure LLM', value: 'llm' },
            { label: '👤 User Information', value: 'user_info' },
            { label: '📍 Location Preferences', value: 'locations' },
            { label: '🗑️  Reset All Data', value: 'reset' },
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

  if (view === VIEWS.LLM) {
    return <LLMSettings store={store} setView={setView} />;
  }

  if (view === VIEWS.USER_INFO) {
    return (
      <UserInfoSettings
        store={store}
        setView={setView}
        editingField={editingField}
        setEditingField={setEditingField}
        inputValue={inputValue}
        setInputValue={setInputValue}
      />
    );
  }

  if (view === VIEWS.LOCATIONS) {
    return (
      <LocationSettings
        store={store}
        setView={setView}
        inputValue={inputValue}
        setInputValue={setInputValue}
      />
    );
  }

  if (view === VIEWS.RESET) {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>
          Reset All Data
        </Text>
        <Text color="gray" marginY={1}>
          This will delete all your analyzed skills, imported jobs, and settings.
        </Text>
        <SelectInput
          items={[
            { label: '⚠️  Yes, Reset Everything', value: 'confirm' },
            { label: '← Cancel', value: 'cancel' },
          ]}
          onSelect={(item) => {
            if (item.value === 'confirm') {
              store.reset();
              setView(VIEWS.MENU);
            } else {
              setView(VIEWS.MENU);
            }
          }}
        />
      </Box>
    );
  }

  return null;
}

function LLMSettings({ store, setView }) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState(null);

  const currentProvider = store.llm?.provider || 'clipboard';

  // Check Ollama on mount
  React.useEffect(() => {
    checkOllamaAvailable().then(setOllamaStatus);
  }, []);

  const providerItems = Object.entries(PROVIDERS).map(([key, info]) => {
    let status = '';
    if (key === 'ollama') {
      status = ollamaStatus === null ? ' (checking...)' : ollamaStatus ? ' ✓' : ' (not running)';
    }
    if (key === currentProvider) {
      status += ' [active]';
    }

    return {
      label: `${info.name}${status}`,
      value: key,
      info,
    };
  });

  if (editingKey) {
    return (
      <Box flexDirection="column">
        <Text bold color="white" marginBottom={1}>
          Enter API Key for {PROVIDERS[editingKey].name}
        </Text>
        <Box>
          <Text color="gray">API Key: </Text>
          <TextInput
            value={apiKeyInput}
            onChange={setApiKeyInput}
            onSubmit={() => {
              store.update('llm.apiKey', apiKeyInput);
              store.update('llm.provider', editingKey);
              setEditingKey(null);
              setApiKeyInput('');
            }}
            mask="*"
          />
        </Box>
        <Text color="gray" marginTop={1} dimColor>
          [Enter] Save │ [Esc] Cancel
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="white" marginBottom={1}>
        Select LLM Provider
      </Text>

      <SelectInput
        items={providerItems}
        onSelect={(item) => {
          if (item.info.requiresKey) {
            setEditingKey(item.value);
          } else {
            store.update('llm.provider', item.value);
            setView(VIEWS.MENU);
          }
        }}
      />

      <Box marginTop={1} flexDirection="column">
        <Text color="gray" dimColor>
          Clipboard: Copy prompts, paste into any LLM manually
        </Text>
        <Text color="gray" dimColor>
          Ollama: Run LLMs locally (requires ollama serve)
        </Text>
        <Text color="gray" dimColor>
          API providers: Requires API key (billed by usage)
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          [Esc] Back
        </Text>
      </Box>
    </Box>
  );
}

function UserInfoSettings({ store, setView, editingField, setEditingField, inputValue, setInputValue }) {
  const userInfo = store.userInfo || {};

  const fields = [
    { key: 'name', label: 'Name', value: userInfo.name },
    { key: 'email', label: 'Email', value: userInfo.email },
    { key: 'phone', label: 'Phone', value: userInfo.phone },
    { key: 'location', label: 'Location', value: userInfo.location },
    { key: 'linkedin', label: 'LinkedIn', value: userInfo.linkedin },
    { key: 'github', label: 'GitHub', value: userInfo.github },
    { key: 'portfolio', label: 'Portfolio', value: userInfo.portfolio },
  ];

  if (editingField) {
    const field = fields.find((f) => f.key === editingField);
    return (
      <Box flexDirection="column">
        <Text bold color="white" marginBottom={1}>
          Edit {field.label}
        </Text>
        <Box>
          <Text color="gray">{field.label}: </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => {
              store.update(`userInfo.${editingField}`, inputValue);
              setEditingField(null);
              setInputValue('');
            }}
          />
        </Box>
        <Text color="gray" marginTop={1} dimColor>
          [Enter] Save │ [Esc] Cancel
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="white" marginBottom={1}>
        User Information
      </Text>
      <Text color="gray" marginBottom={1}>
        Used when generating resumes and cover letters
      </Text>

      <SelectInput
        items={[
          ...fields.map((f) => ({
            label: `${f.label}: ${f.value || '(not set)'}`,
            value: f.key,
          })),
          { label: '← Back', value: 'back' },
        ]}
        onSelect={(item) => {
          if (item.value === 'back') {
            setView(VIEWS.MENU);
          } else {
            const field = fields.find((f) => f.key === item.value);
            setInputValue(field.value || '');
            setEditingField(item.value);
          }
        }}
      />
    </Box>
  );
}

function LocationSettings({ store, setView, inputValue, setInputValue }) {
  const [adding, setAdding] = useState(false);
  const locations = store.preferences?.locations || [];

  if (adding) {
    return (
      <Box flexDirection="column">
        <Text bold color="white" marginBottom={1}>
          Add Location
        </Text>
        <Box>
          <Text color="gray">Location: </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => {
              if (inputValue.trim()) {
                store.update('preferences.locations', [...locations, inputValue.trim()]);
              }
              setAdding(false);
              setInputValue('');
            }}
            placeholder="e.g., Burlington, VT or Remote"
          />
        </Box>
        <Text color="gray" marginTop={1} dimColor>
          [Enter] Add │ [Esc] Cancel
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="white" marginBottom={1}>
        Location Preferences
      </Text>
      <Text color="gray" marginBottom={1}>
        Filter job matches by these locations
      </Text>

      <SelectInput
        items={[
          { label: '+ Add Location', value: 'add' },
          ...locations.map((loc) => ({
            label: `✗ Remove: ${loc}`,
            value: loc,
          })),
          { label: '← Back', value: 'back' },
        ]}
        onSelect={(item) => {
          if (item.value === 'back') {
            setView(VIEWS.MENU);
          } else if (item.value === 'add') {
            setAdding(true);
          } else {
            // Remove location
            store.update(
              'preferences.locations',
              locations.filter((l) => l !== item.value)
            );
          }
        }}
      />
    </Box>
  );
}
