# Rolodex

A private, local-first personal CRM — an address book that reminds you to stay in touch.

## Getting started

Requires Node.js 20+ (uses the built-in `node:sqlite`).

```bash
npm install
npm start
```

Then open **http://localhost:5173** in your browser. On first run the app builds
itself and seeds a realistic sample dataset, so every screen is alive immediately.
Everything — people, photos, notes, reminders — is stored locally in a SQLite
database in `data/`, no accounts or internet required.

### Other commands

- `npm run dev` — development mode with hot reload (Vite on 5173, API on 5174).
- `npm test` — run the unit test suite.
- `npm run reset` — wipe the local database and start fresh.

## Usage

- **Today** — who to contact, upcoming dates, reminders, recent activity and charts.
- **People** — searchable, filterable address book; add, edit, delete and import (CSV/vCard).
- **Circles** — drag people between Inner / Close / Wider / Distant to set check-in cadence.
- **Calendar** — birthdays and important dates on a month grid.
- **Timeline** — everything that's happened, across everyone, newest first.

---

To run this from VS Code:

1. Ctrl+Shift+P (PC) or Cmd+Shift+P (Mac) then "Dev Containers: Reopen in Container"
2. When it completes building, launch OpenCode with `opencode`
3. Run `connect` and connect to your provider of choice; as of now, if you want to use GLM 5.3 you'll need a Coder account [here](https://z.ai/subscribe#code-plans-container)
4. Then paste in your API key, choose a model
5. Enter this instruction: "Please build the entire project and only stop when all success criteria are met"