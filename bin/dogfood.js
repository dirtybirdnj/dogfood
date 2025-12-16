/**
 * Dogfood CLI Entry Point
 *
 * Analyze your skills from local codebases, find matching jobs,
 * and generate tailored resumes and cover letters.
 */

import { render } from 'ink';
import React from 'react';
import App from '../src/app.js';
import { parseArgs } from '../src/lib/cli.js';

const args = parseArgs(process.argv.slice(2));

render(React.createElement(App, { args }));
