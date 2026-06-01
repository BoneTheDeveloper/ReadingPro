import { formatError, withBenchmarkContext } from "./benchmark-utils";
import { runDictionaryFlowBenchmark } from "./dictionary-flow-benchmark";
import { runTranslateFlowBenchmark } from "./translate-flow-benchmark";

withBenchmarkContext(async (context) => {
  await runTranslateFlowBenchmark(context);
  await runDictionaryFlowBenchmark(context);
}).catch((error: unknown) => {
  console.error(formatError(error));
  process.exit(1);
});
