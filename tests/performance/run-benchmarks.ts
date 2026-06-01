import { formatError, withBenchmarkContext } from "./benchmark-utils";
import { runDictionaryFlowBenchmark } from "./dictionary-flow-benchmark";
import { runTranslateFlowBenchmark } from "./translate-flow-benchmark";

type BenchmarkSuite = "all" | "translate" | "dictionary";

interface CliOptions {
  baseUrl?: string;
  reuseServer: boolean;
  suite: BenchmarkSuite;
}

const options = parseCliOptions(process.argv.slice(2));

withBenchmarkContext({
  baseUrl: options.baseUrl,
  reuseServer: options.reuseServer,
}, async (context) => {
  if (options.suite === "all" || options.suite === "translate") {
    await runTranslateFlowBenchmark(context);
  }
  if (options.suite === "all" || options.suite === "dictionary") {
    await runDictionaryFlowBenchmark(context);
  }
}).catch((error: unknown) => {
  console.error(formatError(error));
  process.exit(1);
});

function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    reuseServer: false,
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
  pnpm test:performance -- --reuse-server --base-url=http://127.0.0.1:3000

Options:
  --suite=all|translate|dictionary  Benchmark suite to run. Default: all.
  --reuse-server                    Reuse an existing fixture-enabled server.
  --base-url=<url>                  Existing server URL. Requires --reuse-server.
`);
}
