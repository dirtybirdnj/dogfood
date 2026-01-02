/**
 * CLI Argument Parser
 *
 * Parses command line arguments for the dogfood CLI.
 * Supports both flags and positional arguments.
 *
 * Agentic mode: Use --json flag to output JSON instead of launching TUI.
 * This allows programmatic use by AI agents and scripts.
 */

export function parseArgs(argv) {
  const args = {
    // Navigation
    screen: null,
    command: null,        // Primary command (analyze, jobs, match, generate, skills)

    // Paths
    path: process.cwd(),

    // Output modes (agentic)
    json: false,          // Output JSON instead of TUI
    save: false,          // Save results to ~/.dogfood/
    quiet: false,         // Suppress non-JSON output

    // Standard flags
    verbose: false,
    help: false,
    version: false,

    // Data operations
    ingest: null,         // File to ingest (jobs)
    export: null,         // Type to export
    list: false,          // List items

    // Generate options
    job: null,            // Job ID for generation
    type: 'both',         // resume, cover, or both
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '-v':
      case '--version':
        args.version = true;
        break;
      case '--verbose':
        args.verbose = true;
        break;
      case '-p':
      case '--path':
        args.path = argv[++i];
        break;
      case '-s':
      case '--screen':
        args.screen = argv[++i];
        break;
      case '--ingest':
        args.ingest = argv[++i];
        break;
      case '--export':
        args.export = argv[++i];
        break;
      // Agentic flags
      case '--json':
        args.json = true;
        break;
      case '--save':
        args.save = true;
        break;
      case '--quiet':
      case '-q':
        args.quiet = true;
        break;
      case '--list':
        args.list = true;
        break;
      case '--job':
        args.job = argv[++i];
        break;
      case '--type':
        args.type = argv[++i];
        break;
      default:
        // Positional argument - treat as command/subcommand
        if (!arg.startsWith('-')) {
          if (!args.command) {
            args.command = arg;
          }
          // Also set screen for TUI compatibility
          args.screen = arg;
        }
    }
  }

  return args;
}

/**
 * Check if running in agentic (non-TUI) mode
 */
export function isAgenticMode(args) {
  return args.json || args.save || args.list || args.ingest || args.job;
}

export function printHelp() {
  return `
dogfood - Eat your own dogfood

USAGE:
  dogfood [command] [options]

COMMANDS:
  (default)    Launch the TUI
  analyze      Analyze repos in current directory
  skills       View your skills profile
  jobs         Browse job listings
  match        See job matches based on your skills
  generate     Generate resume/cover letter
  settings     Configure dogfood

OPTIONS:
  -h, --help       Show this help message
  -v, --version    Show version number
  -p, --path       Path to analyze (default: current directory)
  --ingest FILE    Ingest jobs from JSON file
  --export TYPE    Export data (skills|jobs|matches)
  --verbose        Show detailed output

AGENTIC MODE (for programmatic/AI agent use):
  --json           Output JSON instead of launching TUI
  --save           Save results to ~/.dogfood/
  --list           List items (for jobs, skills commands)
  --job ID         Specify job ID (for generate command)
  --type TYPE      Output type: resume, cover, or both (default: both)
  -q, --quiet      Suppress non-JSON output

EXAMPLES - Interactive:
  dogfood                         # Launch TUI
  dogfood analyze                 # Go straight to analysis
  dogfood match                   # View job matches

EXAMPLES - Agentic (non-interactive):
  dogfood analyze --json                    # Analyze repos, output JSON
  dogfood analyze --json --save             # Analyze and save to ~/.dogfood/
  dogfood analyze --path ~/Code --json      # Analyze specific directory

  dogfood jobs --ingest jobs.json           # Import jobs from file
  dogfood jobs --list --json                # List all jobs as JSON

  dogfood skills --json                     # View skills profile as JSON

  dogfood match --json                      # Match jobs to profile, output JSON

  dogfood generate --job <id> --json        # Generate prompts for job
  dogfood generate --job <id> --type resume # Generate only resume prompt
`;
}
