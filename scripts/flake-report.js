#!/usr/bin/env node
'use strict';

// Summarizes flaky tests from a Playwright JSON reporter report and writes a
// markdown table to $GITHUB_STEP_SUMMARY (falls back to stdout locally).
//
// Schema (confirmed from an actual `--reporter=json` run, not assumed):
//   report.stats.{expected,unexpected,skipped,flaky} - run-level counts.
//   report.suites[].suites[].specs[].tests[].status - per-test outcome,
//   already computed by Playwright as one of "expected"/"unexpected"/
//   "flaky"/"skipped". No need to derive flakiness by diffing results[].
//
// Usage:
//   node scripts/flake-report.js --report playwright-report/results.json

const fs = require('fs');

function parseArgs(argv) {
  const args = { report: 'playwright-report/results.json' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--report' || arg === '-r') {
      args.report = argv[++i];
    }
  }
  return args;
}

// Walks the Playwright JSON reporter's suite tree (suites can nest suites)
// and collects every test whose already-computed status is "flaky".
function extractFlakyTests(report) {
  const flaky = [];

  function walkSuite(suite, titlePath) {
    const nextPath = titlePath.concat(suite.title ? [suite.title] : []);
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        if (test.status === 'flaky') {
          flaky.push({
            title: nextPath.concat([spec.title]).join(' › '),
            file: suite.file || spec.file,
            retries: (test.results || []).length - 1,
          });
        }
      }
    }
    for (const child of suite.suites || []) {
      walkSuite(child, nextPath);
    }
  }

  for (const suite of report.suites || []) {
    walkSuite(suite, []);
  }
  return flaky;
}

function buildMarkdown(report, flakyTests) {
  const stats = report.stats || {};
  const expected = stats.expected || 0;
  const unexpected = stats.unexpected || 0;
  const skipped = stats.skipped || 0;
  const flaky = stats.flaky || 0;
  const total = expected + unexpected + skipped + flaky;
  const flakeRate = total > 0 ? (flaky / total) * 100 : 0;

  const lines = [];
  lines.push('## Playwright Flake Report');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('| --- | --- |');
  lines.push(`| Total tests | ${total} |`);
  lines.push(`| Passed | ${expected} |`);
  lines.push(`| Failed | ${unexpected} |`);
  lines.push(`| Skipped | ${skipped} |`);
  lines.push(`| Flaky | ${flaky} |`);
  lines.push(`| Flake rate | ${flakeRate.toFixed(2)}% |`);
  lines.push('');

  if (flakyTests.length > 0) {
    lines.push('### Flaky tests');
    lines.push('');
    lines.push('| Test | File | Retries |');
    lines.push('| --- | --- | --- |');
    for (const test of flakyTests) {
      lines.push(`| ${test.title} | ${test.file} | ${test.retries} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.report)) {
    console.error(`Report file not found: ${args.report}`);
    console.error('Usage: node scripts/flake-report.js --report <path-to-playwright-json-report>');
    process.exitCode = 1;
    return;
  }

  const report = JSON.parse(fs.readFileSync(args.report, 'utf-8'));
  const flakyTests = extractFlakyTests(report);
  const markdown = buildMarkdown(report, flakyTests);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    fs.appendFileSync(summaryPath, markdown + '\n');
  }
  console.log(markdown);
}

main();
