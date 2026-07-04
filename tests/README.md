# ResumeIQ tests

Two layers:

- `tests/unit/` — Vitest unit tests for the pure helpers used by the AI editor
  (section parser, text/HTML round-trip, diff utilities). Run with
  `bunx vitest run`.
- `tests/e2e/` — Playwright end-to-end tests for the Phase 2 editor flow.
  The dev server must be running at `http://localhost:8080`. Run with
  `bunx playwright test`.

## E2E auth

The Playwright suite restores a Supabase session into `localStorage` using
the same env vars the Lovable sandbox exposes:

- `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY`
- `LOVABLE_BROWSER_SUPABASE_SESSION_JSON`
- `LOVABLE_BROWSER_AUTH_STATUS` (must be `injected`)

If `LOVABLE_BROWSER_AUTH_STATUS` is anything else, the e2e tests are
skipped at runtime so they don't false-fail. Sign into the preview in
Lovable, then re-run the suite — the next process invocation will receive
a fresh session.

You also need a resume row in the database the signed-in user owns. The
test reads its id from `RESUMEIQ_TEST_RESUME_ID`. If unset, the suite
skips the flow tests (the no-auth navigation test still runs).

## What the e2e suite covers (Phase 2)

1. **Editor loads** for a known resume id and renders at least one
   section block with rewrite actions.
2. **Rewrite + accept** — clicks Improve, intercepts the
   `rewriteSection` server fn with a mocked rewrite, opens the diff,
   clicks "Accept changes", confirms the editor body now contains the
   new text.
3. **Rewrite + reject** — clicks Quantify, rejects the diff, confirms
   the editor body is unchanged.
4. **Save & re-analyze** — intercepts `saveResumeVersion` and
   `analyzeResume`, clicks the button, asserts the app navigates to
   `/analysis/<mocked id>`.
5. **Unauthenticated guard** — visiting `/editor/<id>` without a
   session redirects to `/auth`.

Server-function calls are intercepted with `page.route()`, so the suite
never spends AI credits or mutates the database.
