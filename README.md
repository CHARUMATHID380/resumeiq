# ResumeIQ

[![License: MIT](https://img.shields.io/badge/License-MIT-6366F1.svg)](https://opensource.org/licenses/MIT)

> AI-powered resume analyzer that scores your resume against ATS systems, matches it to job descriptions, and recommends roles and courses to close the gap.

## ✨ Features

- **ATS Scoring** — Instant 0–100 score with a 9-section breakdown (contact, summary, experience, skills, education, certifications, keywords, formatting, grammar)
- **Keyword Analysis** — See which domain keywords you have and which you're missing
- **Job Role Matching** — Top roles ranked by fit, with skill gaps and salary ranges
- **Course Recommendations** — Curated upskilling picks from Coursera, Udemy, edX, and more
- **AI Rewriter** — Section-by-section rewrite with accept/reject diffs, powered by a TipTap editor
- **Google OAuth** — One-click sign-in, sessions that persist across restarts
- **Version History** — Save every revision and re-analyze on demand
- **Try Without Signing In** — Public `/try` route for a one-off analysis, no account required

## 🧱 Tech Stack

- **Runtime / Build**: Bun, Vite 7
- **Framework**: TanStack Start (React 19, file-based routing, server functions)
- **Styling**: Tailwind CSS v4, custom "Midnight Pro" design system, Sora + Inter typography
- **UI**: shadcn/ui, lucide-react icons, Framer Motion, TipTap rich-text editor
- **Backend**: Supabase (Postgres, Auth, Storage, Row-Level Security)
- **AI**: Google Gemini via Vercel AI SDK
- **Testing**: Vitest (unit), Playwright (E2E)

## 🚀 Run Locally

```bash
# 1. Install dependencies
bun install         # or: npm install

# 2. Configure environment variables
cp .env.example .env    # then fill in your values

# 3. Start the dev server
bun run dev         # or: npm run dev
```

App runs at [http://localhost:8080](http://localhost:8080).

### Required environment variables

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_SUPABASE_PROJECT_ID=your-supabase-project-id

SUPABASE_URL=your-supabase-project-url
SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
AI_GATEWAY_KEY=your-ai-gateway-api-key
```

> No secrets are hardcoded anywhere in the source. Everything is read from `.env` or your hosting provider's secret manager.

## 🧪 Tests

```bash
bunx vitest run           # unit tests
bunx playwright test      # end-to-end (requires dev server)
```

## 📸 Screenshots

| Landing | Analysis | Editor |
| :-----: | :------: | :----: |
| _coming soon_ | _coming soon_ | _coming soon_ |

## 📄 License

MIT © ResumeIQ
