import * as esbuild from 'esbuild';
import { existsSync, mkdirSync } from 'fs';

// Ensure dist directory exists
if (!existsSync('dist')) {
  mkdirSync('dist');
}

// Build the main entry point
await esbuild.build({
  entryPoints: ['bin/dogfood.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/dogfood.mjs',
  banner: {
    js: '#!/usr/bin/env node\nimport { createRequire } from "module";\nconst require = createRequire(import.meta.url);',
  },
  external: [
    // Keep native modules external
    'fsevents',
  ],
  // Treat all .js files as JSX
  loader: {
    '.js': 'jsx',
  },
  jsx: 'automatic',
  jsxImportSource: 'react',
  logLevel: 'info',
  // Make optional imports not fail at runtime
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  // Alias react-devtools-core to an empty module
  alias: {
    'react-devtools-core': './src/lib/empty.js',
  },
});

console.log('Build complete: dist/dogfood.mjs');
