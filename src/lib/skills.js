/**
 * Skills Extraction and Profiling
 *
 * Converts repository analysis into a unified skills profile.
 * Maps technologies to skill categories and calculates proficiency levels.
 */

// Framework to category mapping
const FRAMEWORK_CATEGORIES = {
  // Frontend
  react: { category: 'frontend', name: 'React', weight: 1.5 },
  vue: { category: 'frontend', name: 'Vue.js', weight: 1.3 },
  angular: { category: 'frontend', name: 'Angular', weight: 1.3 },
  svelte: { category: 'frontend', name: 'Svelte', weight: 1.2 },
  nextjs: { category: 'frontend', name: 'Next.js', weight: 1.4 },
  nuxt: { category: 'frontend', name: 'Nuxt.js', weight: 1.3 },
  gatsby: { category: 'frontend', name: 'Gatsby', weight: 1.2 },

  // Backend
  'nodejs-backend': { category: 'backend', name: 'Node.js Backend', weight: 1.4 },
  nestjs: { category: 'backend', name: 'NestJS', weight: 1.3 },
  express: { category: 'backend', name: 'Express.js', weight: 1.2 },
  fastify: { category: 'backend', name: 'Fastify', weight: 1.2 },

  // Database
  mongodb: { category: 'database', name: 'MongoDB', weight: 1.2 },
  orm: { category: 'database', name: 'ORM (Prisma/TypeORM)', weight: 1.3 },

  // DevOps
  docker: { category: 'devops', name: 'Docker', weight: 1.4 },
  kubernetes: { category: 'devops', name: 'Kubernetes', weight: 1.5 },
  'ci-cd': { category: 'devops', name: 'CI/CD', weight: 1.3 },
  'infrastructure-as-code': { category: 'devops', name: 'Infrastructure as Code', weight: 1.4 },

  // Testing
  testing: { category: 'quality', name: 'Testing', weight: 1.2 },
  'e2e-testing': { category: 'quality', name: 'E2E Testing', weight: 1.3 },

  // Specialty
  'game-development': { category: 'specialty', name: 'Game Development', weight: 1.5 },
  '3d-graphics': { category: 'specialty', name: '3D Graphics', weight: 1.4 },
  'data-visualization': { category: 'specialty', name: 'Data Visualization', weight: 1.3 },
  'desktop-app': { category: 'specialty', name: 'Desktop Apps (Electron)', weight: 1.3 },
  'mobile-app': { category: 'specialty', name: 'Mobile Development', weight: 1.4 },
  graphql: { category: 'api', name: 'GraphQL', weight: 1.3 },

  // Architecture
  'component-architecture': { category: 'architecture', name: 'Component Architecture', weight: 1.1 },
  'api-development': { category: 'architecture', name: 'API Development', weight: 1.3 },
  mvc: { category: 'architecture', name: 'MVC Pattern', weight: 1.1 },
  'state-management': { category: 'architecture', name: 'State Management', weight: 1.2 },
  'react-hooks': { category: 'architecture', name: 'React Hooks', weight: 1.1 },

  // Styling
  tailwind: { category: 'styling', name: 'Tailwind CSS', weight: 1.2 },
  'css-in-js': { category: 'styling', name: 'CSS-in-JS', weight: 1.1 },

  // Tooling
  typescript: { category: 'tooling', name: 'TypeScript', weight: 1.4 },
  bundling: { category: 'tooling', name: 'Build Tools', weight: 1.1 },
  linting: { category: 'tooling', name: 'Code Quality', weight: 1.0 },
};

// Language to skill mapping
const LANGUAGE_SKILLS = {
  JavaScript: { level: 'language', aliases: ['js', 'node', 'nodejs'] },
  'JavaScript (React)': { level: 'language', parent: 'JavaScript' },
  TypeScript: { level: 'language', aliases: ['ts'] },
  'TypeScript (React)': { level: 'language', parent: 'TypeScript' },
  Python: { level: 'language', aliases: ['py', 'python3'] },
  Go: { level: 'language', aliases: ['golang'] },
  Rust: { level: 'language', aliases: ['rs'] },
  Java: { level: 'language' },
  'C#': { level: 'language', aliases: ['csharp', 'dotnet'] },
  C: { level: 'language' },
  'C++': { level: 'language', aliases: ['cpp'] },
  Ruby: { level: 'language', aliases: ['rb'] },
  PHP: { level: 'language' },
  Swift: { level: 'language' },
  Kotlin: { level: 'language' },
  Scala: { level: 'language' },
  Elixir: { level: 'language' },
  Haskell: { level: 'language' },
  Lua: { level: 'language' },
  SQL: { level: 'language' },
  Shell: { level: 'language', aliases: ['bash', 'sh'] },
  HTML: { level: 'markup' },
  CSS: { level: 'styling' },
  SCSS: { level: 'styling', parent: 'CSS' },
  Sass: { level: 'styling', parent: 'CSS' },
  Vue: { level: 'framework' },
  Svelte: { level: 'framework' },
};

