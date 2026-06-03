import { formatError, type BenchmarkRunOptions, withBenchmarkContext } from "./benchmark-utils";
import { runDictionaryFlowBenchmark } from "./dictionary-flow-benchmark";
import { runTranslateFlowBenchmark } from "./translate-flow-benchmark";

type BenchmarkSuite = "all" | "translate" | "dictionary";

interface CliOptions {
  baseUrl?: string;
  reuseServer: boolean;
  samples: number;
  suite: BenchmarkSuite;
}

const defaultSamples = 10;
const maxSamples = 50;

const options = parseCliOptions(process.argv.slice(2));
const runOptions: BenchmarkRunOptions = { samples: options.samples };

withBenchmarkContext({
  baseUrl: options.baseUrl,
  reuseServer: options.reuseServer,
}, async (context) => {
  if (options.suite === "all" || options.suite === "translate") {
    await runTranslateFlowBenchmark(context, runOptions);
  }
  if (options.suite === "all" || options.suite === "dictionary") {
    await runDictionaryFlowBenchmark(context, runOptions);
  }
}).catch((error: unknown) => {
  console.error(formatError(error));
  process.exit(1);
});

function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    reuseServer: false,
    samples: defaultSamples,
    suite: "all",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }
    if (arg === "--reuse-server") {
      options.reuseServer = true;
      continue;
    }
    if (arg === "--suite") {
      options.suite = parseSuite(args[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith("--suite=")) {
      options.suite = parseSuite(arg.slice("--suite=".length));
      continue;
    }
    if (arg === "--base-url") {
      options.baseUrl = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
      continue;
    }
    if (arg === "--samples") {
      options.samples = parseSamples(args[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith("--samples=")) {
      options.samples = parseSamples(arg.slice("--samples=".length));
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown benchmark option: ${arg}`);
  }

  if (options.baseUrl && !options.reuseServer) {
    throw new Error("--base-url can only be used with --reuse-server");
  }

  return options;
}

function parseSamples(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxSamples) {
    throw new Error(`Invalid --samples value: ${String(value)}. Use an integer from 1 to ${maxSamples}.`);
  }
  return parsed;
}

function parseSuite(value: string | undefined): BenchmarkSuite {
  if (value === "all" || value === "translate" || value === "dictionary") {
    return value;
  }
  throw new Error(`Invalid --suite value: ${String(value)}. Use all, translate, or dictionary.`);
}

function printHelp() {
  console.log(`
Usage:
  pnpm test:performance
  pnpm test:performance -- --suite=translate
  pnpm test:performance -- --suite=dictionary
  pnpm test:performance -- --samples=10
  pnpm test:performance -- --reuse-server --base-url=http://127.0.0.1:3000

Options:
  --suite=all|translate|dictionary  Benchmark suite to run. Default: all.
  --samples=<count>                  Samples per scenario. Default: ${defaultSamples}. Max: ${maxSamples}.
  --reuse-server                    Reuse an existing fixture-enabled server.
  --base-url=<url>                  Existing server URL. Requires --reuse-server.

Reports:
  Each run writes JSON and Markdown reports under test-results/performance/.
  Regenerate Markdown from existing JSON with pnpm test:performance:report.
`);
}
