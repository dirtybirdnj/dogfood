/**
 * Repository Analyzer
 *
 * Analyzes local repositories to extract skills, technologies, and patterns.
 * All analysis is done locally - no network requests.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { execSync } from 'child_process';

/**
 * Discover all git repositories in a directory
 */
export function discoverRepos(rootPath) {
  const repos = [];
  const entries = readdirSync(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    const repoPath = join(rootPath, entry.name);
    const gitDir = join(repoPath, '.git');

    if (existsSync(gitDir)) {
      repos.push({
        name: entry.name,
        path: repoPath,
      });
    }
  }

  return repos;
}

/**
 * Analyze a single repository
 */
export function analyzeRepo(repoPath) {
  const name = basename(repoPath);

  return {
    name,
    path: repoPath,
    git: analyzeGitHistory(repoPath),
    languages: analyzeLanguages(repoPath),
    dependencies: analyzeDependencies(repoPath),
    patterns: analyzePatterns(repoPath),
    files: countFiles(repoPath),
  };
}

/**
 * Analyze git history locally (no network)
 */
export function analyzeGitHistory(repoPath) {
  try {
    // Get last commit date
    const lastCommit = execSync('git log -1 --format=%ci 2>/dev/null', {
      cwd: repoPath,
      encoding: 'utf-8',
    }).trim();

    // Get first commit date
    const firstCommit = execSync('git log --reverse --format=%ci 2>/dev/null | head -1', {
      cwd: repoPath,
      encoding: 'utf-8',
      shell: true,
    }).trim();

    // Get total commit count
    const commitCount = parseInt(
      execSync('git rev-list --count HEAD 2>/dev/null', {
        cwd: repoPath,
        encoding: 'utf-8',
      }).trim(),
      10
    );

    // Get branch info
    const currentBranch = execSync('git branch --show-current 2>/dev/null', {
      cwd: repoPath,
      encoding: 'utf-8',
    }).trim();

    // Check if remote exists
    let hasRemote = false;
    let remoteBehind = 0;
    try {
      const remotes = execSync('git remote 2>/dev/null', {
        cwd: repoPath,
        encoding: 'utf-8',
      }).trim();
      hasRemote = remotes.length > 0;

      // Check how far behind (using local refs only, no fetch)
      if (hasRemote) {
        try {
          const behind = execSync(
            `git rev-list --count HEAD..@{upstream} 2>/dev/null`,
            { cwd: repoPath, encoding: 'utf-8' }
          ).trim();
          remoteBehind = parseInt(behind, 10) || 0;
        } catch {
          // No upstream tracking
        }
      }
    } catch {
      // No remotes
    }

    // Calculate freshness
    const daysSinceCommit = Math.floor(
      (Date.now() - new Date(lastCommit).getTime()) / (1000 * 60 * 60 * 24)
    );

    let freshness = 'fresh';
    if (daysSinceCommit > 90) freshness = 'stale';
    else if (daysSinceCommit > 30) freshness = 'aging';

    // Get contributors (from local history only)
    const authors = execSync(
      'git log --format="%aN" 2>/dev/null | sort | uniq -c | sort -rn | head -5',
      { cwd: repoPath, encoding: 'utf-8', shell: true }
    )
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const match = line.trim().match(/^(\d+)\s+(.+)$/);
        if (match) {
          return { name: match[2], commits: parseInt(match[1], 10) };
        }
        return null;
      })
      .filter(Boolean);

    return {
      lastCommit,
      firstCommit,
      commitCount,
      currentBranch,
      hasRemote,
      remoteBehind,
      daysSinceCommit,
      freshness,
      authors,
    };
  } catch (e) {
    return {
      error: 'Not a git repository or git history unavailable',
      lastCommit: null,
      commitCount: 0,
      freshness: 'unknown',
    };
  }
}

/**
 * Analyze languages by file extension
 */