/**
 * Build a skills profile from analyzed repositories
 */
export function buildSkillsProfile(analyzedRepos) {
  const profile = {
    languages: {},
    frameworks: {},
    tools: {},
    patterns: [],
    domains: [],
    summary: {
      totalRepos: analyzedRepos.length,
      totalCommits: 0,
      yearsActive: 0,
      topLanguages: [],
      topFrameworks: [],
    },
  };

  // Aggregate data from all repos
  const languageCounts = {};
  const frameworkCounts = {};
  const patternCounts = {};
  const toolCounts = {};
  let earliestCommit = new Date();
  let latestCommit = new Date(0);

  for (const repo of analyzedRepos) {
    if (repo.excluded) continue;

    // Track commit history span
    if (repo.git?.firstCommit) {
      const first = new Date(repo.git.firstCommit);
      if (first < earliestCommit) earliestCommit = first;
    }
    if (repo.git?.lastCommit) {
      const last = new Date(repo.git.lastCommit);
      if (last > latestCommit) latestCommit = last;
    }

    profile.summary.totalCommits += repo.git?.commitCount || 0;

    // Aggregate languages
    for (const lang of repo.languages || []) {
      if (!languageCounts[lang.name]) {
        languageCounts[lang.name] = { count: 0, repos: 0 };
      }
      languageCounts[lang.name].count += lang.count;
      languageCounts[lang.name].repos++;
    }

    // Aggregate patterns/frameworks
    for (const pattern of repo.patterns || []) {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;

      // Map to frameworks
      const frameworkInfo = FRAMEWORK_CATEGORIES[pattern];
      if (frameworkInfo) {
        if (!frameworkCounts[pattern]) {
          frameworkCounts[pattern] = { ...frameworkInfo, repos: 0 };
        }
        frameworkCounts[pattern].repos++;
      }
    }

    // Aggregate dependencies as tools
    for (const [ecosystem, deps] of Object.entries(repo.dependencies || {})) {
      for (const dep of deps) {
        if (!toolCounts[dep]) {
          toolCounts[dep] = { name: dep, ecosystem, repos: 0 };
        }
        toolCounts[dep].repos++;
      }
    }
  }

  // Calculate years active
  profile.summary.yearsActive = Math.max(
    1,
    Math.round((latestCommit - earliestCommit) / (1000 * 60 * 60 * 24 * 365))
  );

  // Process languages into skills
  for (const [name, data] of Object.entries(languageCounts)) {
    const langInfo = LANGUAGE_SKILLS[name] || { level: 'language' };
    const proficiency = calculateProficiency(data.repos, analyzedRepos.length);

    profile.languages[name] = {
      fileCount: data.count,
      repoCount: data.repos,
      proficiency,
      ...langInfo,
    };
  }

  // Sort and get top languages
  profile.summary.topLanguages = Object.entries(profile.languages)
    .filter(([_, data]) => data.level === 'language')
    .sort((a, b) => b[1].repoCount - a[1].repoCount)
    .slice(0, 5)
    .map(([name, data]) => ({ name, ...data }));

  // Process frameworks
  for (const [key, data] of Object.entries(frameworkCounts)) {
    profile.frameworks[data.name] = {
      key,
      category: data.category,
      repoCount: data.repos,
      proficiency: calculateProficiency(data.repos, analyzedRepos.length, data.weight),
    };
  }

  // Sort and get top frameworks
  profile.summary.topFrameworks = Object.entries(profile.frameworks)
    .sort((a, b) => b[1].repoCount - a[1].repoCount)
    .slice(0, 5)
    .map(([name, data]) => ({ name, ...data }));

  // Process tools (filter to meaningful ones)
  const significantTools = Object.entries(toolCounts)
    .filter(([_, data]) => data.repos >= 2)
    .sort((a, b) => b[1].repos - a[1].repos)
    .slice(0, 20);

  for (const [name, data] of significantTools) {
    profile.tools[name] = {
      ecosystem: data.ecosystem,
      repoCount: data.repos,
    };
  }

  // Deduplicate and categorize patterns
  const uniquePatterns = [...new Set(Object.keys(patternCounts))];
  profile.patterns = uniquePatterns;

  // Derive domains from patterns
  profile.domains = deriveDomains(uniquePatterns, profile.frameworks);

  return profile;
}

/**
 * Calculate proficiency level based on usage
 */
function calculateProficiency(repoCount, totalRepos, weight = 1) {
  const ratio = (repoCount / totalRepos) * weight;

  if (ratio >= 0.5) return 'expert';
  if (ratio >= 0.3) return 'advanced';
  if (ratio >= 0.15) return 'intermediate';
  return 'familiar';
}

/**
 * Derive domain expertise from patterns and frameworks
 */
