// PROOF OF CONCEPT — not a production system. This demonstrates the core
// mechanism: detect a locator timeout, ask an LLM to semantically resolve
// the element from an accessibility snapshot, retry once. It now includes
// a disk cache of each locator's last-known-good snapshot (so a heal is
// judged against "is this the same element as before", not just "closest
// match right now") and a confidence threshold (a low-confidence guess
// throws instead of silently clicking the wrong thing), plus a JSON audit
// log of every heal attempt. Still missing, deliberately: fallback chains
// (only one candidate is ever tried), and every self-heal attempt still
// adds real API latency (a network round trip to Anthropic) and real cost
// (billed tokens) on top of the normal Playwright action.
//
// Accessibility snapshot API: this uses locator.ariaSnapshot() (current in
// Playwright 1.62.1, the version installed here — see package.json). The
// older page.accessibility.snapshot() API has been removed entirely from
// this version, not merely deprecated: there is no `Accessibility` class
// left in playwright-core's type definitions. ariaSnapshot() returns a
// human/LLM-readable role+name tree, which maps directly onto
// page.getByRole() for the retry step below.
//
// CI: this test needs a live ANTHROPIC_API_KEY, which CI does not have. It
// is skipped rather than run against a mocked LLM response, because a
// mocked response would only prove the retry plumbing works - it would not
// prove that a real model can actually resolve a broken locator from a
// snapshot, which is the entire point of this test. Skipping is the
// honest representation of "this capability is untested in CI," not a
// workaround to fake a pass.

import { test, expect, errors, Page } from '@playwright/test';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { AdminLoginPage } from '../../pages/AdminLoginPage';
import { AdminDashboardPage } from '../../pages/AdminDashboardPage';

// The LLM's answer is only known at runtime, but Playwright's getByRole()
// takes a closed union of ARIA role strings - this narrows the JSON-parsed
// value to that union so the retry compiles without an `any` escape hatch.
type AriaRole = Parameters<Page['getByRole']>[0];

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Below this, a "heal" is a guess rather than a fix - throwing surfaces the
// broken locator as a real test failure instead of silently clicking
// whatever the model's next-best candidate was.
const CONFIDENCE_THRESHOLD = 0.7;

const SELF_HEAL_DIR = path.join(process.cwd(), 'self-heal');
const CACHE_PATH = path.join(SELF_HEAL_DIR, 'locator-cache.json');
const AUDIT_LOG_PATH = path.join(SELF_HEAL_DIR, 'audit-log.json');

const LOCATOR_SCHEMA = {
  type: 'object',
  properties: {
    role: {
      type: 'string',
      description: "ARIA role for Playwright's getByRole(), e.g. \"button\", \"link\".",
    },
    name: {
      type: 'string',
      description: "Accessible name for Playwright's getByRole(), matched against the element's visible text.",
    },
    confidence: {
      type: 'number',
      description:
        'How confident (0 = pure guess, 1 = certain) that this candidate is the SAME element the ' +
        'last-known-good snapshot described - not merely the closest textual match in the current snapshot.',
    },
    rationale: {
      type: 'string',
      description: 'Brief explanation of why this candidate is (or is not) the same element as before.',
    },
  },
  required: ['role', 'name', 'confidence', 'rationale'],
  additionalProperties: false,
};

interface HealedLocator {
  role: string;
  name: string;
  confidence: number;
  rationale: string;
}

interface CacheEntry {
  locatorString: string;
  snapshot: string;
  updatedAt: string;
}

type LocatorCache = Record<string, CacheEntry>;

interface AuditEntry {
  timestamp: string;
  testName: string;
  locatorString: string;
  elementDescription: string;
  outcome: 'healed' | 'rejected' | 'failed';
  confidence?: number;
  rationale?: string;
  healed?: { role: string; name: string };
  error?: string;
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadCache(): LocatorCache {
  return readJsonFile<LocatorCache>(CACHE_PATH, {});
}

// Looks up the last-known-good snapshot for a test's target locator. The
// cache entry is keyed by test name and records the locator string it was
// captured against; if that locator string no longer matches (the source
// was intentionally re-pointed at something else), the old snapshot isn't
// a meaningful baseline for the new locator, so the entry is invalidated
// (deleted) rather than handed to the model as ground truth.
function getCachedSnapshot(testName: string, locatorString: string): string | undefined {
  const cache = loadCache();
  const entry = cache[testName];
  if (!entry) {
    return undefined;
  }
  if (entry.locatorString !== locatorString) {
    delete cache[testName];
    writeJsonFile(CACHE_PATH, cache);
    return undefined;
  }
  return entry.snapshot;
}

function setCachedSnapshot(testName: string, locatorString: string, snapshot: string): void {
  const cache = loadCache();
  cache[testName] = { locatorString, snapshot, updatedAt: new Date().toISOString() };
  writeJsonFile(CACHE_PATH, cache);
}

function appendAuditEntry(entry: AuditEntry): void {
  const log = readJsonFile<AuditEntry[]>(AUDIT_LOG_PATH, []);
  log.push(entry);
  writeJsonFile(AUDIT_LOG_PATH, log);
}

async function healLocator(
  client: Anthropic,
  elementDescription: string,
  pageSnapshot: string,
  lastKnownGoodSnapshot: string | undefined,
): Promise<HealedLocator> {
  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: LOCATOR_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content:
          `A Playwright locator just timed out trying to find an element on a web page.\n\n` +
          `Element I'm trying to find: ${elementDescription}\n\n` +
          (lastKnownGoodSnapshot
            ? `Here is the accessibility snapshot of this exact element from the last time it was found ` +
              `successfully:\n${lastKnownGoodSnapshot}\n\n`
            : `No last-known-good snapshot is cached for this element - this may be the first run, or the ` +
              `locator's source changed since the last successful run.\n\n`) +
          `Here is the current page's full accessibility snapshot:\n${pageSnapshot}\n\n` +
          `Find the candidate in the current snapshot that is the SAME element as the one described above - ` +
          `matching role, accessible name, and surrounding context (e.g. same form, same section) - not just ` +
          `the closest textual match. Elements can move, get relabeled, or sit near similarly-named ` +
          `look-alikes; use the last-known-good snapshot (when provided) to disambiguate. Return the ARIA ` +
          `role and accessible name for page.getByRole(role, { name }) to find it, a confidence score from 0 ` +
          `(pure guess) to 1 (certain it's the same element), and a short rationale for that confidence.`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Expected a text content block with the healed locator, got none');
  }
  return JSON.parse(textBlock.text) as HealedLocator;
}