export function analyzeLanguages(repoPath) {
  const extensions = {};
  const ignorePatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    'vendor',
    '__pycache__',
    'target',
    '.cache',
  ];

  function walkDir(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (ignorePatterns.includes(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (ext) {
            extensions[ext] = (extensions[ext] || 0) + 1;
          }
        }
      }
    } catch {
      // Permission denied or other error
    }
  }

  walkDir(repoPath);

  // Map extensions to languages
  const languageMap = {
    '.js': 'JavaScript',
    '.mjs': 'JavaScript',
    '.cjs': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.py': 'Python',
    '.rb': 'Ruby',
    '.go': 'Go',
    '.rs': 'Rust',
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.swift': 'Swift',
    '.c': 'C',
    '.cpp': 'C++',
    '.cc': 'C++',
    '.h': 'C/C++ Header',
    '.cs': 'C#',
    '.php': 'PHP',
    '.html': 'HTML',
    '.htm': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'Sass',
    '.less': 'Less',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
    '.sql': 'SQL',
    '.sh': 'Shell',
    '.bash': 'Bash',
    '.zsh': 'Zsh',
    '.ps1': 'PowerShell',
    '.md': 'Markdown',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.xml': 'XML',
    '.lua': 'Lua',
    '.r': 'R',
    '.scala': 'Scala',
    '.ex': 'Elixir',
    '.exs': 'Elixir',
    '.erl': 'Erlang',
    '.clj': 'Clojure',
    '.hs': 'Haskell',
    '.elm': 'Elm',
    '.dart': 'Dart',
    '.sol': 'Solidity',
  };

  const languages = {};
  let total = 0;

  for (const [ext, count] of Object.entries(extensions)) {
    const lang = languageMap[ext];
    if (lang) {
      languages[lang] = (languages[lang] || 0) + count;
      total += count;
    }
  }

  // Calculate percentages and sort
  const sorted = Object.entries(languages)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return sorted;
}

/**
 * Analyze dependencies from package files
 */
export function analyzeDependencies(repoPath) {
  const deps = {
    npm: [],
    python: [],
    rust: [],
    go: [],
  };

  // package.json (npm)
  const packageJson = join(repoPath, 'package.json');
  if (existsSync(packageJson)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJson, 'utf-8'));
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
      deps.npm = Object.keys(allDeps);
    } catch {
      // Invalid JSON
    }
  }

  // requirements.txt (Python)
  const requirements = join(repoPath, 'requirements.txt');
  if (existsSync(requirements)) {
    try {
      const content = readFileSync(requirements, 'utf-8');
      deps.python = content
        .split('\n')
        .map((line) => line.split('==')[0].split('>=')[0].trim())
        .filter(Boolean);
    } catch {
      // Invalid file
    }
  }

  // Cargo.toml (Rust)
  const cargoToml = join(repoPath, 'Cargo.toml');
  if (existsSync(cargoToml)) {
    try {
      const content = readFileSync(cargoToml, 'utf-8');
      const depSection = content.match(/\[dependencies\]([\s\S]*?)(\[|$)/);
      if (depSection) {
        deps.rust = depSection[1]
          .split('\n')
          .map((line) => line.split('=')[0].trim())
          .filter((line) => line && !line.startsWith('#'));
      }
    } catch {
      // Invalid file
    }
  }

  // go.mod (Go)
  const goMod = join(repoPath, 'go.mod');
  if (existsSync(goMod)) {
    try {
      const content = readFileSync(goMod, 'utf-8');
      const requires = content.match(/require \(([\s\S]*?)\)/);
      if (requires) {
        deps.go = requires[1]
          .split('\n')
          .map((line) => line.trim().split(' ')[0])
          .filter(Boolean);
      }
    } catch {
      // Invalid file
    }
  }

  return deps;
}

/**
 * Detect development patterns from file structure
 */
