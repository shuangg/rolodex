# Rolodex

A private, personal CRM you run on your own computer — a thoughtful address book for the
people in your life. It helps you keep track of who they are, when you last spoke, what's
going on with them, and when you're overdue a catch-up. No accounts, no cloud, no internet
needed — everything lives on your machine.

## Start it

```bash
npm start
```

Then open **http://localhost:5173** in your browser.

That's the only command you need. On first launch the app seeds itself with realistic
sample data (35 people and a year of history) so every screen is alive immediately. Your
data is stored locally in `data/rolodex.sqlite` — delete that file to start fresh.

## What's inside

- **Today** — the landing page: who you're due or overdue to contact (most overdue first,
  with one-click logging), birthdays and important dates in the next 30 days, reminders
  due, a feed of recent activity, and charts of your staying-in-touch.
- **People** — everyone, searchable (name, company, email, city, job title, tags) and
  filterable by circle and tag. Click through to a person's page for their details, latest
  news, facts, dates, gift list, connections and full timeline. Add, edit, delete.
- **Circles** — your people as cards in four columns (Inner → Close → Wider → Distant).
  Drag a card to another column to change their circle. The circle sets the check-in
  cadence: Inner monthly, Close quarterly, Wider six-monthly, Distant yearly.
- **Calendar** — a month grid of birthdays and important dates, navigable across years.
- **Timeline** — everything logged, across everyone, newest first, filterable by person
  and type.

### Staying in touch

*Last contacted* is never typed by hand — it's the date of the most recent interaction
you logged. A person's check-in status (in touch / due soon / overdue) is derived from
their circle's cadence; anyone can override their cadence or opt out of check-ins
entirely, and anyone can be snoozed until a date.

### Importing

Bring people in from a CSV or vCard (.vcf) file: pick the file, map the columns (CSV),
preview exactly what will be added, then import. Likely duplicates — matched by email or
exact name — are flagged for you to resolve, never silently created.

## Development

```bash
npm start          # run the app (API on :8787, web on :5173)
npm test           # run the unit tests (Vitest)
npm run typecheck  # type-check the whole codebase
```

Stack: Vite, React, TypeScript, Express, SQLite (via `node:sqlite`), TanStack Table,
dnd-kit, Recharts, react-calendar, date-fns, Papaparse, vcf. Data (photos included) lives
in the single local SQLite file under `data/`.