test.describe('Self-healing locator (proof of concept)', () => {
  test.skip(!ANTHROPIC_API_KEY, 'requires ANTHROPIC_API_KEY - see README');

  test('recovers from a broken locator by asking an LLM for the correct one', async (
    { page, browserName },
    testInfo,
  ) => {
    // Runs once, on chromium only - not once per browser project. Two
    // reasons: it's needless 3x API cost/latency for a POC that isn't
    // testing browser-specific rendering, and this test holds the admin
    // login form open for several seconds (the broken-locator timeout plus
    // a live LLM round trip) before submitting - long enough to collide
    // with another project's concurrent admin login on this shared demo,
    // which appears to track "who's logged in as admin" as shared mutable
    // state rather than isolated per-session state.
    test.skip(browserName !== 'chromium', 'runs once on chromium only - see comment above');

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const login = new AdminLoginPage(page);
    const dashboard = new AdminDashboardPage(page);

    await login.open();
    await login.usernameInput.fill('admin');
    await login.passwordInput.fill('password');

    const testName = testInfo.title;
    const elementDescription = 'the button that submits the admin login form (logs the user in)';
    // The source string of the locator below - used as the cache/audit key
    // alongside the test name, and to detect when the locator's source has
    // been intentionally changed (which invalidates any cached snapshot).
    const locatorString = "getByRole('button', { name: 'Log In' })";

    // Intentionally wrong: the real button's accessible name is "Login",
    // not "Log In" - simulating a selector that's gone stale after a copy
    // change.
    const brokenLoginButton = page.getByRole('button', { name: 'Log In' });

    let healed: HealedLocator | undefined;
    try {
      await brokenLoginButton.click({ timeout: 5000 });

      // Locator resolved on its own - record its snapshot as the new
      // last-known-good baseline so a future heal has ground truth to
      // compare against.
      const goodSnapshot = await brokenLoginButton.ariaSnapshot();
      setCachedSnapshot(testName, locatorString, goodSnapshot);
    } catch (error) {
      if (!(error instanceof errors.TimeoutError)) {
        throw error;
      }

      const lastKnownGoodSnapshot = getCachedSnapshot(testName, locatorString);
      const pageSnapshot = await page.locator('body').ariaSnapshot();

      try {
        healed = await healLocator(client, elementDescription, pageSnapshot, lastKnownGoodSnapshot);
      } catch (healError) {
        appendAuditEntry({
          timestamp: new Date().toISOString(),
          testName,
          locatorString,
          elementDescription,
          outcome: 'failed',
          error: healError instanceof Error ? healError.message : String(healError),
        });
        throw healError;
      }

      if (healed.confidence < CONFIDENCE_THRESHOLD) {
        appendAuditEntry({
          timestamp: new Date().toISOString(),
          testName,
          locatorString,
          elementDescription,
          outcome: 'rejected',
          confidence: healed.confidence,
          rationale: healed.rationale,
          healed: { role: healed.role, name: healed.name },
        });
        throw new Error(
          `Self-heal confidence ${healed.confidence.toFixed(2)} is below the ${CONFIDENCE_THRESHOLD} ` +
            `threshold - refusing to act on a low-confidence guess. Candidate: ${healed.role} "${healed.name}". ` +
            `Rationale: ${healed.rationale}`,
        );
      }

      const healedLocator = page.getByRole(healed.role as AriaRole, { name: healed.name });
      await healedLocator.click();

      appendAuditEntry({
        timestamp: new Date().toISOString(),
        testName,
        locatorString,
        elementDescription,
        outcome: 'healed',
        confidence: healed.confidence,
        rationale: healed.rationale,
        healed: { role: healed.role, name: healed.name },
      });

      // Heal succeeded - cache the healed element's own snapshot (not the
      // broken locator's, which never resolved) as the new last-known-good
      // baseline, still keyed under the original locator string so the
      // next run's lookup for this test/locator pair hits.
      const healedSnapshot = await healedLocator.ariaSnapshot();
      setCachedSnapshot(testName, locatorString, healedSnapshot);
    }

    expect(healed, 'expected the broken locator to time out and trigger self-healing').toBeDefined();
    await expect(page).toHaveURL(/\/admin\/rooms/);
    await expect(dashboard.roomNumberColumnHeader).toBeVisible();
  });
});
