# Attendance Planner

A small, no-login web app that answers the one question every student actually
has: **how many classes can I still miss and stay above my attendance target?**

Enter, per subject, how many classes were held, how many you attended, and your
weekly timetable. For each subject you instantly see three numbers:

- **Classes left** — sessions still to be held before the semester ends
- **Can miss** — how many of those you can skip and still hit your target
- **Must attend** — how many you *must* show up to (0 if you're safe)

Plus an overall banner combining every subject, and a per-subject list of the
exact upcoming dates you can't afford to miss.

Everything is stored locally in your browser (`localStorage`) — no accounts, no
server, nothing leaves your machine.

## The attendance math

The rules were fixed deliberately so the numbers are never misleading:

- **Delivered** = total classes conducted so far. **Attended** is a subset of it.
- **DL / ML** (duty / medical leave) is **counted as present**.
- **Current %** = `(attended + dl) / delivered × 100`
- For a target `t%` over the whole semester, with `future` classes still to come:
  - `T = delivered + future` (final total)
  - `present = attended + dl`
  - `required = ceil(t/100 × T)` — classes you need present by the end
  - `mustAttend = required − present`
  - `canMiss = (present + future) − required`
- Status:
  - **Safe** — `present` already meets `required`
  - **Warning** — you must attend some of the remaining classes
  - **Impossible** — the target can't be reached even attending everything

All of this lives in [`src/lib/attendance.js`](src/lib/attendance.js) as pure,
side-effect-free functions, covered by unit tests in
[`src/lib/attendance.test.js`](src/lib/attendance.test.js). Dates are handled in
**local time** so holidays, leaves, and the weekday timetable never drift by a
day in timezones east of UTC.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build into dist/
npm run preview  # preview the production build
npm test         # run the math unit tests
```

## Tech

React 18 + Vite + Tailwind CSS. Icons are inline SVG (no icon dependency at
runtime). Tests run on Vitest.
