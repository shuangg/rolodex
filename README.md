# Rolodex — Personal CRM

Rolodex is a private, thoughtful personal CRM you run on your own machine. It helps you keep track of your friends, family, and colleagues: who they are, when you last spoke, what's going on in their lives, and when you are overdue for a catch-up.

---

## 🚀 Quick Start (Single Command)

To run Rolodex locally:

```bash
npm start
```

Then open your browser to:
**http://localhost:4420** (or `http://<dev-container-host>:4420`)

For development with hot module reloading (HMR):

```bash
npm run dev
```

To run all unit and integration tests:

```bash
npm test
```

---

## ✨ Features & Sections

1. **Today (Landing Page)**:
   - **Who Needs Your Attention**: Prioritized queue of due and overdue contacts, most overdue first. Includes a 1-click touchpoint logger.
   - **Important Dates**: Birthdays and anniversaries coming up in the next 30 days, highlighting milestone birthdays (turns 30, 40, 50, etc.).
   - **Reminders & Tasks**: Due and overdue reminders with 1-click completion checkboxes.
   - **Touchpoints per Month Chart**: Visual history of logged interactions over the past 6 months.
   - **Circle Health Chart**: Stacked comparison of on-track vs. overdue relationships across circles.
   - **Recent Activity Feed**: Real-time chronological activity stream across all contacts.

2. **People**:
   - Comprehensive contact directory with photo avatars and initials fallback.
   - Real-time search by name, company, email, city, job title, and tags.
   - Filter by Circle (Inner, Close, Wider, Distant) and text tags.
   - Add, edit, and delete contacts with full contact information, timezone, notes, and photos.
   - **CSV & vCard (.vcf) Importer**: File upload with automated column mapping, preview table, and duplicate detection/resolution.

3. **Circles**:
   - Kanban visual board with 4 columns: **Inner (30d)**, **Close (90d)**, **Wider (180d)**, **Distant (365d)**.
   - Drag-and-drop cards between columns to seamlessly update check-in cadence.
   - Live header count badges and overdue indicators.

4. **Calendar**:
   - Month grid view for birthdays, anniversaries, and key recurring dates.
   - Smooth navigation across months and year boundaries.
   - Safe leap-day handling (February 29 birthdays mapped gracefully in non-leap years).
   - Click any date card to open the person's profile directly.

5. **Timeline**:
   - Global network activity stream (interactions, life updates, completed tasks) ordered newest first.
   - Filterable by individual contact and activity type.

6. **Person Detail Page**:
   - Header with photo, contact info, live local timezone clock, cadence settings, snooze dates, and check-in status badge.
   - Latest news highlight banner.
   - Approaching date and surfaced gift ideas banner (within 30 days).
   - Segmented sections for Activity Timeline, Facts Worth Remembering, Important Dates, Reminders, Gift Lists (ideas/given/received), and Bidirectional Connections.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, @dnd-kit
- **Backend & Storage**: Node.js, Express, better-sqlite3 (SQLite WAL mode with cascading foreign keys)
- **Testing & QA**: Vitest, agent-browser (Chromium end-to-end automation)
