import { readFile, writeFile } from "node:fs/promises";
import {
  benchmarkReportMarkdownPath,
  benchmarkReportTitle,
  formatError,
  renderPerformanceReportMarkdown,
  type BenchmarkReportDocument,
} from "./benchmark-utils";

const defaultReportPaths = [
  "test-results/performance/translate-flow.json",
  "test-results/performance/dictionary-flow.json",
];

renderBenchmarkReports(parseReportPaths(process.argv.slice(2))).catch((error: unknown) => {
  console.error(formatError(error));
  process.exit(1);
});

async function renderBenchmarkReports(reportPaths: string[]) {
  for (const reportPath of reportPaths) {
    const document = JSON.parse(await readFile(reportPath, "utf8")) as BenchmarkReportDocument;
    const markdownPath = benchmarkReportMarkdownPath(reportPath);
    await writeFile(
      markdownPath,
      renderPerformanceReportMarkdown({
        title: benchmarkReportTitle(reportPath),
        ...document,
      }),
    );
    console.log(`Wrote Markdown benchmark report to ${markdownPath}`);
  }
}

function parseReportPaths(args: string[]) {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const paths = args.filter((arg) => arg !== "--");
  return paths.length ? paths : defaultReportPaths;
}

function printHelp() {
  console.log(`
Usage:
  pnpm test:performance:report
  pnpm test:performance:report -- test-results/performance/translate-flow.json
  pnpm test:performance:report -- test-results/performance/translate-flow.json test-results/performance/dictionary-flow.json

Renders Markdown companions for existing JSON benchmark reports. With no paths,
the standard translate and dictionary performance reports are rendered.
`);
}