function deriveDomains(patterns, frameworks) {
  const domains = new Set();

  const patternToDomain = {
    'game-development': 'Game Development',
    '3d-graphics': '3D Graphics & Visualization',
    'data-visualization': 'Data Visualization',
    'mobile-app': 'Mobile Development',
    'desktop-app': 'Desktop Applications',
    'api-development': 'API & Backend Services',
    kubernetes: 'Cloud Infrastructure',
    docker: 'DevOps',
    'ci-cd': 'DevOps',
    'infrastructure-as-code': 'Cloud Infrastructure',
    testing: 'Quality Assurance',
    'e2e-testing': 'Quality Assurance',
  };

  for (const pattern of patterns) {
    if (patternToDomain[pattern]) {
      domains.add(patternToDomain[pattern]);
    }
  }

  // Add domains from frameworks
  const frameworkToDomain = {
    frontend: 'Frontend Development',
    backend: 'Backend Development',
    database: 'Database & Data',
    devops: 'DevOps',
    specialty: 'Specialized Development',
  };

  for (const framework of Object.values(frameworks)) {
    if (frameworkToDomain[framework.category]) {
      domains.add(frameworkToDomain[framework.category]);
    }
  }

  return [...domains];
}

/**
 * Extract skills that match job requirements
 */
export function matchSkillsToJob(profile, job) {
  const matched = [];
  const missing = [];
  const bonus = [];

  const jobSkills = (job.skills || []).map((s) => s.toLowerCase());
  const jobDescription = (job.description || '').toLowerCase();

  // Check languages
  for (const [name, data] of Object.entries(profile.languages)) {
    const nameLower = name.toLowerCase();
    const aliases = LANGUAGE_SKILLS[name]?.aliases || [];
    const allNames = [nameLower, ...aliases];

    const inSkills = allNames.some((n) => jobSkills.includes(n));
    const inDesc = allNames.some((n) => jobDescription.includes(n));

    if (inSkills) {
      matched.push({ name, type: 'language', proficiency: data.proficiency });
    } else if (inDesc) {
      bonus.push({ name, type: 'language', proficiency: data.proficiency });
    }
  }

  // Check frameworks
  for (const [name, data] of Object.entries(profile.frameworks)) {
    const nameLower = name.toLowerCase();

    if (jobSkills.includes(nameLower) || jobDescription.includes(nameLower)) {
      matched.push({ name, type: 'framework', proficiency: data.proficiency });
    }
  }

  // Identify missing required skills
  for (const skill of jobSkills) {
    const hasSkill = matched.some((m) => m.name.toLowerCase() === skill);
    if (!hasSkill) {
      missing.push(skill);
    }
  }

  // Calculate match score
  const requiredCount = jobSkills.length || 1;
  const matchedCount = matched.length;
  const score = Math.round((matchedCount / requiredCount) * 100);

  return {
    score,
    matched,
    missing,
    bonus,
  };
}

/**
 * Format skills profile for display
 */
export function formatSkillsForDisplay(profile) {
  const sections = [];

  // Languages
  if (Object.keys(profile.languages).length > 0) {
    const langs = Object.entries(profile.languages)
      .filter(([_, d]) => d.level === 'language')
      .sort((a, b) => b[1].repoCount - a[1].repoCount)
      .map(([name, data]) => `${name} (${data.proficiency})`);

    sections.push({
      title: 'Languages',
      items: langs,
    });
  }

  // Frameworks
  if (Object.keys(profile.frameworks).length > 0) {
    const frameworks = Object.entries(profile.frameworks)
      .sort((a, b) => b[1].repoCount - a[1].repoCount)
      .map(([name, data]) => `${name} (${data.proficiency})`);

    sections.push({
      title: 'Frameworks & Libraries',
      items: frameworks,
    });
  }

  // Domains
  if (profile.domains.length > 0) {
    sections.push({
      title: 'Domain Expertise',
      items: profile.domains,
    });
  }

  return sections;
}

/**
 * Generate a skills summary for prompts
 */
export function generateSkillsSummary(profile) {
  const lines = [];

  lines.push(`## Skills Profile`);
  lines.push(``);
  lines.push(`**Experience:** ${profile.summary.yearsActive} years across ${profile.summary.totalRepos} projects`);
  lines.push(`**Total Commits:** ${profile.summary.totalCommits}`);
  lines.push(``);

  lines.push(`### Primary Languages`);
  for (const lang of profile.summary.topLanguages) {
    lines.push(`- ${lang.name}: ${lang.proficiency} (${lang.repoCount} projects)`);
  }
  lines.push(``);

  lines.push(`### Frameworks & Technologies`);
  for (const fw of profile.summary.topFrameworks) {
    lines.push(`- ${fw.name}: ${fw.proficiency}`);
  }
  lines.push(``);

  if (profile.domains.length > 0) {
    lines.push(`### Domain Expertise`);
    for (const domain of profile.domains) {
      lines.push(`- ${domain}`);
    }
    lines.push(``);
  }

  return lines.join('\n');
}