export function analyzePatterns(repoPath) {
  const patterns = [];

  const checks = [
    { path: 'tests', pattern: 'testing' },
    { path: '__tests__', pattern: 'testing' },
    { path: 'test', pattern: 'testing' },
    { path: 'spec', pattern: 'testing' },
    { path: '.github/workflows', pattern: 'ci-cd' },
    { path: '.gitlab-ci.yml', pattern: 'ci-cd' },
    { path: 'Dockerfile', pattern: 'docker' },
    { path: 'docker-compose.yml', pattern: 'docker' },
    { path: 'kubernetes', pattern: 'kubernetes' },
    { path: 'k8s', pattern: 'kubernetes' },
    { path: 'terraform', pattern: 'infrastructure-as-code' },
    { path: '.terraform', pattern: 'infrastructure-as-code' },
    { path: 'src/components', pattern: 'component-architecture' },
    { path: 'components', pattern: 'component-architecture' },
    { path: 'src/api', pattern: 'api-development' },
    { path: 'api', pattern: 'api-development' },
    { path: 'routes', pattern: 'api-development' },
    { path: 'migrations', pattern: 'database-migrations' },
    { path: 'prisma', pattern: 'orm' },
    { path: 'models', pattern: 'mvc' },
    { path: 'controllers', pattern: 'mvc' },
    { path: 'views', pattern: 'mvc' },
    { path: 'public', pattern: 'static-assets' },
    { path: 'static', pattern: 'static-assets' },
    { path: 'assets', pattern: 'static-assets' },
    { path: 'docs', pattern: 'documentation' },
    { path: 'storybook', pattern: 'design-system' },
    { path: '.storybook', pattern: 'design-system' },
    { path: 'cypress', pattern: 'e2e-testing' },
    { path: 'e2e', pattern: 'e2e-testing' },
    { path: 'playwright', pattern: 'e2e-testing' },
    { path: 'src/hooks', pattern: 'react-hooks' },
    { path: 'hooks', pattern: 'react-hooks' },
    { path: 'src/store', pattern: 'state-management' },
    { path: 'store', pattern: 'state-management' },
    { path: 'redux', pattern: 'state-management' },
    { path: 'graphql', pattern: 'graphql' },
    { path: 'schema.graphql', pattern: 'graphql' },
    { path: 'game', pattern: 'game-development' },
    { path: 'phaser', pattern: 'game-development' },
    { path: 'unity', pattern: 'game-development' },
  ];

  for (const check of checks) {
    if (existsSync(join(repoPath, check.path))) {
      if (!patterns.includes(check.pattern)) {
        patterns.push(check.pattern);
      }
    }
  }

  // Check for specific patterns in package.json
  const packageJson = join(repoPath, 'package.json');
  if (existsSync(packageJson)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJson, 'utf-8'));
      const allDeps = Object.keys({
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      });

      const depPatterns = {
        react: 'react',
        vue: 'vue',
        angular: 'angular',
        svelte: 'svelte',
        next: 'nextjs',
        nuxt: 'nuxt',
        gatsby: 'gatsby',
        express: 'nodejs-backend',
        fastify: 'nodejs-backend',
        koa: 'nodejs-backend',
        nest: 'nestjs',
        prisma: 'orm',
        sequelize: 'orm',
        typeorm: 'orm',
        mongoose: 'mongodb',
        phaser: 'game-development',
        'pixi.js': 'game-development',
        three: '3d-graphics',
        d3: 'data-visualization',
        'chart.js': 'data-visualization',
        electron: 'desktop-app',
        'react-native': 'mobile-app',
        expo: 'mobile-app',
        jest: 'testing',
        mocha: 'testing',
        vitest: 'testing',
        webpack: 'bundling',
        vite: 'bundling',
        rollup: 'bundling',
        eslint: 'linting',
        prettier: 'code-formatting',
        typescript: 'typescript',
        tailwindcss: 'tailwind',
        'styled-components': 'css-in-js',
        emotion: 'css-in-js',
      };

      for (const dep of allDeps) {
        const baseDep = dep.replace('@', '').split('/')[0];
        if (depPatterns[baseDep] && !patterns.includes(depPatterns[baseDep])) {
          patterns.push(depPatterns[baseDep]);
        }
      }
    } catch {
      // Invalid JSON
    }
  }

  return patterns;
}

/**
 * Count files by type
 */
export function countFiles(repoPath) {
  const counts = {
    total: 0,
    code: 0,
    config: 0,
    docs: 0,
    assets: 0,
  };

  const codeExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.cs', '.php', '.vue', '.svelte'];
  const configExts = ['.json', '.yaml', '.yml', '.toml', '.xml', '.env', '.ini'];
  const docExts = ['.md', '.txt', '.rst', '.adoc'];
  const assetExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.mp3', '.mp4', '.wav', '.ogg'];

  const ignorePatterns = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'vendor', '__pycache__', 'target'];

  function walkDir(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (ignorePatterns.includes(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile()) {
          counts.total++;
          const ext = extname(entry.name).toLowerCase();

          if (codeExts.includes(ext)) counts.code++;
          else if (configExts.includes(ext)) counts.config++;
          else if (docExts.includes(ext)) counts.docs++;
          else if (assetExts.includes(ext)) counts.assets++;
        }
      }
    } catch {
      // Permission denied
    }
  }

  walkDir(repoPath);
  return counts;
}
