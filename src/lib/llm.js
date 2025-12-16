/**
 * LLM Integration Layer
 *
 * Provides a unified interface for different LLM backends:
 * - Clipboard (manual copy/paste)
 * - Ollama (local)
 * - Anthropic API (Claude)
 * - OpenAI API
 */

import { execSync, spawn } from 'child_process';

/**
 * Available LLM providers
 */
export const PROVIDERS = {
  clipboard: {
    name: 'Clipboard',
    description: 'Copy prompt to clipboard, paste response back',
    requiresKey: false,
    local: true,
  },
  ollama: {
    name: 'Ollama',
    description: 'Local LLM via Ollama',
    requiresKey: false,
    local: true,
    defaultModel: 'llama3.2',
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    description: 'Claude API',
    requiresKey: true,
    local: false,
    defaultModel: 'claude-sonnet-4-20250514',
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT API',
    requiresKey: true,
    local: false,
    defaultModel: 'gpt-4o',
  },
};

/**
 * Create an LLM client based on configuration
 */
export function createLLMClient(config) {
  const { provider, model, apiKey, ollamaUrl } = config;

  switch (provider) {
    case 'clipboard':
      return new ClipboardClient();
    case 'ollama':
      return new OllamaClient(ollamaUrl || 'http://localhost:11434', model);
    case 'anthropic':
      return new AnthropicClient(apiKey, model);
    case 'openai':
      return new OpenAIClient(apiKey, model);
    default:
      return new ClipboardClient();
  }
}

/**
 * Clipboard-based "client" for manual LLM interaction
 */
class ClipboardClient {
  constructor() {
    this.name = 'clipboard';
  }

  async generate(prompt) {
    // Copy to clipboard
    this.copyToClipboard(prompt);

    return {
      success: true,
      mode: 'clipboard',
      message: 'Prompt copied to clipboard. Paste into your preferred LLM and copy the response.',
      prompt,
    };
  }

  copyToClipboard(text) {
    try {
      // macOS
      execSync('pbcopy', { input: text });
    } catch {
      try {
        // Linux
        execSync('xclip -selection clipboard', { input: text });
      } catch {
        try {
          // Windows
          execSync('clip', { input: text });
        } catch {
          // Fallback: write to temp file
          return false;
        }
      }
    }
    return true;
  }

  getClipboard() {
    try {
      return execSync('pbpaste', { encoding: 'utf-8' });
    } catch {
      try {
        return execSync('xclip -selection clipboard -o', { encoding: 'utf-8' });
      } catch {
        return null;
      }
    }
  }
}

/**
 * Ollama local LLM client
 */
class OllamaClient {
  constructor(baseUrl, model) {
    this.baseUrl = baseUrl;
    this.model = model || 'llama3.2';
    this.name = 'ollama';
  }

  async generate(prompt, options = {}) {
    const { stream = false } = options;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      if (stream) {
        return {
          success: true,
          stream: response.body,
        };
      }

      const data = await response.json();
      return {
        success: true,
        content: data.response,
        model: this.model,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestion: 'Make sure Ollama is running: ollama serve',
      };
    }
  }

  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models || [];
    } catch {
      return [];
    }
  }

  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Anthropic (Claude) API client
 */
class AnthropicClient {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model || 'claude-sonnet-4-20250514';
    this.name = 'anthropic';
  }

  async generate(prompt, options = {}) {
    const { maxTokens = 4096 } = options;

    if (!this.apiKey) {
      return {
        success: false,
        error: 'Anthropic API key not configured',
        suggestion: 'Set your API key in settings',
      };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        content: data.content[0]?.text || '',
        model: this.model,
        usage: data.usage,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * OpenAI API client
 */
class OpenAIClient {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model || 'gpt-4o';
    this.name = 'openai';
  }

  async generate(prompt, options = {}) {
    const { maxTokens = 4096 } = options;

    if (!this.apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured',
        suggestion: 'Set your API key in settings',
      };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        content: data.choices[0]?.message?.content || '',
        model: this.model,
        usage: data.usage,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaAvailable(url = 'http://localhost:11434') {
  try {
    const response = await fetch(`${url}/api/tags`, { timeout: 2000 });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Detect available LLM providers
 */
export async function detectAvailableProviders() {
  const available = ['clipboard']; // Always available

  // Check Ollama
  if (await checkOllamaAvailable()) {
    available.push('ollama');
  }

  // API providers are always "available" if keys are configured
  // (we check keys at runtime)
  available.push('anthropic', 'openai');

  return available;
}
