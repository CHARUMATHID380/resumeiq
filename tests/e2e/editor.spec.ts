import { test, expect, type Page } from "@playwright/test";

/**
 * E2E coverage for the Phase 2 AI editor:
 *   - rewrite action -> diff dialog
 *   - accept changes propagates into the editor body
 *   - reject leaves the editor body unchanged
 *   - save & re-analyze navigates to /analysis/:id
 *   - unauthenticated visit to /editor/:id bounces to /auth
 *
 * Server-fn calls (rewriteSection / saveResumeVersion / analyzeResume) are
 * intercepted via page.route() so the suite spends no AI credits and does
 * not mutate the database.
 */

const AUTH_STATUS = process.env.LOVABLE_BROWSER_AUTH_STATUS;
const STORAGE_KEY = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
const SESSION_JSON = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const TEST_RESUME_ID = process.env.RESUMEIQ_TEST_RESUME_ID;

const haveSession = AUTH_STATUS === "injected" && !!STORAGE_KEY && !!SESSION_JSON;

async function restoreSession(page: Page) {
  await page.goto("/");
  await page.evaluate(
    ([k, v]) => window.localStorage.setItem(k as string, v as string),
    [STORAGE_KEY!, SESSION_JSON!],
  );
}

/** Match any TanStack server-fn POST by the fn name in the URL or _serverFnId. */
function matchesServerFn(url: string, fnName: string) {
  return url.includes(fnName);
}

async function installServerFnMocks(page: Page, opts: {
  rewrittenText: string;
  newResumeId?: string;
  newAnalysisId?: string;
}) {
  await page.route("**/_serverFn/**", async (route) => {
    const req = route.request();
    const url = req.url();
    if (matchesServerFn(url, "rewriteSection")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result: { rewritten: opts.rewrittenText } }),
      });
    }
    if (matchesServerFn(url, "saveResumeVersion")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: { resumeId: opts.newResumeId ?? "00000000-0000-0000-0000-000000000aaa", versionNumber: 99 },
        }),
      });
    }
    if (matchesServerFn(url, "analyzeResume")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: { analysisId: opts.newAnalysisId ?? "00000000-0000-0000-0000-000000000bbb" },
        }),
      });
    }
    return route.fallback();
  });
}

test.describe("Phase 2 editor flow", () => {
  test.skip(!haveSession, "Sign in via the preview to mint a Supabase session (LOVABLE_BROWSER_AUTH_STATUS=injected)");
  test.skip(!TEST_RESUME_ID, "Set RESUMEIQ_TEST_RESUME_ID to a resume id owned by the signed-in user");

  test.beforeEach(async ({ page }) => {
    await restoreSession(page);
  });

  test("editor renders rewrite actions for parsed sections", async ({ page }) => {
    await page.goto(`/editor/${TEST_RESUME_ID}`);
    await expect(page.getByRole("heading", { name: /AI Resume Editor/i })).toBeVisible();
    // Action buttons appear per section
    await expect(page.getByRole("button", { name: /^Improve$/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Quantify$/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Tighten$/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^ATS-optimize$/ }).first()).toBeVisible();
  });

  test("Improve -> Accept replaces section text with the rewrite", async ({ page }) => {
    const REWRITTEN = "Spearheaded billing platform processing $40M ARR with 99.99% uptime.";
    await installServerFnMocks(page, { rewrittenText: REWRITTEN });

    await page.goto(`/editor/${TEST_RESUME_ID}`);
    await page.getByRole("button", { name: /^Improve$/ }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(REWRITTEN)).toBeVisible();

    await dialog.getByRole("button", { name: /Accept changes/i }).click();
    await expect(dialog).toBeHidden();

    // The accepted text should now be present in the page (in the TipTap editor body)
    await expect(page.getByText(REWRITTEN)).toBeVisible();
  });

  test("Quantify -> Reject leaves editor body unchanged", async ({ page }) => {
    const PROPOSED = "DO NOT KEEP THIS placeholder rewrite text 12345.";
    await installServerFnMocks(page, { rewrittenText: PROPOSED });

    await page.goto(`/editor/${TEST_RESUME_ID}`);
    await page.getByRole("button", { name: /^Quantify$/ }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^Reject$/ }).click();
    await expect(dialog).toBeHidden();

    // Proposed text must NOT have been written into the editor
    await expect(page.getByText(PROPOSED)).toHaveCount(0);
  });

  test("Save & re-analyze navigates to /analysis/:id", async ({ page }) => {
    const newAnalysisId = "11111111-2222-3333-4444-555555555555";
    await installServerFnMocks(page, {
      rewrittenText: "n/a",
      newAnalysisId,
    });

    await page.goto(`/editor/${TEST_RESUME_ID}`);
    await page.getByRole("button", { name: /Save & re-analyze/i }).click();

    await page.waitForURL(`**/analysis/${newAnalysisId}`, { timeout: 15_000 });
    expect(page.url()).toContain(`/analysis/${newAnalysisId}`);
  });
});

test.describe("Editor auth guard", () => {
  test("unauthenticated visit to /editor/:id redirects to /auth", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.goto(`/editor/${TEST_RESUME_ID ?? "00000000-0000-0000-0000-000000000000"}`);
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/auth/);
  });
});
