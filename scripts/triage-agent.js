#!/usr/bin/env node
'use strict';

// Test-failure triage agent.
//
// Takes either a Playwright JSON reporter output file (--report) or a single
// failure's error message/stack trace typed directly on the command line
// (--error), sends the failure details to Claude, and prints a structured
// classification: is this a real regression, an environmental flake
// (timing/concurrency/network/infra, not a code defect), or a stale test
// (outdated relative to an intentional app change)?
//
// Usage:
//   node scripts/triage-agent.js --report playwright-report/results.json
//   node scripts/triage-agent.js --error "Error: expect(page).toHaveURL(...) failed ..."
//
// Reads the API key from ANTHROPIC_API_KEY, same pattern as
// tests/ui/self-healing-locator.spec.ts.

const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are a test-failure triage assistant for a Playwright test suite. Given a
test failure's error message and stack trace, classify it into exactly one of
three categories:

- "regression": the test correctly caught a real bug in the application
  under test. The failure reflects application behavior that is genuinely
  wrong relative to what the test correctly expects.
- "environmental flake": the failure is caused by timing, concurrency,
  network conditions, or infrastructure - not a defect in the code under
  test. Typical symptoms: a timeout that only appears under concurrent load,
  shared external state colliding between simultaneous runs (e.g. two test
  workers racing to log into the same shared account), transient network
  errors, or a failure that would likely not reproduce on a solo re-run with
  no code change.
- "stale test": the test itself is outdated relative to an intentional,
  deliberate change in the application (e.g. copy changed, a flow was
  redesigned, an element was intentionally renamed or removed) - the
  application is not broken, the test's expectations are.

Respond only via the provided JSON schema.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    classification: {
      type: 'string',
      enum: ['regression', 'environmental flake', 'stale test'],
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      description: 'Confidence in the classification given the information available.',
    },
    reasoning: {
      type: 'string',
      description: 'A concise explanation citing specific evidence from the failure details.',
    },
    suggested_next_step: {
      type: 'string',
      description: 'A concrete, actionable next step for a developer triaging this failure.',
    },
  },
  required: ['classification', 'confidence', 'reasoning', 'suggested_next_step'],
  additionalProperties: false,
};

function parseArgs(argv) {
  const args = { report: null, error: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--report' || arg === '-r') {
      args.report = argv[++i];
    } else if (arg === '--error' || arg === '-e') {
      args.error = argv[++i];
    }
  }
  return args;
}

// Walks the Playwright JSON reporter's suite tree (suites can nest suites)
// and collects every failed/timed-out result.
function extractFailuresFromReport(reportPath) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const failures = [];

  function errorTextFor(result) {
    const errors = result.errors && result.errors.length ? result.errors : result.error ? [result.error] : [];
    const text = errors
      .map((e) => e.message || String(e))
      .filter(Boolean)
      .join('\n\n');
    return text || '(no error message captured in report)';
  }

  function walkSuite(suite, titlePath) {
    const nextPath = titlePath.concat(suite.title ? [suite.title] : []);
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        for (const result of test.results || []) {
          if (result.status === 'failed' || result.status === 'timedOut') {
            failures.push({
              title: nextPath.concat([spec.title]).join(' › '),
              file: suite.file || spec.file,
              errorText: errorTextFor(result),
            });
          }
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
  return failures;
}

async function classifyFailure(client, failure) {
  const userContent = [
    failure.title ? `Test: ${failure.title}` : null,
    failure.file ? `File: ${failure.file}` : null,
    `Error output:\n${failure.errorText}`,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
    },
    messages: [{ role: 'user', content: userContent }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('Expected a text content block with the triage result, got none');
  }
  return JSON.parse(textBlock.text);
}

function printTriageNote(failure, result) {
  console.log('');
  console.log(`Triage: ${failure.title || '(ad-hoc failure)'}`);
  if (failure.file) {
    console.log(`  File: ${failure.file}`);
  }
  console.log(`  Classification: ${result.classification} (confidence: ${result.confidence})`);
  console.log(`  Reasoning: ${result.reasoning}`);
  console.log(`  Suggested next step: ${result.suggested_next_step}`);
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set. Export it before running this script.');
    process.exitCode = 1;
    return;
  }

  const args = parseArgs(process.argv.slice(2));
  if (!args.report && !args.error) {
    console.error(
      'Usage:\n' +
        '  node scripts/triage-agent.js --report <path-to-playwright-json-report>\n' +
        '  node scripts/triage-agent.js --error "<error message and stack trace>"',
    );
    process.exitCode = 1;
    return;
  }

  const failures = args.report
    ? extractFailuresFromReport(args.report)
    : [{ title: null, file: null, errorText: args.error }];

  if (failures.length === 0) {
    console.log('No failed or timed-out tests found in the report.');
    return;
  }

  const client = new Anthropic({ apiKey });
  for (const failure of failures) {
    const result = await classifyFailure(client, failure);
    printTriageNote(failure, result);
  }
}

main().catch((error) => {
  console.error('Triage agent failed:', error.message);
  process.exitCode = 1;
});
