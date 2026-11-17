# PawLog

**A pet health tracker for everyday care.** PawLog helps first-time cat and dog owners answer two questions: *What has happened?* and *What do I need to do next?* Owners record vet visits, vaccinations, medications and weights, and PawLog turns them into a dashboard of overdue, today and upcoming care.

CS409 (Fall 2026, UIUC) final project · Team PawLog: Nan Huang (nanh3), Xuejun Zhang (xuejunz2), Aditya Radhakrishnan (aditya63)

**Live prototype:** https://adityaradk.github.io/pawlog/ (click **Continue with demo account**)

> **This is a mock-data prototype** for the Nov 17 heuristic evaluation. There is no backend yet: auth is simulated (any email and password work) and data is stored in your browser’s `localStorage`, seeded with demo pets. Use **account menu → Reset demo data** to start over.

## Run, build, test, deploy

```bash
npm install
npm run dev          # http://localhost:5173/pawlog/
npm run build        # production build in dist/
npm run preview      # serve the build at http://localhost:4173/pawlog/

# End-to-end tests (Playwright, 1280px and 375px), screenshots go to docs/screenshots/
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium   # once
npm run build && npm run test:e2e
```

**Deploy:** every push to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to GitHub Pages (Settings → Pages → Source: GitHub Actions). `base: '/pawlog/'` in `vite.config.js` must match the repo name. Routing uses `HashRouter`, so deep links and hard refreshes work on GitHub Pages.

## Screen map

```
/#/signin, /#/signup          Sign in (with "Continue with demo account"), sign up
/#/                           Dashboard: Overdue / Today / Upcoming, per pet or all pets
/#/timeline?type=…            Health timeline with filters (All, Vet visits, Vaccinations, Weight)
/#/records/new                Add a vet visit or vaccination (+ optional follow-up reminder)
/#/records/:id[/edit]         Record detail (linked follow-up, edit, delete with confirmation)
/#/tasks/:id                  Task detail ("Created from: Vet visit, Nov 17" links back)
/#/medications[/new]          Medications, today's doses, add medication
/#/medications/:id            Dose history: given, dismissed (not given), missed
/#/weight                     Weight trend chart, kg/lb toggle, change since previous, edit/delete
/#/pets[/new]                 Pets and add-pet form
/#/settings                   Account, reset demo data, sign out
```

The pet switcher (top bar) is always visible. Desktop uses a sidebar; phones (≤860px) use a bottom navigation bar.

## Key flows

1. **Visit → follow-up:** add a record, switch on *Create a follow-up reminder*, enter the vet’s date. The confirmation names what was created and links to the task, and the task links back to its record.
2. **Medication tracking:** *Mark as given* logs a timestamped dose (with Undo). *Dismiss* only hides the reminder and is shown as “Dismissed – not recorded as given”. Logging is idempotent per dose.
3. **Weight review:** log weights with explicit units, see the latest, previous and change, a trend chart, and a table of entries.

## Code structure and the API swap

```
src/data/store.js      ← the ONLY data-access module (async functions)
src/data/seed.js       demo data, built relative to today's date
src/data/dates.js      date helpers ("4 days overdue", "In 10 days")
src/data/units.js      kg/lb conversion and sanity limits
src/state/             app context (session, selected pet, refresh) and toasts
src/components/        layout, cards, shared UI (badges, dialogs, fields)
src/pages/             one file per screen
e2e/flows.spec.js      Playwright tests for sign-in, the 3 key flows and reset
docs/                  evaluation script, feedback log, heuristics checklist, screenshots
```

Every screen calls `store.js` (`getPets`, `createHealthEvent`, `logDose`, `getWeights`, …). To connect the real Node/Express + MongoDB API, replace each function body with a `fetch`/axios call to the matching REST endpoint (e.g. `getPets` → `GET /api/pets`, `logDose` → `PUT /api/medications/:id/doses/:key`) and keep the same names and return shapes. No screen needs to change. Auth (`signIn`, `signUp`, `signOut`, `currentUser`) is in the same file.

## Evaluation docs

- [docs/eval-script.md](docs/eval-script.md): pitch, target users, evaluator tasks, moderator notes
- [docs/feedback-log.md](docs/feedback-log.md): issue log with severity scale (Round 1 and 2)
- [docs/evaluating-others.md](docs/evaluating-others.md): Nielsen’s 10 heuristics checklist for evaluating other teams

## Acknowledgments / AI use

As the course academic integrity policy requires citing all contributing sources:

- **This prototype was generated with Claude Code (Anthropic) under team direction.** The team wrote the proposal, the requirements and the prompt; Claude Code wrote the code, tests and documentation, which the team reviews and revises.
- Libraries: [React](https://react.dev), [React Router](https://reactrouter.com), [Vite](https://vite.dev), [Recharts](https://recharts.org), [Lucide icons](https://lucide.dev), [Playwright](https://playwright.dev); font [Nunito](https://fonts.google.com/specimen/Nunito) (Google Fonts).
- Heuristics: Jakob Nielsen, [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/) and the [severity ratings](https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/) scale.
- Competitor research cited in the proposal: 11pets, Digitail Pet Parent.
