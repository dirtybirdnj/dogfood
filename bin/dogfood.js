/**
 * Dogfood CLI Entry Point
 *
 * Analyze your skills from local codebases, find matching jobs,
 * and generate tailored resumes and cover letters.
 *
 * Modes:
 *   Interactive (TUI): dogfood
 *   Agentic (JSON):    dogfood <command> --json
 */

import { parseArgs, isAgenticMode, printHelp } from '../src/lib/cli.js';
import { runAgenticCommand, getToolSchema } from '../src/lib/agentic.js';

const args = parseArgs(process.argv.slice(2));

// Handle help flag
if (args.help) {
  if (args.json) {
    // Output tool schema for MCP/LLM use
    console.log(JSON.stringify(getToolSchema(), null, 2));
  } else {
    console.log(printHelp());
  }
  process.exit(0);
}

// Handle version flag
if (args.version) {
  const version = '0.1.0';
  if (args.json) {
    console.log(JSON.stringify({ version }));
  } else {
    console.log(`dogfood v${version}`);
  }
  process.exit(0);
}

// Route to agentic mode or TUI
if (isAgenticMode(args)) {
  // Agentic mode - non-interactive JSON output
  runAgenticCommand(args)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(JSON.stringify({ error: err.message, stack: err.stack }));
      process.exit(1);
    });
} else {
  // Interactive TUI mode
  const { render } = await import('ink');
  const React = await import('react');
  const { default: App } = await import('../src/app.js');

  render(React.createElement(App, { args }));
}
