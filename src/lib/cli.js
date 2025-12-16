/**
 * CLI Argument Parser
 *
 * Parses command line arguments for the dogfood CLI.
 * Supports both flags and positional arguments.
 */

export function parseArgs(argv) {
  const args = {
    screen: null,
    path: process.cwd(),
    verbose: false,
    help: false,
    version: false,
    ingest: null,
    export: null,
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
      default:
        // Positional argument - treat as subcommand
        if (!arg.startsWith('-')) {
          args.screen = arg;
        }
    }
  }

  return args;
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

EXAMPLES:
  dogfood                    # Launch TUI
  dogfood analyze            # Go straight to analysis
  dogfood --ingest jobs.json # Ingest job data
  dogfood match              # View job matches
`;
}
